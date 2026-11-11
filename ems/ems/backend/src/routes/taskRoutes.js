import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listTasks, createTask, updateTask, deleteTask, listMyTasks, updateMyTaskStatus,
} from '../controllers/taskController.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';
import { protect, attachEmployee } from '../middleware/authMiddleware.js';
import { adminOnly, employeeOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

const idParam = param('id').isMongoId().withMessage('Invalid task id');

const startOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const rules = (isCreate) => {
  const f = (name) => (isCreate ? body(name) : body(name).optional());
  return [
    f('title').isString().trim().isLength({ min: 3, max: 150 }).withMessage('Title must be 3-150 characters'),
    body('description').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('priority').optional().isIn(TASK_PRIORITIES).withMessage('Invalid priority'),
    isCreate
      ? f('deadline').isISO8601().withMessage('A valid deadline is required')
          .custom((v) => new Date(v) >= startOfTodayUTC()).withMessage('Deadline cannot be in the past')
      : f('deadline').isISO8601().withMessage('Invalid deadline'),
    f('assignedTo').isArray({ min: 1, max: 200 }).withMessage('Assign the task to at least one employee'),
    body('assignedTo.*').isMongoId().withMessage('Invalid employee selected'),
  ];
};

// Employee routes. "/my" must be declared before "/:id".
router.get('/my', employeeOnly, attachEmployee, listMyTasks);
router.patch(
  '/:id/status', employeeOnly, attachEmployee, idParam,
  body('status').isIn(TASK_STATUSES).withMessage('Invalid status'),
  validate, updateMyTaskStatus
);

// Admin routes.
router.get('/', adminOnly, listTasks);
router.post('/', adminOnly, rules(true), validate, createTask);
router.put('/:id', adminOnly, idParam, rules(false), validate, updateTask);
router.delete('/:id', adminOnly, idParam, validate, deleteTask);

export default router;

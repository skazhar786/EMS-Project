import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment,
} from '../controllers/departmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const idParam = param('id').isMongoId().withMessage('Invalid department id');

const fields = (isCreate) => [
  (isCreate ? body('name') : body('name').optional())
    .isString().trim().isLength({ min: 2, max: 80 }).withMessage('Department name must be 2-80 characters'),
  body('description').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  // An empty string means "no manager".
  body('manager').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid manager'),
];

// Any logged-in user may read departments (employees see their own department name).
router.get('/', protect, listDepartments);
router.get('/:id', protect, adminOnly, idParam, validate, getDepartment);

router.post('/', protect, adminOnly, fields(true), validate, createDepartment);
router.put('/:id', protect, adminOnly, idParam, fields(false), validate, updateDepartment);
router.delete('/:id', protect, adminOnly, idParam, validate, deleteDepartment);

export default router;

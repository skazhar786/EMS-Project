import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  applyLeave, listMyLeaves, getMyBalance, withdrawLeave, listLeaves, getEmployeeLeaves,
  approveLeave, rejectLeave, setBalance,
} from '../controllers/leaveController.js';
import { LEAVE_TYPES } from '../models/Leave.js';
import { isValidDateKey } from '../services/attendanceService.js';
import { protect, attachEmployee } from '../middleware/authMiddleware.js';
import { adminOnly, employeeOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

const idParam = param('id').isMongoId().withMessage('Invalid leave id');
const dateRule = (name, label) =>
  body(name).custom(isValidDateKey).withMessage(`${label} must be a valid date (YYYY-MM-DD)`);
const balanceRule = (name) =>
  body(name).optional({ values: 'falsy' }).isFloat({ min: 0, max: 365 }).withMessage(`${name} must be between 0 and 365`);

// Employee (identity from the token; never from the request body)
router.post(
  '/', employeeOnly, attachEmployee,
  [
    body('type').isIn(LEAVE_TYPES).withMessage('Invalid leave type'),
    dateRule('startDate', 'Start date'),
    dateRule('endDate', 'End date'),
    body('reason').isString().trim().isLength({ min: 5, max: 500 }).withMessage('Reason must be 5-500 characters'),
  ],
  validate, applyLeave
);
router.get('/my', employeeOnly, attachEmployee, listMyLeaves);
router.get('/balance', employeeOnly, attachEmployee, getMyBalance);
router.delete('/:id', employeeOnly, attachEmployee, idParam, validate, withdrawLeave);

// Admin
router.get('/', adminOnly, listLeaves);
router.get('/employee/:id', adminOnly, param('id').isMongoId().withMessage('Invalid employee id'), validate, getEmployeeLeaves);
router.put(
  '/balance/:employeeId', adminOnly,
  [param('employeeId').isMongoId().withMessage('Invalid employee id'), balanceRule('casual'), balanceRule('sick'), balanceRule('earned')],
  validate, setBalance
);
router.patch(
  '/:id/approve', adminOnly, idParam,
  body('remarks').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters'),
  validate, approveLeave
);
router.patch(
  '/:id/reject', adminOnly, idParam,
  body('remarks').isString().trim().isLength({ min: 3, max: 500 }).withMessage('Please give a reason for rejecting (3-500 characters)'),
  validate, rejectLeave
);

export default router;

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getDefaults, listStructures, getStructure, saveStructure, generatePayroll, listPayments, exportPayments,
  updatePayment, updatePaymentStatus, deletePayment, getMyStructure, listMyPayments,
} from '../controllers/payrollController.js';
import { PAYMENT_STATUSES } from '../models/SalaryPayment.js';
import { protect, attachEmployee } from '../middleware/authMiddleware.js';
import { adminOnly, employeeOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

const blank = { values: 'falsy' };
const FIELDS = {
  hra: 'HRA', medicalAllowance: 'Medical allowance', travelAllowance: 'Travel allowance', otherAllowances: 'Other allowances',
  pfDeduction: 'Provident fund', taxDeduction: 'Tax', otherDeductions: 'Other deductions',
};
const amountRules = [
  body('basic').isFloat({ min: 0.01, max: 100000000 }).withMessage('Basic salary must be greater than 0'),
  ...Object.entries(FIELDS).map(([name, label]) =>
    body(name).optional(blank).isFloat({ min: 0, max: 100000000 }).withMessage(`${label} must be a non-negative amount`)),
];
const idParam = param('id').isMongoId().withMessage('Invalid payslip id');
const employeeParam = param('employeeId').isMongoId().withMessage('Invalid employee id');

// Employee: own data only (identity from the token)
router.get('/my/structure', employeeOnly, attachEmployee, getMyStructure);
router.get('/my', employeeOnly, attachEmployee, listMyPayments);

// Admin
router.get('/defaults', adminOnly, getDefaults);
router.get('/structures', adminOnly, listStructures);
router.get('/structures/:employeeId', adminOnly, employeeParam, validate, getStructure);
router.put('/structures/:employeeId', adminOnly, employeeParam, amountRules, validate, saveStructure);

router.post(
  '/generate', adminOnly,
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
    body('department').optional(blank).isMongoId().withMessage('Invalid department'),
  ],
  validate, generatePayroll
);
router.get('/payments', adminOnly, listPayments);
router.get('/export', adminOnly, exportPayments);
router.put(
  '/payments/:id', adminOnly, idParam, amountRules,
  body('remarks').optional(blank).isString().trim().isLength({ max: 300 }).withMessage('Remarks cannot exceed 300 characters'),
  validate, updatePayment
);
router.patch(
  '/payments/:id/status', adminOnly, idParam,
  body('status').isIn(PAYMENT_STATUSES).withMessage('Status must be Pending or Paid'),
  validate, updatePaymentStatus
);
router.delete('/payments/:id', adminOnly, idParam, validate, deletePayment);

export default router;

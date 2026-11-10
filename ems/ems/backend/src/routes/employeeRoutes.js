import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listEmployees, listDesignations, listEmployeeOptions, getEmployee,
  createEmployee, updateEmployee, updateEmployeeStatus, deleteEmployee,
  uploadEmployeeAvatar, removeEmployeeAvatar,
} from '../controllers/employeeController.js';
import { EMPLOYEE_STATUS, EMPLOYMENT_TYPES, GENDERS } from '../models/Employee.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = Router();

// Every employee-management route is admin-only.
router.use(protect, adminOnly);

const idParam = param('id').isMongoId().withMessage('Invalid employee id');
const blank = { values: 'falsy' };

const passwordRules = (chain) =>
  chain
    .isString().withMessage('Password is required')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/[0-9]/).withMessage('Password must contain a number');

const rules = (isCreate) => {
  const f = (name) => (isCreate ? body(name) : body(name).optional());
  return [
    f('fullName').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
    f('email').isString().trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
    passwordRules(isCreate ? body('password').exists().withMessage('Password is required') : body('password').optional(blank)),
    body('phone').optional(blank).matches(/^[0-9+\-\s()]{7,15}$/).withMessage('Enter a valid phone number'),
    body('gender').optional(blank).isIn(GENDERS).withMessage('Invalid gender'),
    body('dateOfBirth').optional(blank).isISO8601().withMessage('Invalid date of birth')
      .custom((v) => new Date(v) < new Date()).withMessage('Date of birth must be in the past'),
    body('joiningDate').optional(blank).isISO8601().withMessage('Invalid joining date'),
    body('department').optional(blank).isMongoId().withMessage('Invalid department'),
    body('designation').optional(blank).isString().trim().isLength({ max: 100 }).withMessage('Designation is too long'),
    body('address').optional(blank).isString().trim().isLength({ max: 300 }).withMessage('Address cannot exceed 300 characters'),
    body('employmentType').optional(blank).isIn(EMPLOYMENT_TYPES).withMessage('Invalid employment type'),
    body('status').optional(blank).isIn(EMPLOYEE_STATUS).withMessage('Invalid status'),
    body('basicSalary').optional(blank).isFloat({ min: 0 }).withMessage('Basic salary must be a positive number'),
  ];
};

// Fixed paths must be declared before "/:id".
router.get('/designations', listDesignations);
router.get('/options', listEmployeeOptions);

router.get('/', listEmployees);
router.post('/', rules(true), validate, createEmployee);
router.get('/:id', idParam, validate, getEmployee);
router.put('/:id', idParam, rules(false), validate, updateEmployee);
router.patch(
  '/:id/status', idParam,
  body('status').isIn(EMPLOYEE_STATUS).withMessage('Status must be Active or Inactive'),
  validate, updateEmployeeStatus
);
router.put('/:id/avatar', idParam, validate, uploadAvatar, uploadEmployeeAvatar);
router.delete('/:id/avatar', idParam, validate, removeEmployeeAvatar);
router.delete('/:id', idParam, validate, deleteEmployee);

export default router;

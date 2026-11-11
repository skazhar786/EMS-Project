import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  checkIn, checkOut, getToday, getMyAttendance, getDailyOverview, getEmployeeAttendance,
  getReport, exportReport, markManually, deleteRecord,
} from '../controllers/attendanceController.js';
import { ATTENDANCE_STATUSES } from '../models/Attendance.js';
import { protect, attachEmployee } from '../middleware/authMiddleware.js';
import { adminOnly, employeeOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

const time = /^([01]\d|2[0-3]):[0-5]\d$/;
const blank = { values: 'falsy' };

// Employee: identity always comes from the token (attachEmployee), never from the request.
router.post('/check-in', employeeOnly, attachEmployee, checkIn);
router.post('/check-out', employeeOnly, attachEmployee, checkOut);
router.get('/today', employeeOnly, attachEmployee, getToday);
router.get('/my', employeeOnly, attachEmployee, getMyAttendance);

// Admin
router.get('/', adminOnly, getDailyOverview);
router.get('/report', adminOnly, getReport);
router.get('/export', adminOnly, exportReport);
router.get('/employee/:id', adminOnly, param('id').isMongoId().withMessage('Invalid employee id'), validate, getEmployeeAttendance);
router.put(
  '/manual', adminOnly,
  [
    body('employee').isMongoId().withMessage('Invalid employee'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
    body('status').isIn(ATTENDANCE_STATUSES).withMessage('Invalid status'),
    body('checkInTime').optional(blank).matches(time).withMessage('Check-in time must be HH:mm'),
    body('checkOutTime').optional(blank).matches(time).withMessage('Check-out time must be HH:mm'),
  ],
  validate, markManually
);
router.delete('/:id', adminOnly, param('id').isMongoId().withMessage('Invalid record id'), validate, deleteRecord);

export default router;

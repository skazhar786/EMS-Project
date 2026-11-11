import { Router } from 'express';
import { getAdminDashboard, getActivityLog, getEmployeeDashboard } from '../controllers/dashboardController.js';
import { protect, attachEmployee } from '../middleware/authMiddleware.js';
import { adminOnly, employeeOnly } from '../middleware/roleMiddleware.js';

const router = Router();
router.use(protect);

router.get('/admin', adminOnly, getAdminDashboard);
router.get('/activity', adminOnly, getActivityLog);
router.get('/employee', employeeOnly, attachEmployee, getEmployeeDashboard);

export default router;

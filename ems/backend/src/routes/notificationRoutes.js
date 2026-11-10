import { Router } from 'express';
import { param } from 'express-validator';
import {
  listNotifications, getUnreadCount, markRead, markAllRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect); // any logged-in user, but only ever their own notifications

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead); // before "/:id/read"
router.patch('/:id/read', param('id').isMongoId().withMessage('Invalid notification id'), validate, markRead);

export default router;

import { Router } from 'express';
import { body, param } from 'express-validator';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect, adminOnly);

router.get('/', listAnnouncements);
router.post(
  '/',
  [
    body('title').isString().trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters'),
    body('message').isString().trim().isLength({ min: 3, max: 1000 }).withMessage('Message must be 3-1000 characters'),
    body('department').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid department'),
  ],
  validate,
  createAnnouncement
);
router.delete('/:id', param('id').isMongoId().withMessage('Invalid announcement id'), validate, deleteAnnouncement);

export default router;

import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProfile, updateProfile, uploadMyAvatar, removeMyAvatar,
} from '../controllers/profileController.js';
import { protect, attachEmployee } from '../middleware/authMiddleware.js';
import { employeeOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';
import { uploadAvatar } from '../middleware/upload.js';
import { GENDERS } from '../models/Employee.js';

const router = Router();
router.use(protect, employeeOnly, attachEmployee);

const blank = { values: 'falsy' };

router.get('/', getProfile);

router.put(
  '/',
  [
    body('phone').optional(blank).matches(/^[0-9+\-\s()]{7,15}$/).withMessage('Enter a valid phone number'),
    body('gender').optional(blank).isIn(GENDERS).withMessage('Invalid gender'),
    body('dateOfBirth').optional(blank).isISO8601().withMessage('Invalid date of birth')
      .custom((v) => new Date(v) < new Date()).withMessage('Date of birth must be in the past'),
    body('address').optional(blank).isString().trim().isLength({ max: 300 }).withMessage('Address cannot exceed 300 characters'),
  ],
  validate,
  updateProfile
);

router.put('/avatar', uploadAvatar, uploadMyAvatar);
router.delete('/avatar', removeMyAvatar);

export default router;

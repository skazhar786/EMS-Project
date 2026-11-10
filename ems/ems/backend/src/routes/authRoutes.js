import { Router } from 'express';
import { body } from 'express-validator';
import { login, getMe, logout, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const passwordRule = (field) =>
  body(field)
    .isString().withMessage('Password must be text')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/[0-9]/).withMessage('Password must contain a number');

router.post(
  '/login',
  [
    // isString() also rejects objects such as { "$gt": "" } (NoSQL injection).
    body('email').isString().trim().toLowerCase().isEmail().withMessage('Please enter a valid email address'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

router.put(
  '/change-password',
  protect,
  [body('currentPassword').isString().notEmpty().withMessage('Current password is required'), passwordRule('newPassword')],
  validate,
  changePassword
);

export default router;

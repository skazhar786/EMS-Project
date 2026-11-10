import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateToken } from '../utils/generateToken.js';

// Hash used to keep response time similar when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 12);

const getEmployeeProfile = (userId) =>
  Employee.findOne({ user: userId }).populate('department', 'name');

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw ApiError.unauthorized('Invalid email or password');
  }

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.unauthorized('Your account has been deactivated. Contact the administrator');

  let employee = null;
  if (user.role === 'EMPLOYEE') {
    employee = await getEmployeeProfile(user._id);
    if (!employee || employee.status !== 'Active') {
      throw ApiError.unauthorized('Your employee record is inactive. Contact the administrator');
    }
  }

  user.lastLogin = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    data: { token: generateToken(user._id), user, employee },
  });
});

// GET /api/auth/me  (used to restore a session on page refresh)
export const getMe = asyncHandler(async (req, res) => {
  const employee = req.user.role === 'EMPLOYEE' ? await getEmployeeProfile(req.user._id) : null;
  res.json({ success: true, data: { user: req.user, employee } });
});

// POST /api/auth/logout
// JWTs are stateless: the client deletes the token. This endpoint exists so logout
// has a single, auditable place (activity logging is added in a later phase).
export const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// PUT /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current password');
  }

  user.password = newPassword; // hashed by the pre-save hook
  await user.save();

  res.json({ success: true, message: 'Password updated successfully' });
});

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Verifies the JWT and loads the user from the database.
// After this runs, req.user is the ONLY trusted source of identity and role.
export const protect = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Authentication required. Please log in');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized('This account no longer exists');
  if (!user.isActive) throw ApiError.unauthorized('Your account has been deactivated. Contact the administrator');

  req.user = user;
  next();
});

// For EMPLOYEE routes: loads the Employee record that belongs to req.user.
// Controllers use req.employee._id, never an id sent by the client.
export const attachEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findOne({ user: req.user._id });
  if (!employee) throw ApiError.forbidden('No employee profile is linked to this account');
  if (employee.status !== 'Active') throw ApiError.forbidden('Your employee record is inactive');
  req.employee = employee;
  next();
});

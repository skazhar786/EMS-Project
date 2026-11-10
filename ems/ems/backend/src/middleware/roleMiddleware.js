import { ApiError } from '../utils/ApiError.js';

// Usage: router.get('/', protect, authorize('ADMIN'), handler)
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

export const adminOnly = authorize('ADMIN');
export const employeeOnly = authorize('EMPLOYEE');

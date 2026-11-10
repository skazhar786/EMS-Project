import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

// Place after an array of express-validator rules.
export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest(errors[0].message, errors));
};

import jwt from 'jsonwebtoken';

// Only the user id goes in the token. The role is always re-read from the
// database on every request, so role changes and deactivation apply immediately.
export const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    algorithm: 'HS256',
  });

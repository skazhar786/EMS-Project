import { asyncHandler } from '../utils/asyncHandler.js';
import { pick } from '../utils/pick.js';
import { setEmployeeAvatar, clearEmployeeAvatar } from '../utils/avatar.js';

// Employees may only change these. Name, salary, department, designation, status
// and joining date are admin-only and are never read from the request here.
const EDITABLE = ['phone', 'gender', 'dateOfBirth', 'address'];

const respond = async (res, employee, message) => {
  await employee.populate('department', 'name');
  res.json({ success: true, message, data: employee });
};

// GET /api/profile   (always the logged-in employee: identity comes from the token)
export const getProfile = asyncHandler(async (req, res) => {
  await respond(res, req.employee);
});

// PUT /api/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const data = pick(req.body, EDITABLE);

  for (const [key, value] of Object.entries(data)) {
    if (key === 'address') employee.set(key, value || '');
    else employee.set(key, value === '' || value === null ? undefined : value);
  }

  await employee.save();
  await respond(res, employee, 'Profile updated');
});

// PUT /api/profile/avatar
export const uploadMyAvatar = asyncHandler(async (req, res) => {
  await setEmployeeAvatar(req.employee, req.file);
  await respond(res, req.employee, 'Profile picture updated');
});

// DELETE /api/profile/avatar
export const removeMyAvatar = asyncHandler(async (req, res) => {
  await clearEmployeeAvatar(req.employee);
  await respond(res, req.employee, 'Profile picture removed');
});

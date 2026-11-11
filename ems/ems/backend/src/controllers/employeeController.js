import mongoose from 'mongoose';
import Employee, { EMPLOYEE_STATUS, EMPLOYMENT_TYPES } from '../models/Employee.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import SalaryStructure from '../models/SalaryStructure.js';
import SalaryPayment from '../models/SalaryPayment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { pick } from '../utils/pick.js';
import { generateEmployeeId } from '../utils/generateEmployeeId.js';
import { setEmployeeAvatar, clearEmployeeAvatar, deleteAvatarFile } from '../utils/avatar.js';
import { discardUpload } from '../middleware/upload.js';

// Fields an admin may set. Deliberately excludes: user, employeeId, leaveBalance, isSample.
const FIELDS = [
  'fullName', 'phone', 'gender', 'dateOfBirth', 'address', 'joiningDate',
  'department', 'designation', 'employmentType', 'status', 'basicSalary',
];
const SORTABLE = ['fullName', 'employeeId', 'joiningDate', 'basicSalary', 'createdAt'];

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// Converts form values ('' for empty inputs) into clean values for Mongoose.
const normalize = (body) => {
  const data = pick(body, FIELDS);
  for (const key of Object.keys(data)) {
    if (data[key] !== '' && data[key] !== null) continue;
    if (key === 'department') data[key] = null;
    else if (key === 'designation' || key === 'address') data[key] = '';
    else if (key === 'basicSalary') data[key] = 0;
    else if (key === 'joiningDate') delete data[key]; // required: keep the existing value
    else data[key] = undefined; // phone, gender, dateOfBirth: unset
  }
  if (data.basicSalary !== undefined) data.basicSalary = Number(data.basicSalary);
  return data;
};

const assertDepartmentExists = async (id) => {
  if (!id) return;
  if (!(await Department.exists({ _id: id }))) throw ApiError.badRequest('Selected department does not exist');
};

const loadEmployee = (id) =>
  Employee.findById(id)
    .populate('department', 'name')
    .populate('user', 'email isActive lastLogin');

// GET /api/employees?page&limit&search&department&designation&status&employmentType&sortBy&order
export const listEmployees = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const filter = {};

  const search = str(req.query.search);
  if (search) {
    const rx = mongoose.trusted({ $regex: escapeRegex(search), $options: 'i' });
    const matchingUsers = await User.find({ role: 'EMPLOYEE', email: rx }).select('_id').lean();
    filter.$or = [
      { fullName: rx },
      { employeeId: rx },
      { phone: rx },
      { user: mongoose.trusted({ $in: matchingUsers.map((u) => u._id) }) },
    ];
  }

  const department = str(req.query.department);
  if (department && mongoose.isValidObjectId(department)) filter.department = department;

  const designation = str(req.query.designation);
  if (designation) {
    filter.designation = mongoose.trusted({ $regex: `^${escapeRegex(designation)}$`, $options: 'i' });
  }

  const status = str(req.query.status);
  if (EMPLOYEE_STATUS.includes(status)) filter.status = status;

  const employmentType = str(req.query.employmentType);
  if (EMPLOYMENT_TYPES.includes(employmentType)) filter.employmentType = employmentType;

  const sortBy = SORTABLE.includes(str(req.query.sortBy)) ? str(req.query.sortBy) : 'createdAt';
  const order = str(req.query.order) === 'asc' ? 1 : -1;

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('department', 'name')
      .populate('user', 'email isActive')
      .sort({ [sortBy]: order, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: employees,
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// GET /api/employees/designations  (for the filter dropdown)
export const listDesignations = asyncHandler(async (req, res) => {
  const all = await Employee.distinct('designation');
  const data = all.filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.json({ success: true, data });
});

// GET /api/employees/options  (lightweight list of active employees, e.g. for manager pickers)
export const listEmployeeOptions = asyncHandler(async (req, res) => {
  const data = await Employee.find({ status: 'Active' })
    .select('employeeId fullName')
    .sort({ fullName: 1 })
    .limit(1000)
    .lean();
  res.json({ success: true, data });
});

// GET /api/employees/:id
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await loadEmployee(req.params.id);
  if (!employee) throw ApiError.notFound('Employee not found');
  res.json({ success: true, data: employee });
});

// POST /api/employees  (creates the login account and the HR profile together)
export const createEmployee = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = normalize(req.body);

  if (await User.exists({ email })) throw ApiError.conflict('A user with this email already exists');
  await assertDepartmentExists(data.department);

  const user = await User.create({
    email,
    password,
    role: 'EMPLOYEE',
    isActive: (data.status || 'Active') === 'Active',
  });

  let employee;
  try {
    employee = await Employee.create({ ...data, employeeId: await generateEmployeeId(), user: user._id });
  } catch (err) {
    await User.deleteOne({ _id: user._id }); // do not leave a login without a profile
    throw err;
  }

  await logActivity(req, { action: 'EMPLOYEE_CREATED', entityType: 'Employee', entityId: employee._id, description: `Added employee ${employee.fullName} (${employee.employeeId})` });
  res.status(201).json({
    success: true,
    message: `Employee ${employee.employeeId} created`,
    data: await loadEmployee(employee._id),
  });
});

// PUT /api/employees/:id
export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw ApiError.notFound('Employee not found');
  const user = await User.findById(employee.user);
  if (!user) throw ApiError.notFound('The login account for this employee is missing');

  const data = normalize(req.body);
  await assertDepartmentExists(data.department);

  const { email, password } = req.body;
  if (email && email !== user.email) {
    if (await User.exists({ email })) throw ApiError.conflict('A user with this email already exists');
    user.email = email;
  }
  if (password) user.password = password; // admin password reset; hashed by the pre-save hook

  for (const [key, value] of Object.entries(data)) employee.set(key, value);
  if (data.status) user.isActive = data.status === 'Active';

  await employee.save();
  await user.save();

  await logActivity(req, { action: 'EMPLOYEE_UPDATED', entityType: 'Employee', entityId: employee._id, description: `Updated employee ${employee.fullName} (${employee.employeeId})` });
  res.json({ success: true, message: 'Employee updated', data: await loadEmployee(employee._id) });
});

// PATCH /api/employees/:id/status
export const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw ApiError.notFound('Employee not found');

  employee.status = status;
  await employee.save();
  await User.updateOne({ _id: employee.user }, { isActive: status === 'Active' });

  await logActivity(req, { action: 'EMPLOYEE_STATUS', entityType: 'Employee', entityId: employee._id, description: `${status === 'Active' ? 'Activated' : 'Deactivated'} employee ${employee.fullName} (${employee.employeeId})` });
  res.json({
    success: true,
    message: `Employee ${status === 'Active' ? 'activated' : 'deactivated'}`,
    data: await loadEmployee(employee._id),
  });
});

// DELETE /api/employees/:id  (permanent; deactivating is the safer option)
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw ApiError.notFound('Employee not found');

  await Department.updateMany({ manager: employee._id }, { manager: null });
  await deleteAvatarFile(employee.profilePicture);
  await Notification.deleteMany({ recipient: employee.user });
  await Attendance.deleteMany({ employee: employee._id });
  await Leave.deleteMany({ employee: employee._id });
  await SalaryStructure.deleteMany({ employee: employee._id });
  await SalaryPayment.deleteMany({ employee: employee._id });

  // Remove the employee from their tasks, recompute task status, and drop tasks left without assignees.
  const tasks = await Task.find({ 'assignees.employee': employee._id });
  for (const task of tasks) {
    task.assignees = task.assignees.filter((a) => String(a.employee) !== String(employee._id));
    task.history = task.history.filter((h) => String(h.employee) !== String(employee._id));
    if (task.assignees.length === 0) {
      await task.deleteOne();
    } else {
      task.recomputeStatus();
      await task.save();
    }
  }

  await User.deleteOne({ _id: employee.user });
  await employee.deleteOne();

  await logActivity(req, { action: 'EMPLOYEE_DELETED', entityType: 'Employee', entityId: employee._id, description: `Deleted employee ${employee.fullName} (${employee.employeeId})` });
  res.json({ success: true, message: `Employee ${employee.employeeId} deleted` });
});

// PUT /api/employees/:id/avatar
export const uploadEmployeeAvatar = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    await discardUpload(req.file);
    throw ApiError.notFound('Employee not found');
  }
  await setEmployeeAvatar(employee, req.file);
  res.json({ success: true, message: 'Profile picture updated', data: await loadEmployee(employee._id) });
});

// DELETE /api/employees/:id/avatar
export const removeEmployeeAvatar = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw ApiError.notFound('Employee not found');
  await clearEmployeeAvatar(employee);
  res.json({ success: true, message: 'Profile picture removed', data: await loadEmployee(employee._id) });
});

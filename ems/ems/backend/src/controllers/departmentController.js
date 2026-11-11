import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const assertValidManager = async (managerId) => {
  if (!managerId) return null;
  const manager = await Employee.findById(managerId).select('_id status');
  if (!manager) throw ApiError.badRequest('Selected manager does not exist');
  if (manager.status !== 'Active') throw ApiError.badRequest('A manager must be an active employee');
  return manager._id;
};

// GET /api/departments?search=
export const listDepartments = asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const filter = search ? { name: mongoose.trusted({ $regex: escapeRegex(search), $options: 'i' }) } : {};

  const [departments, counts] = await Promise.all([
    Department.find(filter).populate('manager', 'fullName employeeId').sort({ name: 1 }).lean(),
    Employee.aggregate([
      { $match: { department: { $ne: null } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const data = departments.map((d) => ({ ...d, employeeCount: countMap.get(String(d._id)) || 0 }));

  res.json({ success: true, data });
});

// GET /api/departments/:id  (includes the department's employees)
export const getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id).populate('manager', 'fullName employeeId').lean();
  if (!department) throw ApiError.notFound('Department not found');

  const employees = await Employee.find({ department: department._id })
    .select('employeeId fullName designation status')
    .sort({ fullName: 1 })
    .lean();

  res.json({ success: true, data: { ...department, employees, employeeCount: employees.length } });
});

// POST /api/departments
export const createDepartment = asyncHandler(async (req, res) => {
  const { name, description, manager } = req.body;
  const managerId = await assertValidManager(manager);

  const department = await Department.create({ name, description, manager: managerId });
  await department.populate('manager', 'fullName employeeId');

  await logActivity(req, { action: 'DEPARTMENT_CREATED', entityType: 'Department', entityId: department._id, description: `Created department ${department.name}` });
  res.status(201).json({ success: true, message: 'Department created', data: department });
});

// PUT /api/departments/:id
export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw ApiError.notFound('Department not found');

  const { name, description, manager } = req.body;
  if (name !== undefined) department.name = name;
  if (description !== undefined) department.description = description;
  if (manager !== undefined) department.manager = await assertValidManager(manager);

  await department.save();
  await department.populate('manager', 'fullName employeeId');

  await logActivity(req, { action: 'DEPARTMENT_UPDATED', entityType: 'Department', entityId: department._id, description: `Updated department ${department.name}` });
  res.json({ success: true, message: 'Department updated', data: department });
});

// DELETE /api/departments/:id  (blocked while employees are assigned)
export const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw ApiError.notFound('Department not found');

  const count = await Employee.countDocuments({ department: department._id });
  if (count > 0) {
    throw ApiError.conflict(
      `Cannot delete "${department.name}": ${count} employee${count > 1 ? 's are' : ' is'} assigned to it. Reassign them first.`
    );
  }

  await department.deleteOne();
  await logActivity(req, { action: 'DEPARTMENT_DELETED', entityType: 'Department', entityId: department._id, description: `Deleted department ${department.name}` });
  res.json({ success: true, message: 'Department deleted' });
});

import mongoose from 'mongoose';
import Task, { TASK_STATUSES } from '../models/Task.js';
import Employee from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { notifyEmployees, notifyUsers } from '../services/notificationService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SORTABLE = ['deadline', 'createdAt', 'title'];
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const startOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// A task is overdue once its deadline DAY has fully passed and it is not finished.
const isOverdue = (deadline, done) => !done && Date.now() > new Date(deadline).getTime() + DAY_MS - 1;

const POPULATE_ADMIN = [
  { path: 'assignees.employee', select: 'fullName employeeId profilePicture status' },
  { path: 'history.employee', select: 'fullName' },
  { path: 'assignedBy', select: 'email' },
];

const toAdminShape = (task) => {
  const t = task.toObject ? task.toObject() : task;
  const done = t.assignees.filter((a) => a.status === 'Completed').length;
  return { ...t, isOverdue: isOverdue(t.deadline, t.status === 'Completed'), progress: { done, total: t.assignees.length } };
};

const toEmployeeShape = (task, employeeId) => {
  const t = task.toObject ? task.toObject() : task;
  const mine = t.assignees.find((a) => String(a.employee) === String(employeeId));
  return {
    _id: t._id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    deadline: t.deadline,
    createdAt: t.createdAt,
    myStatus: mine.status,
    myCompletedAt: mine.completedAt || null,
    isOverdue: isOverdue(t.deadline, mine.status === 'Completed'),
    coAssigneeCount: t.assignees.length - 1,
    // Employees only ever see their own history entries.
    history: t.history.filter((h) => String(h.employee) === String(employeeId)).map((h) => ({ status: h.status, at: h.at })),
  };
};

const uniqueIds = (ids) => [...new Set(ids.map(String))];

const assertActiveEmployees = async (ids) => {
  const found = await Employee.countDocuments({ _id: mongoose.trusted({ $in: ids }), status: 'Active' });
  if (found !== ids.length) throw ApiError.badRequest('One or more selected employees do not exist or are inactive');
};

// ---------------------------------------------------------------- admin

// GET /api/tasks?page&limit&search&employee&priority&status&sortBy&order
export const listTasks = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const filter = {};

  const search = str(req.query.search);
  if (search) filter.title = mongoose.trusted({ $regex: escapeRegex(search), $options: 'i' });

  const employee = str(req.query.employee);
  if (employee && mongoose.isValidObjectId(employee)) filter['assignees.employee'] = employee;

  const priority = str(req.query.priority);
  if (['Low', 'Medium', 'High', 'Urgent'].includes(priority)) filter.priority = priority;

  const status = str(req.query.status);
  if (status === 'Overdue') {
    filter.status = mongoose.trusted({ $ne: 'Completed' });
    filter.deadline = mongoose.trusted({ $lt: startOfTodayUTC() });
  } else if (TASK_STATUSES.includes(status)) {
    filter.status = status;
  }

  const sortBy = SORTABLE.includes(str(req.query.sortBy)) ? str(req.query.sortBy) : 'createdAt';
  const order = str(req.query.order) === 'asc' ? 1 : -1;

  const [tasks, total] = await Promise.all([
    Task.find(filter).populate(POPULATE_ADMIN).sort({ [sortBy]: order, _id: 1 }).skip((page - 1) * limit).limit(limit),
    Task.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: tasks.map(toAdminShape),
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// POST /api/tasks
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, deadline } = req.body;
  const ids = uniqueIds(req.body.assignedTo);
  await assertActiveEmployees(ids);

  const task = await Task.create({
    title, description, priority, deadline,
    assignees: ids.map((employee) => ({ employee })),
    assignedBy: req.user._id,
  });

  await notifyEmployees(ids, {
    type: 'TASK_ASSIGNED',
    title: 'New task assigned',
    message: `"${task.title}" (${task.priority} priority) is due on ${new Date(task.deadline).toLocaleDateString('en-IN')}.`,
    link: '/employee/tasks',
  });

  await task.populate(POPULATE_ADMIN);
  res.status(201).json({ success: true, message: 'Task created and assigned', data: toAdminShape(task) });
});

// PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');

  const { title, description, priority, deadline, assignedTo } = req.body;
  const before = { deadline: String(task.deadline), priority: task.priority, title: task.title };

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (deadline !== undefined) task.deadline = deadline;

  let addedIds = [];
  if (assignedTo !== undefined) {
    const ids = uniqueIds(assignedTo);
    const currentIds = task.assignees.map((a) => String(a.employee));
    addedIds = ids.filter((id) => !currentIds.includes(id));
    if (addedIds.length) await assertActiveEmployees(addedIds);

    // Keep progress of people who stay; new people start as Pending; removed people drop off.
    task.assignees = ids.map((id) => task.assignees.find((a) => String(a.employee) === id) || { employee: id });
    task.history = task.history.filter((h) => ids.includes(String(h.employee)));
  }

  task.recomputeStatus();
  await task.save();

  if (addedIds.length) {
    await notifyEmployees(addedIds, {
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      message: `"${task.title}" (${task.priority} priority) is due on ${new Date(task.deadline).toLocaleDateString('en-IN')}.`,
      link: '/employee/tasks',
    });
  }

  const changed =
    before.deadline !== String(task.deadline) || before.priority !== task.priority || before.title !== task.title;
  if (changed) {
    const retained = task.assignees.map((a) => String(a.employee)).filter((id) => !addedIds.includes(id));
    await notifyEmployees(retained, {
      type: 'TASK_UPDATED',
      title: 'Task updated',
      message: `Details of "${task.title}" were changed. Check the deadline and priority.`,
      link: '/employee/tasks',
    });
  }

  await task.populate(POPULATE_ADMIN);
  res.json({ success: true, message: 'Task updated', data: toAdminShape(task) });
});

// DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');
  await task.deleteOne();
  res.json({ success: true, message: 'Task deleted' });
});

// ------------------------------------------------------------- employee

// GET /api/tasks/my   (only tasks assigned to the logged-in employee)
export const listMyTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ 'assignees.employee': req.employee._id }).sort({ deadline: 1 }).limit(500);
  res.json({ success: true, data: tasks.map((t) => toEmployeeShape(t, req.employee._id)) });
});

// PATCH /api/tasks/:id/status   (changes ONLY the caller's own progress)
export const updateMyTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await Task.findOne({ _id: req.params.id, 'assignees.employee': req.employee._id });
  if (!task) throw ApiError.notFound('Task not found');

  const me = task.assignees.find((a) => String(a.employee) === String(req.employee._id));
  if (me.status !== status) {
    me.status = status;
    me.updatedAt = new Date();
    me.completedAt = status === 'Completed' ? new Date() : undefined;
    task.history.push({ employee: req.employee._id, status });
    task.recomputeStatus();
    await task.save();

    if (status === 'Completed') {
      await notifyUsers([task.assignedBy], {
        type: 'TASK_UPDATED',
        title: 'Task completed',
        message: `${req.employee.fullName} completed "${task.title}".`,
        link: '/admin/tasks',
      });
    }
  }

  res.json({ success: true, message: 'Task status updated', data: toEmployeeShape(task, req.employee._id) });
});

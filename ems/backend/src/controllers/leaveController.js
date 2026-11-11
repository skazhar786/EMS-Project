import mongoose from 'mongoose';
import Leave, { LEAVE_TYPES, LEAVE_STATUSES } from '../models/Leave.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { notifyUsers } from '../services/notificationService.js';
import { getConfig, dateKey, isValidDateKey, keyToDate } from '../services/attendanceService.js';
import { BALANCE_FIELD, shiftKey, countLeaveDays } from '../services/leaveService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SPAN_DAYS = 90;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const niceDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const range = (l) => (l.days === 1 || niceDate(l.startDate) === niceDate(l.endDate) ? niceDate(l.startDate) : `${niceDate(l.startDate)} to ${niceDate(l.endDate)}`);

const POPULATE_ADMIN = {
  path: 'employee',
  select: 'employeeId fullName profilePicture leaveBalance department',
  populate: { path: 'department', select: 'name' },
};

// ------------------------------------------------------------ employee

// POST /api/leaves
export const applyLeave = asyncHandler(async (req, res) => {
  const { type, startDate, endDate, reason } = req.body;
  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);

  if (endDate < startDate) throw ApiError.badRequest('End date cannot be before the start date');
  const span = Math.round((keyToDate(endDate) - keyToDate(startDate)) / DAY_MS) + 1;
  if (span > MAX_SPAN_DAYS) throw ApiError.badRequest(`A single request cannot cover more than ${MAX_SPAN_DAYS} days`);

  const earliest = type === 'Sick' ? shiftKey(todayKey, -7) : todayKey;
  if (startDate < earliest) {
    throw ApiError.badRequest(type === 'Sick' ? 'Sick leave can be back-dated by at most 7 days' : 'Leave cannot start in the past');
  }

  const days = countLeaveDays(startDate, endDate, cfg);
  if (days < 1) throw ApiError.badRequest('The selected dates fall only on weekly off days');

  // No overlap with any other Pending or Approved request of this employee.
  const overlap = await Leave.findOne({
    employee: req.employee._id,
    status: mongoose.trusted({ $in: ['Pending', 'Approved'] }),
    startDate: mongoose.trusted({ $lte: keyToDate(endDate) }),
    endDate: mongoose.trusted({ $gte: keyToDate(startDate) }),
  }).lean();
  if (overlap) {
    throw ApiError.conflict(`These dates overlap your ${overlap.status.toLowerCase()} ${overlap.type} leave (${range(overlap)})`);
  }

  const field = BALANCE_FIELD[type];
  if (field) {
    const left = req.employee.leaveBalance?.[field] ?? 0;
    if (days > left) throw ApiError.badRequest(`You only have ${left} day(s) of ${type} leave left, but requested ${days}`);
  }

  const leave = await Leave.create({
    employee: req.employee._id, type, startDate: keyToDate(startDate), endDate: keyToDate(endDate), days, reason,
  });

  const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id').lean();
  await notifyUsers(admins.map((a) => a._id), {
    type: 'LEAVE',
    title: 'New leave request',
    message: `${req.employee.fullName} requested ${days} day(s) of ${type} leave (${range(leave)}).`,
    link: '/admin/leaves',
  });

  await logActivity(req, { action: 'LEAVE_APPLIED', entityType: 'Leave', entityId: leave._id, description: `Applied for ${days} day(s) of ${type} leave` });
  res.status(201).json({ success: true, message: 'Leave request submitted', data: leave });
});

// GET /api/leaves/my?status=
export const listMyLeaves = asyncHandler(async (req, res) => {
  const filter = { employee: req.employee._id };
  const status = str(req.query.status);
  if (LEAVE_STATUSES.includes(status)) filter.status = status;
  const data = await Leave.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, data });
});

// GET /api/leaves/balance
export const getMyBalance = asyncHandler(async (req, res) => {
  const pendingRows = await Leave.aggregate([
    { $match: { employee: req.employee._id, status: 'Pending' } },
    { $group: { _id: '$type', days: { $sum: '$days' } } },
  ]);
  const pending = Object.fromEntries(pendingRows.map((r) => [r._id, r.days]));
  const { casual, sick, earned } = req.employee.leaveBalance;
  res.json({
    success: true,
    data: { balance: { casual, sick, earned }, pending, weeklyOff: getConfig().weeklyOff },
  });
});

// DELETE /api/leaves/:id   (withdraw your own PENDING request)
export const withdrawLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findOneAndDelete({ _id: req.params.id, employee: req.employee._id, status: 'Pending' });
  if (!leave) throw ApiError.notFound('Leave request not found, or it has already been reviewed');
  res.json({ success: true, message: 'Leave request withdrawn' });
});

// --------------------------------------------------------------- admin

// GET /api/leaves?status&type&department&employee&from&to&page&limit
export const listLeaves = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const filter = {};

  const status = str(req.query.status);
  if (LEAVE_STATUSES.includes(status)) filter.status = status;
  const type = str(req.query.type);
  if (LEAVE_TYPES.includes(type)) filter.type = type;

  const employee = str(req.query.employee);
  const department = str(req.query.department);
  if (employee && mongoose.isValidObjectId(employee)) {
    filter.employee = employee;
  } else if (department && mongoose.isValidObjectId(department)) {
    const ids = await Employee.find({ department }).distinct('_id');
    filter.employee = mongoose.trusted({ $in: ids });
  }

  // Leaves that overlap the [from, to] window.
  const from = str(req.query.from);
  const to = str(req.query.to);
  if (isValidDateKey(from)) filter.endDate = mongoose.trusted({ $gte: keyToDate(from) });
  if (isValidDateKey(to)) filter.startDate = mongoose.trusted({ $lte: keyToDate(to) });

  const [data, total, pendingTotal] = await Promise.all([
    Leave.find(filter).populate(POPULATE_ADMIN).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Leave.countDocuments(filter),
    Leave.countDocuments({ status: 'Pending' }),
  ]);

  res.json({
    success: true,
    data,
    pendingTotal,
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// GET /api/leaves/employee/:id   (one employee's balance and full history)
export const getEmployeeLeaves = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).select('employeeId fullName leaveBalance').lean();
  if (!employee) throw ApiError.notFound('Employee not found');
  const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, data: { employee, leaves } });
});

// PATCH /api/leaves/:id/approve
export const approveLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw ApiError.notFound('Leave request not found');
  if (leave.status !== 'Pending') throw ApiError.conflict(`This request was already ${leave.status.toLowerCase()}`);

  // Step 1: atomically claim the request, so two admins cannot approve it twice.
  const approved = await Leave.findOneAndUpdate(
    { _id: leave._id, status: 'Pending' },
    { status: 'Approved', reviewedBy: req.user._id, reviewedAt: new Date(), remarks: req.body.remarks || '' },
    { new: true }
  );
  if (!approved) throw ApiError.conflict('This request was just reviewed by someone else');

  // Step 2: only APPROVED leave touches the balance. The condition prevents going below zero.
  const field = BALANCE_FIELD[leave.type];
  if (field) {
    const path = `leaveBalance.${field}`;
    const updated = await Employee.findOneAndUpdate(
      { _id: leave.employee, [path]: mongoose.trusted({ $gte: leave.days }) },
      { $inc: { [path]: -leave.days } },
      { new: true }
    );
    if (!updated) {
      // Not enough balance (e.g. another request was approved first): undo the approval.
      await Leave.updateOne({ _id: leave._id }, { status: 'Pending', $unset: { reviewedBy: 1, reviewedAt: 1, remarks: 1 } });
      const employee = await Employee.findById(leave.employee).select('fullName leaveBalance').lean();
      throw ApiError.badRequest(
        `${employee?.fullName || 'The employee'} has only ${employee?.leaveBalance?.[field] ?? 0} day(s) of ${leave.type} leave left, but this request needs ${leave.days}`
      );
    }
  }

  const employee = await Employee.findById(leave.employee).select('user fullName').lean();
  await logActivity(req, { action: 'LEAVE_APPROVED', entityType: 'Leave', entityId: leave._id, description: `Approved ${leave.days} day(s) of ${leave.type} leave for ${employee?.fullName || 'an employee'}` });
  await notifyUsers([employee?.user], {
    type: 'LEAVE',
    title: 'Leave approved',
    message: `Your ${leave.type} leave (${range(leave)}) was approved.${req.body.remarks ? ` Note: ${req.body.remarks}` : ''}`,
    link: '/employee/leaves',
  });

  res.json({ success: true, message: 'Leave approved', data: approved });
});

// PATCH /api/leaves/:id/reject   (remarks required)
export const rejectLeave = asyncHandler(async (req, res) => {
  const rejected = await Leave.findOneAndUpdate(
    { _id: req.params.id, status: 'Pending' },
    { status: 'Rejected', reviewedBy: req.user._id, reviewedAt: new Date(), remarks: req.body.remarks },
    { new: true }
  );
  if (!rejected) {
    const exists = await Leave.exists({ _id: req.params.id });
    throw exists ? ApiError.conflict('This request was already reviewed') : ApiError.notFound('Leave request not found');
  }

  const employee = await Employee.findById(rejected.employee).select('user fullName').lean();
  await logActivity(req, { action: 'LEAVE_REJECTED', entityType: 'Leave', entityId: rejected._id, description: `Rejected ${rejected.type} leave of ${employee?.fullName || 'an employee'}` });
  await notifyUsers([employee?.user], {
    type: 'LEAVE',
    title: 'Leave rejected',
    message: `Your ${rejected.type} leave (${range(rejected)}) was rejected. Reason: ${rejected.remarks}`,
    link: '/employee/leaves',
  });

  res.json({ success: true, message: 'Leave rejected', data: rejected });
});

// PUT /api/leaves/balance/:employeeId   (casual, sick, earned: remaining days)
export const setBalance = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.employeeId);
  if (!employee) throw ApiError.notFound('Employee not found');

  ['casual', 'sick', 'earned'].forEach((f) => {
    if (req.body[f] !== undefined && req.body[f] !== '') employee.leaveBalance[f] = Number(req.body[f]);
  });
  await employee.save();

  res.json({ success: true, message: 'Leave balance updated', data: employee.leaveBalance });
});

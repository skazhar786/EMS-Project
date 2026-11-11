import mongoose from 'mongoose';
import Attendance, { ATTENDANCE_STATUSES } from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toCsv } from '../utils/csv.js';
import {
  getConfig, publicRules, dateKey, isValidDateKey, keyToDate, dateToKey, zonedToUtc, checkInStatus,
  computeHours, toClientRecord, monthRange, parseMonthYear, buildMonth, monthKeys,
} from '../services/attendanceService.js';
import { getLeaveKeysByEmployee } from '../services/leaveService.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthRecords = (employeeIds, year, month) => {
  const { start, end } = monthRange(year, month);
  return Attendance.find({
    employee: mongoose.trusted({ $in: employeeIds }),
    date: mongoose.trusted({ $gte: start, $lt: end }),
  }).lean();
};

const employeeFilter = (query) => {
  const filter = { status: 'Active' };
  const department = str(query.department);
  if (department && mongoose.isValidObjectId(department)) filter.department = department;
  const search = str(query.search);
  if (search) {
    const rx = mongoose.trusted({ $regex: escapeRegex(search), $options: 'i' });
    filter.$or = [{ fullName: rx }, { employeeId: rx }];
  }
  return filter;
};

// ------------------------------------------------------------ employee

// POST /api/attendance/check-in
export const checkIn = asyncHandler(async (req, res) => {
  const cfg = getConfig();
  const now = new Date();
  const todayKey = dateKey(now, cfg.timeZone);

  try {
    const record = await Attendance.create({
      employee: req.employee._id,
      date: keyToDate(todayKey),
      checkIn: now,
      status: checkInStatus(now, cfg),
    });
    res.status(201).json({
      success: true,
      message: record.status === 'Late' ? 'Checked in (marked late)' : 'Checked in successfully',
      data: toClientRecord(record, cfg),
    });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('You have already checked in today');
    throw err;
  }
});

// POST /api/attendance/check-out
export const checkOut = asyncHandler(async (req, res) => {
  const cfg = getConfig();
  const now = new Date();
  const date = keyToDate(dateKey(now, cfg.timeZone));

  const record = await Attendance.findOne({ employee: req.employee._id, date });
  if (!record || !record.checkIn) throw ApiError.badRequest('You have not checked in today');
  if (record.checkOut) throw ApiError.conflict('You have already checked out today');

  const hours = computeHours(record.checkIn, now);
  // The "checkOut: null" condition makes this atomic: two simultaneous requests cannot both succeed.
  const updated = await Attendance.findOneAndUpdate(
    { _id: record._id, checkOut: null },
    { checkOut: now, workHours: hours, status: hours < cfg.halfDayHours ? 'Half-day' : record.status },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('You have already checked out today');

  res.json({ success: true, message: 'Checked out successfully', data: toClientRecord(updated, cfg) });
});

// GET /api/attendance/today
export const getToday = asyncHandler(async (req, res) => {
  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);
  const record = await Attendance.findOne({ employee: req.employee._id, date: keyToDate(todayKey) }).lean();
  res.json({
    success: true,
    data: { date: todayKey, record: record ? toClientRecord(record, cfg) : null, rules: publicRules(cfg) },
  });
});

// GET /api/attendance/my?month=&year=
export const getMyAttendance = asyncHandler(async (req, res) => {
  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);
  const { month, year } = parseMonthYear(req.query, todayKey);
  const records = await monthRecords([req.employee._id], year, month);
  const { startKey, endKey } = monthKeys(year, month);
  const leaveMap = await getLeaveKeysByEmployee([req.employee._id], startKey, endKey);
  const { days, summary } = buildMonth({
    year, month, records, joiningKey: dateToKey(req.employee.joiningDate), todayKey, cfg,
    leaveKeys: leaveMap.get(String(req.employee._id)),
  });
  res.json({ success: true, data: { month, year, days, summary, rules: publicRules(cfg) } });
});

// --------------------------------------------------------------- admin

// GET /api/attendance?date=&department=&search=&status=&page=&limit=
export const getDailyOverview = asyncHandler(async (req, res) => {
  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);
  const key = isValidDateKey(str(req.query.date)) ? str(req.query.date) : todayKey;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);

  const employees = await Employee.find(employeeFilter(req.query))
    .select('employeeId fullName department profilePicture joiningDate')
    .populate('department', 'name')
    .sort({ fullName: 1 })
    .limit(1000)
    .lean();

  const records = await Attendance.find({
    date: keyToDate(key),
    employee: mongoose.trusted({ $in: employees.map((e) => e._id) }),
  }).lean();
  const byEmployee = new Map(records.map((r) => [String(r.employee), r]));
  const leaveMap = await getLeaveKeysByEmployee(employees.map((e) => e._id), key, key);

  const isOff = cfg.weeklyOff.includes(new Date(`${key}T00:00:00Z`).getUTCDay());
  let rows = employees
    .filter((e) => dateToKey(e.joiningDate) <= key) // not yet joined on that date
    .map((e) => {
      const rec = byEmployee.get(String(e._id));
      let status;
      if (rec) status = rec.status;
      else if (isOff) status = 'Weekly off';
      else if (leaveMap.get(String(e._id))?.has(key)) status = 'On leave';
      else if (key < todayKey) status = 'Absent';
      else status = key === todayKey ? 'Not checked in' : 'Upcoming';
      return {
        employee: { _id: e._id, employeeId: e.employeeId, fullName: e.fullName, profilePicture: e.profilePicture, department: e.department },
        date: key,
        status,
        recordId: rec?._id || null,
        checkInTime: rec ? toClientRecord(rec, cfg).checkInTime : null,
        checkOutTime: rec ? toClientRecord(rec, cfg).checkOutTime : null,
        workHours: rec?.workHours || 0,
        edited: !!rec?.editedBy,
      };
    });

  const counts = { total: rows.length, present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0, notCheckedIn: 0 };
  rows.forEach((r) => {
    if (r.status === 'Present') counts.present += 1;
    if (r.status === 'Late') counts.late += 1;
    if (r.status === 'Half-day') counts.halfDay += 1;
    if (r.status === 'Absent') counts.absent += 1;
    if (r.status === 'On leave') counts.onLeave += 1;
    if (r.status === 'Not checked in') counts.notCheckedIn += 1;
  });

  const statusFilter = str(req.query.status);
  if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);

  const total = rows.length;
  res.json({
    success: true,
    data: {
      date: key, isToday: key === todayKey, isWeeklyOff: isOff, counts,
      rows: rows.slice((page - 1) * limit, page * limit),
      rules: publicRules(cfg),
    },
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// GET /api/attendance/employee/:id?month=&year=
export const getEmployeeAttendance = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).select('employeeId fullName joiningDate').lean();
  if (!employee) throw ApiError.notFound('Employee not found');

  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);
  const { month, year } = parseMonthYear(req.query, todayKey);
  const records = await monthRecords([employee._id], year, month);
  const { startKey, endKey } = monthKeys(year, month);
  const leaveMap = await getLeaveKeysByEmployee([employee._id], startKey, endKey);
  const { days, summary } = buildMonth({
    year, month, records, joiningKey: dateToKey(employee.joiningDate), todayKey, cfg,
    leaveKeys: leaveMap.get(String(employee._id)),
  });

  res.json({ success: true, data: { employee, month, year, days, summary, rules: publicRules(cfg) } });
});

// Shared by the JSON report and the CSV export.
const buildReport = async (query) => {
  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);
  const { month, year } = parseMonthYear(query, todayKey);

  const employees = await Employee.find(employeeFilter(query))
    .select('employeeId fullName department joiningDate')
    .populate('department', 'name')
    .sort({ fullName: 1 })
    .limit(1000)
    .lean();

  const records = await monthRecords(employees.map((e) => e._id), year, month);
  const { startKey, endKey } = monthKeys(year, month);
  const leaveMap = await getLeaveKeysByEmployee(employees.map((e) => e._id), startKey, endKey);
  const grouped = new Map();
  records.forEach((r) => {
    const k = String(r.employee);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(r);
  });

  const rows = employees.map((e) => {
    const { summary } = buildMonth({
      year, month, records: grouped.get(String(e._id)) || [], joiningKey: dateToKey(e.joiningDate), todayKey, cfg,
      leaveKeys: leaveMap.get(String(e._id)),
    });
    return {
      employee: { _id: e._id, employeeId: e.employeeId, fullName: e.fullName, department: e.department },
      ...summary,
    };
  });

  return { month, year, rows };
};

// GET /api/attendance/report?month=&year=&department=&search=
export const getReport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await buildReport(req.query) });
});

// GET /api/attendance/export?month=&year=&department=&search=
export const exportReport = asyncHandler(async (req, res) => {
  const { month, year, rows } = await buildReport(req.query);
  const csv = toCsv(
    ['Employee ID', 'Name', 'Department', 'Working days', 'Present days', 'Late arrivals', 'Half days', 'Absent days', 'Leave days', 'Total hours'],
    rows.map((r) => [
      r.employee.employeeId, r.employee.fullName, r.employee.department?.name || '',
      r.workingDays, r.present, r.late, r.halfDay, r.absent, r.leave, r.totalHours,
    ])
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${year}-${String(month).padStart(2, '0')}.csv"`);
  res.send(`\uFEFF${csv}`); // BOM so Excel reads UTF-8 names correctly
});

// PUT /api/attendance/manual   (administrator creates or corrects one day for one employee)
export const markManually = asyncHandler(async (req, res) => {
  const { employee: employeeId, date, status, checkInTime, checkOutTime } = req.body;
  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);

  if (date > todayKey) throw ApiError.badRequest('Attendance cannot be marked for a future date');
  const employee = await Employee.findById(employeeId).select('fullName joiningDate');
  if (!employee) throw ApiError.notFound('Employee not found');
  if (date < dateToKey(employee.joiningDate)) throw ApiError.badRequest('That date is before the employee joined');

  let checkIn;
  let checkOut;
  let workHours = 0;
  if (status !== 'Absent') {
    if (!checkInTime) throw ApiError.badRequest('Check-in time is required for this status');
    checkIn = zonedToUtc(date, checkInTime, cfg.timeZone);
    if (checkOutTime) {
      checkOut = zonedToUtc(date, checkOutTime, cfg.timeZone);
      if (checkOut <= checkIn) throw ApiError.badRequest('Check-out time must be after check-in time');
      workHours = computeHours(checkIn, checkOut);
    }
  }

  const record =
    (await Attendance.findOne({ employee: employee._id, date: keyToDate(date) })) ||
    new Attendance({ employee: employee._id, date: keyToDate(date) });
  record.status = status;
  record.checkIn = checkIn;
  record.checkOut = checkOut;
  record.workHours = workHours;
  record.editedBy = req.user._id;
  await record.save();

  await logActivity(req, { action: 'ATTENDANCE_MARKED', entityType: 'Attendance', entityId: record._id, description: `Marked ${employee.fullName} as ${status} for ${date}` });
  res.json({ success: true, message: 'Attendance saved', data: toClientRecord(record, cfg) });
});

// DELETE /api/attendance/:id
export const deleteRecord = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) throw ApiError.notFound('Attendance record not found');
  await record.deleteOne();
  await logActivity(req, { action: 'ATTENDANCE_REMOVED', entityType: 'Attendance', entityId: record._id, description: `Removed an attendance record for ${dateToKey(record.date)}` });
  res.json({ success: true, message: 'Attendance record removed' });
});

export { ATTENDANCE_STATUSES, MONTHS };

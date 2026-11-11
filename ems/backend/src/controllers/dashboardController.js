import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import SalaryPayment from '../models/SalaryPayment.js';
import SalaryStructure from '../models/SalaryStructure.js';
import Notification from '../models/Notification.js';
import ActivityLog, { ENTITY_TYPES } from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateTotals } from '../services/payrollService.js';
import {
  getConfig, dateKey, keyToDate, dateToKey, weekdayOf, toClientRecord, buildMonth, monthRange, monthKeys, publicRules,
} from '../services/attendanceService.js';
import { getLeaveKeysByEmployee } from '../services/leaveService.js';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round2 = (n) => Math.round((n || 0) * 100) / 100;
const ts = mongoose.trusted;

// The last `n` calendar months ending with the current one (oldest first).
const lastMonths = (n, nowKey) => {
  let [y, m] = nowKey.split('-').map(Number);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.unshift({ year: y, month: m, label: `${MONTH_SHORT[m - 1]} ${String(y).slice(2)}` });
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return out;
};

// ------------------------------------------------------------------ admin

// GET /api/dashboard/admin   (every number comes from the database)
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);
  const today = keyToDate(todayKey);
  const isWeeklyOff = cfg.weeklyOff.includes(weekdayOf(todayKey));
  const [nowYear, nowMonth] = todayKey.split('-').map(Number);

  const months6 = lastMonths(6, todayKey);
  const months12 = lastMonths(12, todayKey);
  const attendanceStart = new Date(Date.UTC(months6[0].year, months6[0].month - 1, 1));
  const joiningStart = new Date(Date.UTC(months12[0].year, months12[0].month - 1, 1));

  const notDone = ts({ $ne: 'Completed' });
  const [
    totalEmployees, activeEmployees, totalDepartments, expectedToday, presentToday, onLeaveIds, pendingLeaves,
    totalTasks, completedTasks, overdueTasks, pendingTasksActive, inProgressTasksActive,
    deptRows, departments, attendanceRows, salaryRows, joiningRows, currentPayroll,
    recentEmployees, recentTasks, recentLeaves, recentApproved, recentPaid,
  ] = await Promise.all([
    Employee.countDocuments({}),
    Employee.countDocuments({ status: 'Active' }),
    Department.countDocuments({}),
    Employee.countDocuments({ status: 'Active', joiningDate: ts({ $lte: today }) }),
    Attendance.countDocuments({ date: today, status: ts({ $in: ['Present', 'Late', 'Half-day'] }) }),
    Leave.find({ status: 'Approved', startDate: ts({ $lte: today }), endDate: ts({ $gte: today }) }).distinct('employee'),
    Leave.countDocuments({ status: 'Pending' }),

    Task.countDocuments({}),
    Task.countDocuments({ status: 'Completed' }),
    Task.countDocuments({ status: notDone, deadline: ts({ $lt: today }) }),
    Task.countDocuments({ status: 'Pending', deadline: ts({ $gte: today }) }),
    Task.countDocuments({ status: 'In Progress', deadline: ts({ $gte: today }) }),

    Employee.aggregate([{ $match: { status: 'Active' } }, { $group: { _id: '$department', count: { $sum: 1 } } }]),
    Department.find({}).select('name').lean(),
    Attendance.aggregate([
      { $match: { date: { $gte: attendanceStart } } },
      { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' }, s: '$status' }, count: { $sum: 1 } } },
    ]),
    SalaryPayment.aggregate([
      { $match: { year: { $gte: months6[0].year } } },
      {
        $group: {
          _id: { y: '$year', m: '$month' },
          net: { $sum: '$net' },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$net', 0] } },
        },
      },
    ]),
    Employee.aggregate([
      { $match: { joiningDate: { $gte: joiningStart } } },
      { $group: { _id: { y: { $year: '$joiningDate' }, m: { $month: '$joiningDate' } }, count: { $sum: 1 } } },
    ]),
    SalaryPayment.aggregate([
      { $match: { year: nowYear, month: nowMonth } },
      {
        $group: {
          _id: null, count: { $sum: 1 }, net: { $sum: '$net' },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$net', 0] } },
        },
      },
    ]),

    Employee.find({}).sort({ createdAt: -1 }).limit(5).select('employeeId fullName designation profilePicture createdAt department').populate('department', 'name').lean(),
    Task.find({}).sort({ createdAt: -1 }).limit(5).select('title priority deadline createdAt status assignees').lean(),
    Leave.find({}).sort({ createdAt: -1 }).limit(5).select('employee type startDate endDate days status createdAt').populate('employee', 'fullName employeeId').lean(),
    Leave.find({ status: 'Approved' }).sort({ reviewedAt: -1 }).limit(5).select('employee type startDate endDate days reviewedAt').populate('employee', 'fullName employeeId').lean(),
    SalaryPayment.find({ status: 'Paid' }).sort({ paidOn: -1 }).limit(5).select('employeeName employeeCode month year net paidOn').lean(),
  ]);

  // On-leave employees that are still active (and it is a working day).
  const onLeaveToday = isWeeklyOff || onLeaveIds.length === 0
    ? 0
    : await Employee.countDocuments({ _id: ts({ $in: onLeaveIds }), status: 'Active', joiningDate: ts({ $lte: today }) });
  // Everyone expected today who has neither checked in nor is on leave.
  const absentToday = isWeeklyOff ? 0 : Math.max(expectedToday - presentToday - onLeaveToday, 0);

  // ---- chart data
  const deptName = new Map(departments.map((d) => [String(d._id), d.name]));
  const departmentDistribution = deptRows
    .map((r) => ({ name: r._id ? deptName.get(String(r._id)) || 'Unknown' : 'Unassigned', count: r.count }))
    .sort((a, b) => b.count - a.count);

  const att = new Map(attendanceRows.map((r) => [`${r._id.y}-${r._id.m}-${r._id.s}`, r.count]));
  const attendanceMonthly = months6.map((mo) => ({
    label: mo.label,
    present: att.get(`${mo.year}-${mo.month}-Present`) || 0,
    late: att.get(`${mo.year}-${mo.month}-Late`) || 0,
    halfDay: att.get(`${mo.year}-${mo.month}-Half-day`) || 0,
  }));

  const sal = new Map(salaryRows.map((r) => [`${r._id.y}-${r._id.m}`, r]));
  const salaryMonthly = months6.map((mo) => ({
    label: mo.label,
    net: round2(sal.get(`${mo.year}-${mo.month}`)?.net),
    paid: round2(sal.get(`${mo.year}-${mo.month}`)?.paid),
  }));

  const join = new Map(joiningRows.map((r) => [`${r._id.y}-${r._id.m}`, r.count]));
  const joiningTrend = months12.map((mo) => ({ label: mo.label, count: join.get(`${mo.year}-${mo.month}`) || 0 }));

  const taskStatus = [
    { name: 'Pending', value: pendingTasksActive },
    { name: 'In Progress', value: inProgressTasksActive },
    { name: 'Completed', value: completedTasks },
    { name: 'Overdue', value: overdueTasks },
  ];

  const payroll = currentPayroll[0] || { count: 0, net: 0, paid: 0 };

  res.json({
    success: true,
    data: {
      asOf: todayKey,
      stats: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        totalDepartments,
        presentToday,
        absentToday,
        onLeaveToday,
        isWeeklyOff,
        pendingLeaves,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        overdueTasks,
        monthlyPayroll: round2(payroll.net),
        monthlyPayrollPaid: round2(payroll.paid),
        monthlyPayrollCount: payroll.count,
        payrollMonthLabel: `${MONTH_SHORT[nowMonth - 1]} ${nowYear}`,
      },
      charts: { departmentDistribution, attendanceMonthly, taskStatus, salaryMonthly, joiningTrend },
      recent: {
        employees: recentEmployees,
        tasks: recentTasks.map((t) => ({ ...t, assigneeCount: t.assignees.length, assignees: undefined })),
        leaveApplications: recentLeaves,
        approvedLeaves: recentApproved,
        salaryPayments: recentPaid,
      },
    },
  });
});

// GET /api/dashboard/activity?page&limit&entityType
export const getActivityLog = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = {};
  if (ENTITY_TYPES.includes(req.query.entityType)) filter.entityType = req.query.entityType;

  const [data, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ActivityLog.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
});

// ------------------------------------------------------------- employee

// GET /api/dashboard/employee   (everything is scoped to req.employee, which comes from the token)
export const getEmployeeDashboard = asyncHandler(async (req, res) => {
  const employee = await req.employee.populate('department', 'name');
  const cfg = getConfig();
  const todayKey = dateKey(new Date(), cfg.timeZone);
  const [year, month] = todayKey.split('-').map(Number);
  const today = keyToDate(todayKey);
  const { startKey, endKey } = monthKeys(year, month);
  const { start, end } = monthRange(year, month);

  // $elemMatch is wrapped in ts() (mongoose.trusted) because the app-wide sanitizeFilter would otherwise neutralise it.
  const notCompletedByMe = ts({ $elemMatch: { employee: employee._id, status: { $ne: 'Completed' } } });
  const completedByMe = ts({ $elemMatch: { employee: employee._id, status: 'Completed' } });
  const [
    todayRecord, monthRecords, leaveMap, assigned, completed, overdue, upcomingTasks,
    pendingLeaves, latestSalary, structure, notifications, unreadCount,
  ] = await Promise.all([
    Attendance.findOne({ employee: employee._id, date: today }).lean(),
    Attendance.find({ employee: employee._id, date: ts({ $gte: start, $lt: end }) }).lean(),
    getLeaveKeysByEmployee([employee._id], startKey, endKey),
    Task.countDocuments({ 'assignees.employee': employee._id }),
    Task.countDocuments({ assignees: completedByMe }),
    Task.countDocuments({ assignees: notCompletedByMe, deadline: ts({ $lt: today }) }),
    Task.find({ assignees: notCompletedByMe })
      .sort({ deadline: 1 }).limit(5).select('title priority deadline assignees').lean(),
    Leave.countDocuments({ employee: employee._id, status: 'Pending' }),
    SalaryPayment.findOne({ employee: employee._id }).sort({ year: -1, month: -1 })
      .select('month year gross totalDeductions net status paidOn').lean(),
    SalaryStructure.findOne({ employee: employee._id }).lean(),
    Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  const { summary } = buildMonth({
    year, month, records: monthRecords, joiningKey: dateToKey(employee.joiningDate), todayKey, cfg,
    leaveKeys: leaveMap.get(String(employee._id)),
  });

  res.json({
    success: true,
    data: {
      profile: {
        fullName: employee.fullName, employeeId: employee.employeeId, designation: employee.designation,
        department: employee.department?.name || null, joiningDate: employee.joiningDate, profilePicture: employee.profilePicture,
      },
      attendance: { today: todayRecord ? toClientRecord(todayRecord, cfg) : null, month: summary, rules: publicRules(cfg) },
      tasks: {
        assigned, completed, pending: assigned - completed, overdue,
        upcoming: upcomingTasks.map((t) => {
          const me = t.assignees.find((a) => String(a.employee) === String(employee._id));
          return { _id: t._id, title: t.title, priority: t.priority, deadline: t.deadline, myStatus: me?.status };
        }),
      },
      leave: { balance: employee.leaveBalance, pending: pendingLeaves },
      salary: { latest: latestSalary, structureNet: structure ? calculateTotals(structure).net : null },
      notifications: { items: notifications, unreadCount },
    },
  });
});

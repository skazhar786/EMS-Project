import mongoose from 'mongoose';
import SalaryStructure from '../models/SalaryStructure.js';
import SalaryPayment from '../models/SalaryPayment.js';
import Employee from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toCsv } from '../utils/csv.js';
import { notifyEmployees } from '../services/notificationService.js';
import {
  getPayrollDefaults, normalizeComponents, calculateTotals, COMPONENTS, MONTH_NAMES,
} from '../services/payrollService.js';
import { getConfig, dateKey, keyToDate, monthKeys } from '../services/attendanceService.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const money = (n) => `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const assertNetNotNegative = (components) => {
  const totals = calculateTotals(components);
  if (totals.net < 0) throw ApiError.badRequest('Total deductions cannot be more than the gross salary');
  return totals;
};

// Current month in the OFFICE timezone.
const currentPeriod = () => {
  const [year, month] = dateKey(new Date(), getConfig().timeZone).split('-').map(Number);
  return { year, month };
};

const parsePeriod = (query) => {
  const now = currentPeriod();
  const month = parseInt(query.month, 10);
  const year = parseInt(query.year, 10);
  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.month,
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : now.year,
  };
};

const employeeBrief = (e) => ({
  _id: e._id, employeeId: e.employeeId, fullName: e.fullName, profilePicture: e.profilePicture,
  department: e.department, designation: e.designation,
});

// ---------------------------------------------------------- settings

// GET /api/payroll/defaults
export const getDefaults = asyncHandler(async (req, res) => {
  res.json({ success: true, data: getPayrollDefaults() });
});

// ------------------------------------------------- salary structures

// GET /api/payroll/structures?search&department&configured=yes|no&page&limit
export const listStructures = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const filter = { status: 'Active' };
  const department = str(req.query.department);
  if (department && mongoose.isValidObjectId(department)) filter.department = department;
  const search = str(req.query.search);
  if (search) {
    const rx = mongoose.trusted({ $regex: escapeRegex(search), $options: 'i' });
    filter.$or = [{ fullName: rx }, { employeeId: rx }];
  }

  const employees = await Employee.find(filter)
    .select('employeeId fullName profilePicture department designation basicSalary')
    .populate('department', 'name')
    .sort({ fullName: 1 })
    .limit(1000)
    .lean();

  const structures = await SalaryStructure.find({ employee: mongoose.trusted({ $in: employees.map((e) => e._id) }) }).lean();
  const byEmployee = new Map(structures.map((s) => [String(s.employee), s]));

  let rows = employees.map((e) => {
    const structure = byEmployee.get(String(e._id)) || null;
    return { employee: employeeBrief(e), currentBasic: e.basicSalary || 0, structure, totals: structure ? calculateTotals(structure) : null };
  });

  const counts = { total: rows.length, configured: rows.filter((r) => r.structure).length };
  counts.missing = counts.total - counts.configured;

  const configured = str(req.query.configured);
  if (configured === 'yes') rows = rows.filter((r) => r.structure);
  if (configured === 'no') rows = rows.filter((r) => !r.structure);

  const total = rows.length;
  res.json({
    success: true,
    data: { rows: rows.slice((page - 1) * limit, page * limit), counts },
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// GET /api/payroll/structures/:employeeId
export const getStructure = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.employeeId).select('employeeId fullName basicSalary').lean();
  if (!employee) throw ApiError.notFound('Employee not found');
  const structure = await SalaryStructure.findOne({ employee: employee._id }).lean();
  res.json({ success: true, data: { employee, structure, totals: structure ? calculateTotals(structure) : null } });
});

// PUT /api/payroll/structures/:employeeId   (create or update)
export const saveStructure = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.employeeId).select('fullName status');
  if (!employee) throw ApiError.notFound('Employee not found');

  const components = normalizeComponents(req.body);
  const totals = assertNetNotNegative(components);

  const structure = await SalaryStructure.findOneAndUpdate(
    { employee: employee._id },
    { ...components, updatedBy: req.user._id },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );
  // Keep the basic salary shown on the employee profile in step with the structure.
  await Employee.updateOne({ _id: employee._id }, { basicSalary: components.basic });

  await notifyEmployees([employee._id], {
    type: 'SALARY',
    title: 'Salary structure updated',
    message: `Your monthly salary structure was updated. Gross: ${money(totals.gross)}, net: ${money(totals.net)}.`,
    link: '/employee/salary',
  });

  await logActivity(req, { action: 'SALARY_STRUCTURE_SAVED', entityType: 'Payroll', entityId: employee._id, description: `Updated salary structure of ${employee.fullName}` });
  res.json({ success: true, message: 'Salary structure saved', data: { structure, totals } });
});

// -------------------------------------------------------- payroll runs

const monthEnd = (year, month) => keyToDate(monthKeys(year, month).endKey);

// POST /api/payroll/generate   { month, year, department? }
export const generatePayroll = asyncHandler(async (req, res) => {
  const month = Number(req.body.month);
  const year = Number(req.body.year);
  const now = currentPeriod();
  if (year * 12 + month > now.year * 12 + now.month) {
    throw ApiError.badRequest('Payroll cannot be generated for a future month');
  }

  const filter = { status: 'Active', joiningDate: mongoose.trusted({ $lte: monthEnd(year, month) }) };
  if (req.body.department) filter.department = req.body.department;

  const employees = await Employee.find(filter).populate('department', 'name').lean();
  if (employees.length === 0) throw ApiError.badRequest('No active employees found for that month');

  const ids = employees.map((e) => e._id);
  const [structures, existing] = await Promise.all([
    SalaryStructure.find({ employee: mongoose.trusted({ $in: ids }) }).lean(),
    SalaryPayment.find({ employee: mongoose.trusted({ $in: ids }), month, year }).select('employee').lean(),
  ]);
  const structureOf = new Map(structures.map((s) => [String(s.employee), s]));
  const hasPayment = new Set(existing.map((p) => String(p.employee)));

  let created = 0;
  let skippedNoStructure = 0;
  let alreadyExisting = 0;

  for (const e of employees) {
    if (hasPayment.has(String(e._id))) { alreadyExisting += 1; continue; }
    const structure = structureOf.get(String(e._id));
    if (!structure) { skippedNoStructure += 1; continue; }

    const components = normalizeComponents(structure);
    try {
      await SalaryPayment.create({
        employee: e._id, month, year,
        employeeCode: e.employeeId, employeeName: e.fullName,
        departmentName: e.department?.name || '', designation: e.designation || '',
        ...components, ...calculateTotals(components),
        generatedBy: req.user._id,
      });
      created += 1;
    } catch (err) {
      if (err.code === 11000) alreadyExisting += 1; // created by a concurrent request
      else throw err;
    }
  }

  await logActivity(req, { action: 'PAYROLL_GENERATED', entityType: 'Payroll', entityId: undefined, description: `Generated payroll for ${MONTH_NAMES[month - 1]} ${year}: ${created} payslip(s) created` });
  res.status(201).json({
    success: true,
    message: `Payroll for ${MONTH_NAMES[month - 1]} ${year}: ${created} created`,
    data: { created, alreadyExisting, skippedNoStructure },
  });
});

// Builds the shared payment filter for list / export.
const paymentFilter = async (query) => {
  const { month, year } = parsePeriod(query);
  const filter = { month, year };

  const status = str(query.status);
  if (['Pending', 'Paid'].includes(status)) filter.status = status;

  let employeeIds = null;
  const department = str(query.department);
  const search = str(query.search);
  if ((department && mongoose.isValidObjectId(department)) || search) {
    const empFilter = {};
    if (department && mongoose.isValidObjectId(department)) empFilter.department = department;
    if (search) {
      const rx = mongoose.trusted({ $regex: escapeRegex(search), $options: 'i' });
      empFilter.$or = [{ fullName: rx }, { employeeId: rx }];
    }
    employeeIds = await Employee.find(empFilter).distinct('_id');
    filter.employee = mongoose.trusted({ $in: employeeIds });
  }
  return { filter, employeeIds, month, year };
};

// GET /api/payroll/payments?month&year&status&department&search&page&limit
export const listPayments = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const { filter, employeeIds, month, year } = await paymentFilter(req.query);

  const match = { month, year };
  if (filter.status) match.status = filter.status;
  if (employeeIds) match.employee = { $in: employeeIds };

  const [payments, total, totalsRows] = await Promise.all([
    SalaryPayment.find(filter)
      .populate('employee', 'profilePicture')
      .sort({ employeeName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SalaryPayment.countDocuments(filter),
    SalaryPayment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gross: { $sum: '$gross' },
          deductions: { $sum: '$totalDeductions' },
          net: { $sum: '$net' },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
          paidNet: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$net', 0] } },
        },
      },
    ]),
  ]);

  const t = totalsRows[0] || { count: 0, gross: 0, deductions: 0, net: 0, paidCount: 0, paidNet: 0 };
  const r2 = (n) => Math.round(n * 100) / 100;
  res.json({
    success: true,
    data: {
      month, year, payments,
      totals: {
        count: t.count, gross: r2(t.gross), deductions: r2(t.deductions), net: r2(t.net),
        paidCount: t.paidCount, pendingCount: t.count - t.paidCount,
        paidNet: r2(t.paidNet), pendingNet: r2(t.net - t.paidNet),
      },
    },
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// GET /api/payroll/export?month&year&status&department&search   (CSV)
export const exportPayments = asyncHandler(async (req, res) => {
  const { filter, month, year } = await paymentFilter(req.query);
  const payments = await SalaryPayment.find(filter).sort({ employeeName: 1 }).limit(5000).lean();

  const csv = toCsv(
    [
      'Employee ID', 'Name', 'Department', 'Month', 'Year', 'Basic', 'HRA', 'Medical allowance', 'Travel allowance',
      'Other allowances', 'Gross', 'Provident fund', 'Tax', 'Other deductions', 'Total deductions', 'Net', 'Status', 'Paid on',
    ],
    payments.map((p) => [
      p.employeeCode, p.employeeName, p.departmentName, MONTH_NAMES[p.month - 1], p.year,
      p.basic, p.hra, p.medicalAllowance, p.travelAllowance, p.otherAllowances, p.gross,
      p.pfDeduction, p.taxDeduction, p.otherDeductions, p.totalDeductions, p.net,
      p.status, p.paidOn ? new Date(p.paidOn).toISOString().slice(0, 10) : '',
    ])
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-${year}-${String(month).padStart(2, '0')}.csv"`);
  res.send(`\uFEFF${csv}`);
});

// PUT /api/payroll/payments/:id   (adjust amounts of a PENDING payslip, e.g. add a deduction)
export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await SalaryPayment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payslip not found');
  if (payment.status === 'Paid') throw ApiError.conflict('A paid payslip cannot be edited. Mark it as pending first');

  const components = normalizeComponents(req.body);
  const totals = assertNetNotNegative(components);
  COMPONENTS.forEach((k) => { payment[k] = components[k]; });
  Object.assign(payment, totals);
  if (req.body.remarks !== undefined) payment.remarks = req.body.remarks || '';
  payment.editedBy = req.user._id;
  await payment.save();

  await logActivity(req, { action: 'PAYSLIP_ADJUSTED', entityType: 'Payroll', entityId: payment._id, description: `Adjusted payslip of ${payment.employeeName} for ${MONTH_NAMES[payment.month - 1]} ${payment.year}` });
  res.json({ success: true, message: 'Payslip updated', data: payment });
});

// PATCH /api/payroll/payments/:id/status   { status: 'Paid' | 'Pending' }
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const payment = await SalaryPayment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payslip not found');
  if (payment.status === status) throw ApiError.conflict(`This payslip is already ${status.toLowerCase()}`);

  payment.status = status;
  payment.paidOn = status === 'Paid' ? new Date() : undefined;
  await payment.save();

  if (status === 'Paid') {
    await notifyEmployees([payment.employee], {
      type: 'SALARY',
      title: 'Salary paid',
      message: `Your salary for ${MONTH_NAMES[payment.month - 1]} ${payment.year} (net ${money(payment.net)}) has been marked as paid. You can download your payslip.`,
      link: '/employee/salary',
    });
  }

  await logActivity(req, { action: 'PAYSLIP_STATUS', entityType: 'Payroll', entityId: payment._id, description: `Marked ${payment.employeeName}'s ${MONTH_NAMES[payment.month - 1]} ${payment.year} payslip as ${status.toLowerCase()}` });
  res.json({ success: true, message: `Payslip marked as ${status.toLowerCase()}`, data: payment });
});

// DELETE /api/payroll/payments/:id   (PENDING only, so it can be regenerated)
export const deletePayment = asyncHandler(async (req, res) => {
  const payment = await SalaryPayment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payslip not found');
  if (payment.status === 'Paid') throw ApiError.conflict('A paid payslip cannot be deleted. Mark it as pending first');
  await payment.deleteOne();
  await logActivity(req, { action: 'PAYSLIP_DELETED', entityType: 'Payroll', entityId: payment._id, description: `Deleted pending payslip of ${payment.employeeName} for ${MONTH_NAMES[payment.month - 1]} ${payment.year}` });
  res.json({ success: true, message: 'Payslip deleted' });
});

// ------------------------------------------------------------ employee
// Every query below is scoped to req.employee._id (from the token), never to an id in the request.

// GET /api/payroll/my/structure
export const getMyStructure = asyncHandler(async (req, res) => {
  const structure = await SalaryStructure.findOne({ employee: req.employee._id }).lean();
  res.json({ success: true, data: { structure, totals: structure ? calculateTotals(structure) : null } });
});

// GET /api/payroll/my
export const listMyPayments = asyncHandler(async (req, res) => {
  const data = await SalaryPayment.find({ employee: req.employee._id })
    .select('-generatedBy -editedBy')
    .sort({ year: -1, month: -1 })
    .limit(60)
    .lean();
  res.json({ success: true, data });
});

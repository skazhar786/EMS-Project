import mongoose from 'mongoose';
import './Employee.js'; // registers the Employee model for populate()

export const PAYMENT_STATUSES = ['Pending', 'Paid'];

const amount = { type: Number, default: 0, min: 0 };

// A payslip for one employee for one month. All amounts are a SNAPSHOT taken when the payroll is
// generated, so editing a salary structure later never changes past payslips.
const salaryPaymentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000, max: 2100 },

    // Snapshot of who the payslip is for.
    employeeCode: { type: String, required: true },
    employeeName: { type: String, required: true },
    departmentName: { type: String, default: '' },
    designation: { type: String, default: '' },

    // Earnings
    basic: amount,
    hra: amount,
    medicalAllowance: amount,
    travelAllowance: amount,
    otherAllowances: amount,
    // Deductions
    pfDeduction: amount,
    taxDeduction: amount,
    otherDeductions: amount,

    // Gross = basic + all allowances.  Net = gross - all deductions.
    gross: amount,
    totalDeductions: amount,
    net: amount,

    status: { type: String, enum: PAYMENT_STATUSES, default: 'Pending' },
    paidOn: { type: Date },
    remarks: { type: String, trim: true, maxlength: 300, default: '' },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One payslip per employee per month: generating twice can never duplicate.
salaryPaymentSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salaryPaymentSchema.index({ year: 1, month: 1, status: 1 });

export default mongoose.model('SalaryPayment', salaryPaymentSchema);

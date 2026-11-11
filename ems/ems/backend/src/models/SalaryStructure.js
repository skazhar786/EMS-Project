import mongoose from 'mongoose';
import './Employee.js'; // registers the Employee model for populate()

const amount = (label) => ({
  type: Number,
  default: 0,
  min: [0, `${label} cannot be negative`],
  max: [100000000, `${label} is too large`],
});

// One structure per employee: fixed MONTHLY amounts for each component.
const salaryStructureSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    basic: { ...amount('Basic salary'), required: [true, 'Basic salary is required'] },
    hra: amount('HRA'),
    medicalAllowance: amount('Medical allowance'),
    travelAllowance: amount('Travel allowance'),
    otherAllowances: amount('Other allowances'),
    pfDeduction: amount('Provident fund'),
    taxDeduction: amount('Tax'),
    otherDeductions: amount('Other deductions'),
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('SalaryStructure', salaryStructureSchema);

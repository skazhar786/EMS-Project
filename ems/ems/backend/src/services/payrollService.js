// Project-level payroll rules. This is NOT a legally certified tax or statutory payroll engine:
// the percentages below only pre-fill the form, and every amount remains editable by the admin.

const pct = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
};

export const getPayrollDefaults = () => ({
  hraPercent: pct(process.env.PAYROLL_HRA_PERCENT, 40), // HRA as % of basic
  pfPercent: pct(process.env.PAYROLL_PF_PERCENT, 12), // provident fund as % of basic
});

export const COMPONENTS = [
  'basic', 'hra', 'medicalAllowance', 'travelAllowance', 'otherAllowances',
  'pfDeduction', 'taxDeduction', 'otherDeductions',
];

const cents = (v) => Math.round((Number(v) || 0) * 100);

// Accepts strings or numbers; blank or invalid becomes 0; rounds to 2 decimals.
export const normalizeComponents = (body = {}) =>
  COMPONENTS.reduce((acc, key) => {
    acc[key] = cents(body[key]) / 100;
    return acc;
  }, {});

// Integer-cent arithmetic so 0.1 + 0.2 style errors can never reach a payslip.
//   Gross = Basic + total allowances
//   Net   = Gross - total deductions
export const calculateTotals = (c) => {
  const gross =
    cents(c.basic) + cents(c.hra) + cents(c.medicalAllowance) + cents(c.travelAllowance) + cents(c.otherAllowances);
  const deductions = cents(c.pfDeduction) + cents(c.taxDeduction) + cents(c.otherDeductions);
  return { gross: gross / 100, totalDeductions: deductions / 100, net: (gross - deductions) / 100 };
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

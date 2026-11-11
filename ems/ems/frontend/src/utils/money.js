export const EARNINGS = [
  { name: 'basic', label: 'Basic salary' },
  { name: 'hra', label: 'House rent allowance (HRA)' },
  { name: 'medicalAllowance', label: 'Medical allowance' },
  { name: 'travelAllowance', label: 'Travel allowance' },
  { name: 'otherAllowances', label: 'Other allowances' },
];

export const DEDUCTIONS = [
  { name: 'pfDeduction', label: 'Provident fund (PF)' },
  { name: 'taxDeduction', label: 'Tax deduction' },
  { name: 'otherDeductions', label: 'Other deductions' },
];

const cents = (v) => Math.round((Number(v) || 0) * 100);

// Same integer-cent maths as the server, used only for the live preview in forms.
//   Gross = Basic + allowances        Net = Gross - deductions
export const calcTotals = (c = {}) => {
  const gross = EARNINGS.reduce((sum, f) => sum + cents(c[f.name]), 0);
  const deductions = DEDUCTIONS.reduce((sum, f) => sum + cents(c[f.name]), 0);
  return { gross: gross / 100, totalDeductions: deductions / 100, net: (gross - deductions) / 100 };
};

export const formatMoney = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

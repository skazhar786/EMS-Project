// Builds a CSV string. Cells starting with = + - @ are prefixed with ' so spreadsheet
// software cannot execute them as formulas (CSV injection).
const cell = (value) => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (headers, rows) =>
  [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\r\n');

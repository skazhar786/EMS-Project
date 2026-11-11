import { MONTH_NAMES } from './format';
import { EARNINGS, DEDUCTIONS } from './money';

const COMPANY = import.meta.env.VITE_COMPANY_NAME || 'Employee Management System';

// The built-in PDF fonts cannot draw the ₹ symbol, so PDFs use "Rs.".
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longDate = (v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Builds and downloads a payslip PDF from a payment record (all data is a stored snapshot).
export async function downloadPayslipPdf(payment) {
  const { jsPDF } = await import('jspdf'); // loaded on demand to keep the main bundle small
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 15;
  const period = `${MONTH_NAMES[payment.month - 1]} ${payment.year}`;

  // Header band
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(COMPANY, M, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payslip for ${period}`, M, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('PAYSLIP', W - M, 20, { align: 'right' });

  // Employee details
  doc.setTextColor(30, 41, 59);
  const details = [
    ['Employee name', payment.employeeName, 'Employee ID', payment.employeeCode],
    ['Department', payment.departmentName || '-', 'Designation', payment.designation || '-'],
    ['Pay period', period, 'Payment status', payment.status === 'Paid' && payment.paidOn ? `Paid on ${longDate(payment.paidOn)}` : payment.status],
  ];
  let y = 42;
  details.forEach(([l1, v1, l2, v2]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(l1, M, y);
    doc.text(l2, 110, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(String(v1), M, y + 5);
    doc.text(String(v2), 110, y + 5);
    y += 13;
  });

  // Earnings / deductions table
  y += 2;
  doc.setFillColor(241, 245, 249);
  doc.rect(M, y - 5, W - 2 * M, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EARNINGS', M + 2, y);
  doc.text('AMOUNT', 100, y, { align: 'right' });
  doc.text('DEDUCTIONS', 110, y);
  doc.text('AMOUNT', W - M - 2, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const rows = Math.max(EARNINGS.length, DEDUCTIONS.length);
  for (let i = 0; i < rows; i += 1) {
    const e = EARNINGS[i];
    const d = DEDUCTIONS[i];
    if (e) {
      doc.text(e.label, M + 2, y);
      doc.text(rs(payment[e.name]), 100, y, { align: 'right' });
    }
    if (d) {
      doc.text(d.label, 110, y);
      doc.text(rs(payment[d.name]), W - M - 2, y, { align: 'right' });
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y + 2.5, W - M, y + 2.5);
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Gross earnings', M + 2, y);
  doc.text(rs(payment.gross), 100, y, { align: 'right' });
  doc.text('Total deductions', 110, y);
  doc.text(rs(payment.totalDeductions), W - M - 2, y, { align: 'right' });
  y += 12;

  // Net salary box
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.6);
  doc.setFillColor(238, 242, 255);
  doc.rect(M, y, W - 2 * M, 18, 'FD');
  doc.setFontSize(11);
  doc.setTextColor(67, 56, 202);
  doc.text('NET SALARY', M + 4, y + 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Gross earnings minus total deductions', M + 4, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(rs(payment.net), W - M - 4, y + 11, { align: 'right' });
  y += 28;

  if (payment.remarks) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Remarks', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(doc.splitTextToSize(payment.remarks, W - 2 * M), M, y + 5);
  }

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text(
    'This is a system-generated payslip from a project-level payroll system. It is not a statutory or tax document.',
    W / 2, 285, { align: 'center' }
  );

  doc.save(`Payslip_${payment.employeeCode}_${MONTH_NAMES[payment.month - 1]}_${payment.year}.pdf`);
}

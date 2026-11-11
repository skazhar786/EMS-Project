import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import SalaryBreakdown from './SalaryBreakdown';
import { downloadPayslipPdf } from '../../utils/payslipPdf';
import { MONTH_NAMES, formatDate } from '../../utils/format';

// Shows one payslip and lets the user download it as a PDF. Used by both admin and employee.
export default function PayslipModal({ payment, onClose }) {
  const [busy, setBusy] = useState(false);
  if (!payment) return null;

  const download = async () => {
    setBusy(true);
    try {
      await downloadPayslipPdf(payment);
    } catch {
      toast.error('Could not generate the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`Payslip: ${MONTH_NAMES[payment.month - 1]} ${payment.year}`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-slate-900">{payment.employeeName}</p>
            <p className="text-xs text-slate-500">
              {payment.employeeCode}{payment.departmentName ? ` · ${payment.departmentName}` : ''}{payment.designation ? ` · ${payment.designation}` : ''}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={payment.status} />
            {payment.status === 'Paid' && payment.paidOn && <p className="mt-1 text-xs text-slate-500">Paid on {formatDate(payment.paidOn)}</p>}
          </div>
        </div>

        <SalaryBreakdown values={payment} totals={{ gross: payment.gross, totalDeductions: payment.totalDeductions, net: payment.net }} />

        {payment.remarks && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><strong>Remarks:</strong> {payment.remarks}</p>
        )}

        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={download} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}

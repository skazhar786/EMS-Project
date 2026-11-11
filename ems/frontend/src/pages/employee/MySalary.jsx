import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, Loader2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import StatusBadge from '../../components/ui/StatusBadge';
import TableSkeleton from '../../components/ui/TableSkeleton';
import SalaryBreakdown from '../../components/payroll/SalaryBreakdown';
import PayslipModal from '../../components/payroll/PayslipModal';
import { downloadPayslipPdf } from '../../utils/payslipPdf';
import { formatDate, MONTH_NAMES } from '../../utils/format';
import { formatMoney } from '../../utils/money';

export default function MySalary() {
  const [structure, setStructure] = useState(null);
  const [totals, setTotals] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, p] = await Promise.all([api.get('/payroll/my/structure'), api.get('/payroll/my')]);
      setStructure(s.data.data.structure);
      setTotals(s.data.data.totals);
      setPayments(p.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const download = async (payment) => {
    setDownloadingId(payment._id);
    try {
      await downloadPayslipPdf(payment);
    } catch {
      toast.error('Could not generate the PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const latest = payments[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Salary</h1>
        <p className="mt-1 text-sm text-slate-500">Your salary structure and monthly payslips. Only you can see this page.</p>
      </div>

      {loading && <div className="card"><TableSkeleton rows={5} cols={4} /></div>}
      {!loading && error && <div className="card"><ErrorState message={error} onRetry={load} /></div>}

      {!loading && !error && (
        <>
          {latest && (
            <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Latest salary: {MONTH_NAMES[latest.month - 1]} {latest.year}</p>
                <p className="mt-1 text-3xl font-semibold text-primary-700">{formatMoney(latest.net)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Net salary · Gross {formatMoney(latest.gross)} · Deductions {formatMoney(latest.totalDeductions)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={latest.status} />
                <button className="btn-primary" onClick={() => download(latest)} disabled={downloadingId === latest._id}>
                  {downloadingId === latest._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Payslip PDF
                </button>
              </div>
            </div>
          )}

          <div className="card p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Current salary structure (monthly)</h2>
            {structure ? (
              <SalaryBreakdown values={structure} totals={totals} />
            ) : (
              <EmptyState
                icon={Wallet}
                title="Your salary structure is not set up yet"
                description="The administrator has not entered your salary details. Please check back later."
              />
            )}
          </div>

          <div className="card">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Salary history</h2>
            </div>
            {payments.length === 0 ? (
              <EmptyState icon={Wallet} title="No payslips yet" description="Your monthly payslips will appear here once payroll is generated." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Month</th>
                      <th className="px-4 py-3 font-medium">Gross</th>
                      <th className="px-4 py-3 font-medium">Deductions</th>
                      <th className="px-4 py-3 font-medium">Net</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                        <td className="px-4 py-3 text-slate-700">{formatMoney(p.gross)}</td>
                        <td className="px-4 py-3 text-red-600">{formatMoney(p.totalDeductions)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(p.net)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                          {p.status === 'Paid' && p.paidOn && <span className="ml-2 text-xs text-slate-400">{formatDate(p.paidOn)}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              onClick={() => setViewing(p)} title="View breakdown" aria-label={`View payslip for ${MONTH_NAMES[p.month - 1]} ${p.year}`}>
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              onClick={() => download(p)} disabled={downloadingId === p._id}
                              title="Download PDF" aria-label={`Download payslip PDF for ${MONTH_NAMES[p.month - 1]} ${p.year}`}>
                              {downloadingId === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <PayslipModal payment={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

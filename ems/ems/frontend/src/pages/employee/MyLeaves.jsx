import { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Plus, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import StatusBadge from '../../components/ui/StatusBadge';
import TableSkeleton from '../../components/ui/TableSkeleton';
import LeaveForm from '../../components/forms/LeaveForm';
import { formatDate, formatDateUTC } from '../../utils/format';
import { LEAVE_LABELS } from '../../utils/leave';

function BalanceCard({ label, left, pending }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">
        {left} <span className="text-sm font-normal text-slate-500">days left</span>
      </p>
      {pending > 0 && <p className="mt-1 text-xs text-amber-600">{pending} day(s) pending approval</p>}
    </div>
  );
}

export default function MyLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [info, setInfo] = useState(null); // { balance, pending, weeklyOff }
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [toWithdraw, setToWithdraw] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [l, b] = await Promise.all([
        api.get('/leaves/my', { params: { status: status || undefined } }),
        api.get('/leaves/balance'),
      ]);
      setLeaves(l.data.data);
      setInfo(b.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const submit = async (values) => {
    await api.post('/leaves', values);
    toast.success('Leave request submitted');
    setApplying(false);
    load();
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      await api.delete(`/leaves/${toWithdraw._id}`);
      toast.success('Leave request withdrawn');
      load();
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setWithdrawing(false);
      setToWithdraw(null);
    }
  };

  const tabClass = (name) =>
    `border-b-2 px-4 py-2 text-sm font-medium ${status === name ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Leaves</h1>
          <p className="mt-1 text-sm text-slate-500">Apply for leave and track your requests. Balances change only when a request is approved.</p>
        </div>
        <button className="btn-primary" onClick={() => setApplying(true)} disabled={!info}>
          <Plus className="h-4 w-4" /> Apply for leave
        </button>
      </div>

      {info && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <BalanceCard label="Casual leave" left={info.balance.casual} pending={info.pending.Casual || 0} />
          <BalanceCard label="Sick leave" left={info.balance.sick} pending={info.pending.Sick || 0} />
          <BalanceCard label="Earned leave" left={info.balance.earned} pending={info.pending.Earned || 0} />
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Unpaid leave</p>
            <p className="mt-1 text-sm text-slate-600">No balance limit. Needs approval.</p>
            {(info.pending.Unpaid || 0) > 0 && <p className="mt-1 text-xs text-amber-600">{info.pending.Unpaid} day(s) pending approval</p>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {[['', 'All'], ['Pending', 'Pending'], ['Approved', 'Approved'], ['Rejected', 'Rejected']].map(([value, label]) => (
            <button key={label} className={tabClass(value)} onClick={() => setStatus(value)}>{label}</button>
          ))}
        </div>

        {loading && <TableSkeleton rows={4} cols={5} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && leaves.length === 0 && (
          <EmptyState
            icon={CalendarOff}
            title={status ? `No ${status.toLowerCase()} requests` : 'No leave requests yet'}
            description="Use “Apply for leave” to submit your first request."
          />
        )}

        {!loading && !error && leaves.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Admin remarks</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <tr key={l._id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{LEAVE_LABELS[l.type]}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateUTC(l.startDate)}
                      {l.startDate !== l.endDate && <> – {formatDateUTC(l.endDate)}</>}
                      <p className="text-xs text-slate-400">Applied {formatDate(l.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{l.days}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600"><p className="line-clamp-2">{l.reason}</p></td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{l.remarks || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {l.status === 'Pending' && (
                          <button className="btn-secondary !py-1.5" onClick={() => setToWithdraw(l)}>
                            <Undo2 className="h-4 w-4" /> Withdraw
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={applying} onClose={() => setApplying(false)} title="Apply for leave">
        {info && <LeaveForm balance={info.balance} weeklyOff={info.weeklyOff} onSubmit={submit} onCancel={() => setApplying(false)} />}
      </Modal>

      <ConfirmDialog
        open={!!toWithdraw}
        loading={withdrawing}
        title="Withdraw leave request"
        message="This cancels your pending request. You can apply again later."
        confirmLabel="Withdraw"
        onConfirm={withdraw}
        onCancel={() => setToWithdraw(null)}
      />
    </div>
  );
}

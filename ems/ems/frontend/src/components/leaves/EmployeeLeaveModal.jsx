import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../ui/Modal';
import ErrorState from '../ui/ErrorState';
import StatusBadge from '../ui/StatusBadge';
import TableSkeleton from '../ui/TableSkeleton';
import EmptyState from '../ui/EmptyState';
import { formatDateUTC } from '../../utils/format';
import { LEAVE_LABELS } from '../../utils/leave';

function BalanceForm({ employee, onSaved }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { ...employee.leaveBalance },
  });

  const save = async (values) => {
    try {
      await api.put(`/leaves/balance/${employee._id}`, values);
      toast.success('Leave balance updated');
      onSaved();
    } catch (err) {
      toast.error(err.userMessage);
    }
  };

  const field = (name, label) => (
    <div>
      <label htmlFor={`b-${name}`} className="label">{label}</label>
      <input id={`b-${name}`} type="number" step="0.5" min="0" max="365" className="input"
        {...register(name, { required: 'Required', min: { value: 0, message: 'Min 0' }, max: { value: 365, message: 'Max 365' } })} />
      {errors[name] && <p className="field-error">{errors[name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(save)} className="space-y-3">
      <p className="text-sm text-slate-600">Remaining days. Changing these does not rewrite past requests.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {field('casual', 'Casual')}
        {field('sick', 'Sick')}
        {field('earned', 'Earned')}
      </div>
      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Save balances
      </button>
    </form>
  );
}

// Admin: one employee's leave balances (editable) and full leave history.
export default function EmployeeLeaveModal({ open, onClose, employeeId, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/leaves/employee/${employeeId}`);
      setData(res.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { if (open) { setData(null); load(); } }, [open, load]);

  return (
    <Modal open={open} onClose={onClose} size="lg" title={data ? `Leave: ${data.employee.fullName}` : 'Leave history'}>
      {loading && <TableSkeleton rows={4} cols={4} />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && data && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Leave balance</h3>
            <BalanceForm employee={data.employee} onSaved={() => { load(); onChanged?.(); }} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">History</h3>
            {data.leaves.length === 0 ? (
              <EmptyState title="No leave requests" description="This employee has not applied for leave yet." />
            ) : (
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Dates</th>
                      <th className="px-3 py-2 font-medium">Days</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.leaves.map((l) => (
                      <tr key={l._id}>
                        <td className="px-3 py-2 text-slate-800">{LEAVE_LABELS[l.type]}</td>
                        <td className="px-3 py-2 text-slate-700">{formatDateUTC(l.startDate)} – {formatDateUTC(l.endDate)}</td>
                        <td className="px-3 py-2 text-slate-700">{l.days}</td>
                        <td className="px-3 py-2"><StatusBadge status={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

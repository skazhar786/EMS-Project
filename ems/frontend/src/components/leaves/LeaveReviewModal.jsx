import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import Avatar from '../ui/Avatar';
import { formatDate, formatDateUTC } from '../../utils/format';
import { BALANCE_FIELD, LEAVE_LABELS } from '../../utils/leave';

function Meta({ label, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{children}</div>
    </div>
  );
}

// Admin: read a leave request in full, then approve or reject it.
export default function LeaveReviewModal({ leave, onClose, onDone }) {
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  if (!leave) return null;
  const pending = leave.status === 'Pending';
  const field = BALANCE_FIELD[leave.type];
  const left = field ? leave.employee?.leaveBalance?.[field] : null;
  const insufficient = left !== null && left !== undefined && leave.days > left;

  const act = async (kind) => {
    if (kind === 'reject' && remarks.trim().length < 3) {
      setError('Please give a reason for rejecting (at least 3 characters).');
      return;
    }
    setError('');
    setBusy(kind);
    try {
      const res = await api.patch(`/leaves/${leave._id}/${kind}`, { remarks: remarks.trim() });
      toast.success(res.data.message);
      onDone();
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setBusy('');
    }
  };

  return (
    <Modal open onClose={busy ? undefined : onClose} title="Leave request" size="lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={leave.employee.fullName} src={leave.employee.profilePicture} />
            <div>
              <p className="font-medium text-slate-900">{leave.employee.fullName}</p>
              <p className="text-xs text-slate-500">{leave.employee.employeeId} · {leave.employee.department?.name || 'No department'}</p>
            </div>
          </div>
          <StatusBadge status={leave.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Meta label="Type">{LEAVE_LABELS[leave.type]}</Meta>
          <Meta label="From">{formatDateUTC(leave.startDate)}</Meta>
          <Meta label="To">{formatDateUTC(leave.endDate)}</Meta>
          <Meta label="Working days">{leave.days}</Meta>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Reason</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{leave.reason}</p>
          <p className="mt-1 text-xs text-slate-400">Applied on {formatDate(leave.createdAt)}</p>
        </div>

        {left !== null && left !== undefined && (
          <p className={`rounded-lg px-3 py-2 text-sm ${insufficient && pending ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
            {LEAVE_LABELS[leave.type]} balance: <strong>{left}</strong> day(s) remaining
            {pending ? ` (this request needs ${leave.days}).` : '.'}
            {insufficient && pending && ' Approving is not possible until the balance is increased.'}
          </p>
        )}

        {pending ? (
          <>
            <div>
              <label htmlFor="remarks" className="label">Remarks (required when rejecting)</label>
              <textarea id="remarks" rows={2} className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              {error && <p className="field-error">{error}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={onClose} disabled={!!busy}>Close</button>
              <button className="btn-danger" onClick={() => act('reject')} disabled={!!busy}>
                {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject
              </button>
              <button className="btn-primary" onClick={() => act('approve')} disabled={!!busy}>
                {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {leave.remarks && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Admin remarks</p>
                <p className="mt-1 text-sm text-slate-700">{leave.remarks}</p>
              </div>
            )}
            {leave.reviewedAt && <p className="text-xs text-slate-400">Reviewed on {formatDate(leave.reviewedAt)}</p>}
            <div className="flex justify-end"><button className="btn-secondary" onClick={onClose}>Close</button></div>
          </div>
        )}
      </div>
    </Modal>
  );
}

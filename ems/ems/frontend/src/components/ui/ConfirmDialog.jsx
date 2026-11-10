import { Loader2 } from 'lucide-react';
import Modal from './Modal';

// Confirmation before destructive operations.
export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', danger = false, loading = false, onConfirm, onCancel,
}) {
  return (
    <Modal open={open} onClose={loading ? undefined : onCancel} title={title} size="sm">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

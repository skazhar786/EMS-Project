import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import PriorityBadge from '../ui/PriorityBadge';
import Avatar from '../ui/Avatar';
import { formatDateTime, formatDateUTC } from '../../utils/format';

function Meta({ label, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{children}</div>
    </div>
  );
}

// mode "admin": task from GET /tasks.  mode "employee": task from GET /tasks/my.
export default function TaskDetails({ open, onClose, task, mode }) {
  if (!task) return null;
  const isAdmin = mode === 'admin';
  const status = isAdmin ? task.status : task.myStatus;

  return (
    <Modal open={open} onClose={onClose} title="Task details" size="lg">
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={status} />
            {task.isOverdue && <StatusBadge status="Overdue" />}
          </div>
        </div>

        <p className="whitespace-pre-line text-sm text-slate-600">{task.description || 'No description provided.'}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <Meta label="Deadline">{formatDateUTC(task.deadline)}</Meta>
          <Meta label="Created">{formatDateTime(task.createdAt)}</Meta>
          {isAdmin ? (
            <Meta label="Progress">{task.progress.done} of {task.progress.total} completed</Meta>
          ) : (
            <Meta label="Shared with">{task.coAssigneeCount > 0 ? `${task.coAssigneeCount} other employee(s)` : 'Only you'}</Meta>
          )}
        </div>

        {isAdmin && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Assigned to</h4>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {task.assignees.map((a) => (
                <li key={a.employee._id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={a.employee.fullName} src={a.employee.profilePicture} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.employee.fullName}</p>
                      <p className="text-xs text-slate-500">{a.employee.employeeId}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-900">Activity</h4>
          {task.history.length === 0 ? (
            <p className="text-sm text-slate-500">No status changes yet.</p>
          ) : (
            <ul className="space-y-2">
              {[...task.history].reverse().map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">
                    {isAdmin ? `${h.employee?.fullName || 'An employee'} set status to ` : 'You set status to '}
                    <strong>{h.status}</strong>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{formatDateTime(h.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

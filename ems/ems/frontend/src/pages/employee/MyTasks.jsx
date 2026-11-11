import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import PriorityBadge from '../../components/ui/PriorityBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import TableSkeleton from '../../components/ui/TableSkeleton';
import TaskDetails from '../../components/tasks/TaskDetails';
import { formatDate, formatDateUTC } from '../../utils/format';

const STATUSES = ['Pending', 'In Progress', 'Completed'];

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('active');
  const [priority, setPriority] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tasks/my');
      setTasks(res.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (task, status) => {
    setUpdatingId(task._id);
    try {
      const res = await api.patch(`/tasks/${task._id}/status`, { status });
      setTasks((list) => list.map((t) => (t._id === task._id ? res.data.data : t)));
      setViewing((v) => (v && v._id === task._id ? res.data.data : v));
      toast.success(status === 'Completed' ? 'Task marked as completed' : 'Task status updated');
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setUpdatingId(null);
    }
  };

  const active = tasks.filter((t) => t.myStatus !== 'Completed');
  const done = tasks.filter((t) => t.myStatus === 'Completed');
  const list = (tab === 'active' ? active : done).filter((t) => !priority || t.priority === priority);

  const tabClass = (name) =>
    `border-b-2 px-4 py-2 text-sm font-medium ${tab === name ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Tasks</h1>
        <p className="mt-1 text-sm text-slate-500">Update your progress as you work. Completed tasks move to history.</p>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex border-b border-slate-200">
          <button className={tabClass('active')} onClick={() => setTab('active')}>Active ({active.length})</button>
          <button className={tabClass('done')} onClick={() => setTab('done')}>History ({done.length})</button>
        </div>
        <select className="input sm:w-44" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading && <div className="card"><TableSkeleton rows={4} cols={3} /></div>}
      {!loading && error && <div className="card"><ErrorState message={error} onRetry={load} /></div>}

      {!loading && !error && list.length === 0 && (
        <div className="card">
          <EmptyState
            icon={tab === 'active' ? ListChecks : CheckCircle2}
            title={priority ? 'No tasks match this priority' : tab === 'active' ? 'No active tasks' : 'No completed tasks yet'}
            description={tab === 'active' ? 'Tasks assigned to you by the administrator will appear here.' : 'Tasks you complete will be listed here.'}
          />
        </div>
      )}

      {!loading && !error && list.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((t) => (
            <div key={t._id} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{t.title}</h2>
                <PriorityBadge priority={t.priority} />
              </div>

              {t.description && <p className="line-clamp-2 text-sm text-slate-600">{t.description}</p>}

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`inline-flex items-center gap-1 ${t.isOverdue ? 'font-medium text-red-600' : 'text-slate-600'}`}>
                  <CalendarClock className="h-4 w-4" /> Due {formatDateUTC(t.deadline)}
                </span>
                <StatusBadge status={t.myStatus} />
                {t.isOverdue && <StatusBadge status="Overdue" />}
                {t.myStatus === 'Completed' && t.myCompletedAt && (
                  <span className="text-xs text-slate-500">Completed {formatDate(t.myCompletedAt)}</span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <label htmlFor={`s-${t._id}`} className="text-xs text-slate-500">Status</label>
                  <select
                    id={`s-${t._id}`} className="input !w-auto !py-1.5" value={t.myStatus}
                    disabled={updatingId === t._id} onChange={(e) => changeStatus(t, e.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button className="btn-secondary !py-1.5" onClick={() => setViewing(t)}>Details</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDetails open={!!viewing} onClose={() => setViewing(null)} task={viewing} mode="employee" />
    </div>
  );
}

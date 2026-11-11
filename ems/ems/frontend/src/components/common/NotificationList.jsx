import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarOff, CheckCheck, ListChecks, Megaphone, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Pagination from '../ui/Pagination';
import TableSkeleton from '../ui/TableSkeleton';
import { formatDateTime } from '../../utils/format';

const ICONS = {
  TASK_ASSIGNED: ListChecks,
  TASK_UPDATED: ListChecks,
  ANNOUNCEMENT: Megaphone,
  LEAVE: CalendarOff,
  SALARY: Wallet,
  GENERAL: Bell,
};

const notifyBell = () => window.dispatchEvent(new Event('notifications:changed'));

// The logged-in user's own notifications (works for both admin and employee).
export default function NotificationList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 15 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/notifications', { params: { page, limit: 15, unread: unreadOnly ? 'true' : undefined } });
      setItems(res.data.data);
      setPagination(res.data.pagination);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => { load(); }, [load]);

  const open = async (n) => {
    if (!n.isRead) {
      try {
        await api.patch(`/notifications/${n._id}/read`);
        setItems((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
        setUnreadCount((c) => Math.max(c - 1, 0));
        notifyBell();
      } catch (err) {
        toast.error(err.userMessage);
        return;
      }
    }
    if (n.link && n.link.startsWith('/')) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read');
      notifyBell();
      load();
    } catch (err) {
      toast.error(err.userMessage);
    }
  };

  return (
    <div className="card">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <button
            className={unreadOnly ? 'btn-secondary' : 'btn-primary'}
            onClick={() => { setUnreadOnly(false); setPage(1); }}
          >All</button>
          <button
            className={unreadOnly ? 'btn-primary' : 'btn-secondary'}
            onClick={() => { setUnreadOnly(true); setPage(1); }}
          >Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}</button>
        </div>
        <button className="btn-secondary" onClick={markAll} disabled={unreadCount === 0}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </button>
      </div>

      {loading && <TableSkeleton rows={5} cols={1} />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description="Task assignments, announcements and other updates will appear here."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <li key={n._id}>
                  <button
                    onClick={() => open(n)}
                    className={`flex w-full items-start gap-4 px-4 py-4 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-primary-50/40'}`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-primary-100 text-primary-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm ${n.isRead ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                        {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-label="Unread" />}
                      </div>
                      {n.message && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{n.message}</p>}
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination {...pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

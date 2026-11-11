import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

export default function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setCount(res.data.data.count);
    } catch {
      // The bell is passive: failures are ignored (a 401 is handled globally in api.js).
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('notifications:changed', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('notifications:changed', refresh);
    };
  }, [refresh]);

  const to = user?.role === 'ADMIN' ? '/admin/notifications' : '/employee/notifications';

  return (
    <Link
      to={to}
      className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

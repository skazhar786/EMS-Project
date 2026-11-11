import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BadgeCheck, Bell, Briefcase, Building2, CalendarDays, CalendarOff, CheckCircle2, ClipboardList, Clock, ListChecks, Wallet,
} from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import RecentList from '../../components/dashboard/RecentList';
import StatTile from '../../components/dashboard/StatTile';
import ErrorState from '../../components/ui/ErrorState';
import PriorityBadge from '../../components/ui/PriorityBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatClock, formatDate, formatDateTime, formatDateUTC, MONTH_NAMES } from '../../utils/format';
import { formatMoney } from '../../utils/money';

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="skeleton h-40" />
    </div>
  );
}

export default function EmployeeDashboard() {
  const { employee: me } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/employee');
      setData(res.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const header = (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Welcome, {me.fullName}</h1>
      <p className="mt-1 text-sm text-slate-500">Here is a summary of your work, attendance, leave and salary.</p>
    </div>
  );

  if (loading && !data) return <div className="space-y-6">{header}<Skeleton /></div>;
  if (error) return <div className="space-y-6">{header}<div className="card"><ErrorState message={error} onRetry={load} /></div></div>;

  const { profile, attendance, tasks, leave, salary, notifications } = data;
  const today = attendance.today;
  const latest = salary.latest;

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={BadgeCheck} label="Employee ID" value={profile.employeeId} />
        <StatTile icon={Building2} label="Department" value={profile.department || 'Not assigned'} tone="blue" />
        <StatTile icon={Briefcase} label="Designation" value={profile.designation || '—'} tone="slate" />
        <StatTile icon={CalendarDays} label="Joined" value={formatDate(profile.joiningDate)} tone="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Clock className="h-4 w-4" /> Today's attendance</h2>
            <Link to="/employee/attendance" className="text-sm font-medium text-primary-600 hover:underline">Open attendance</Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span>Status: <StatusBadge status={today ? today.status : 'Not checked in'} /></span>
            <span className="text-slate-600">Check-in: <strong className="text-slate-900">{formatClock(today?.checkInTime)}</strong></span>
            <span className="text-slate-600">Check-out: <strong className="text-slate-900">{formatClock(today?.checkOutTime)}</strong></span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
            {[
              ['Present days', attendance.month.present, 'text-emerald-600'],
              ['Absent days', attendance.month.absent, 'text-red-600'],
              ['Late arrivals', attendance.month.late, 'text-amber-600'],
              ['Leave days', attendance.month.leave, 'text-blue-600'],
            ].map(([label, value, tone]) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label} (this month)</p>
                <p className={`text-xl font-semibold ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Wallet className="h-4 w-4" /> Latest salary</h2>
            <Link to="/employee/salary" className="text-sm font-medium text-primary-600 hover:underline">Details</Link>
          </div>
          {latest ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{MONTH_NAMES[latest.month - 1]} {latest.year}</p>
              <p className="mt-1 text-3xl font-semibold text-primary-700">{formatMoney(latest.net)}</p>
              <p className="mt-1 text-xs text-slate-500">Gross {formatMoney(latest.gross)} · Deductions {formatMoney(latest.totalDeductions)}</p>
              <div className="mt-3"><StatusBadge status={latest.status} /></div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No payslip yet.{salary.structureNet !== null && <> Your monthly net salary is {formatMoney(salary.structureNet)}.</>}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={ClipboardList} label="Assigned tasks" value={tasks.assigned} to="/employee/tasks" />
        <StatTile icon={CheckCircle2} label="Completed tasks" value={tasks.completed} tone="emerald" to="/employee/tasks" />
        <StatTile icon={ListChecks} label="Pending tasks" value={tasks.pending} tone="amber" to="/employee/tasks" />
        <StatTile icon={AlertTriangle} label="Overdue tasks" value={tasks.overdue} tone={tasks.overdue ? 'red' : 'slate'} to="/employee/tasks" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={CalendarOff} label="Casual leave left" value={leave.balance.casual} tone="blue" to="/employee/leaves" />
        <StatTile icon={CalendarOff} label="Sick leave left" value={leave.balance.sick} tone="blue" to="/employee/leaves" />
        <StatTile icon={CalendarOff} label="Earned leave left" value={leave.balance.earned} tone="blue" to="/employee/leaves" />
        <StatTile icon={CalendarOff} label="Pending leave requests" value={leave.pending} tone="amber" to="/employee/leaves" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentList title="Upcoming tasks" items={tasks.upcoming} emptyText="No open tasks. Enjoy the quiet!"
          renderItem={(t) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                <p className="text-xs text-slate-500">Due {formatDateUTC(t.deadline)} · {t.myStatus}</p>
              </div>
              <PriorityBadge priority={t.priority} />
            </div>
          )} />

        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Bell className="h-4 w-4" /> Recent notifications
              {notifications.unreadCount > 0 && <span className="badge bg-red-50 text-red-700">{notifications.unreadCount} new</span>}
            </h2>
            <Link to="/employee/notifications" className="text-sm font-medium text-primary-600 hover:underline">View all</Link>
          </div>
          {notifications.items.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.items.map((n) => (
                <li key={n._id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-primary-600'}`} aria-label={n.isRead ? undefined : 'Unread'} />
                  <div className="min-w-0">
                    <p className={`truncate text-sm ${n.isRead ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                    {n.message && <p className="line-clamp-1 text-xs text-slate-500">{n.message}</p>}
                    <p className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

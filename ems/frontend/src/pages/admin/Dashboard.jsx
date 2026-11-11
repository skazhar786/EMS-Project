import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Building2, CalendarOff, CheckCircle2, ClipboardList, ListChecks, UserCheck, UserMinus, UserX, Users, Wallet, UserRoundCheck,
} from 'lucide-react';
import api from '../../services/api';
import ChartCard from '../../components/dashboard/ChartCard';
import RecentList from '../../components/dashboard/RecentList';
import StatTile from '../../components/dashboard/StatTile';
import ErrorState from '../../components/ui/ErrorState';
import PriorityBadge from '../../components/ui/PriorityBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatDateUTC, MONTH_NAMES } from '../../utils/format';
import { LEAVE_LABELS } from '../../utils/leave';
import { formatMoney } from '../../utils/money';

const COLORS = { primary: '#4f46e5', emerald: '#10b981', amber: '#f59e0b', orange: '#f97316', red: '#ef4444', slate: '#94a3b8', blue: '#3b82f6' };
const TASK_COLORS = { Pending: COLORS.slate, 'In Progress': COLORS.blue, Completed: COLORS.emerald, Overdue: COLORS.red };
const axis = { fontSize: 12, fill: '#64748b' };
const compactMoney = (v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`);
const hasData = (rows, keys) => rows.some((r) => keys.some((k) => r[k] > 0));

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-80" />)}
      </div>
    </div>
  );
}

function GettingStarted() {
  const steps = [
    ['1', 'Create departments', '/admin/departments'],
    ['2', 'Add employees', '/admin/employees'],
    ['3', 'Set up salary structures', '/admin/payroll'],
  ];
  return (
    <div className="card border-primary-200 bg-primary-50/40 p-6">
      <h2 className="text-base font-semibold text-slate-900">Welcome! Your system is empty</h2>
      <p className="mt-1 text-sm text-slate-600">
        All the numbers and charts below are calculated from your data, so they start at zero. Get going with these steps:
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {steps.map(([n, label, to]) => (
          <Link key={to} to={to} className="btn-secondary">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">{n}</span> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/admin');
      setData(res.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="space-y-6"><h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1><DashboardSkeleton /></div>;
  if (error) return <div className="card"><ErrorState message={error} onRetry={load} /></div>;

  const { stats, charts, recent } = data;
  const taskTotal = charts.taskStatus.reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Live overview of your organization. Figures are calculated from your database.</p>
      </div>

      {stats.totalEmployees === 0 && <GettingStarted />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Total employees" value={stats.totalEmployees} to="/admin/employees" />
        <StatTile icon={UserCheck} label="Active employees" value={stats.activeEmployees} tone="emerald" />
        <StatTile icon={UserMinus} label="Inactive employees" value={stats.inactiveEmployees} tone="slate" />
        <StatTile icon={Building2} label="Departments" value={stats.totalDepartments} tone="blue" to="/admin/departments" />
        <StatTile icon={UserRoundCheck} label="Present today" value={stats.presentToday} tone="emerald" to="/admin/attendance"
          hint={stats.isWeeklyOff ? 'Weekly off today' : undefined} />
        <StatTile icon={UserX} label="Absent today" value={stats.absentToday} tone="red" to="/admin/attendance"
          hint={stats.isWeeklyOff ? 'Weekly off today' : `Not checked in${stats.onLeaveToday ? ` · ${stats.onLeaveToday} on leave` : ''}`} />
        <StatTile icon={CalendarOff} label="Pending leave requests" value={stats.pendingLeaves} tone="amber" to="/admin/leaves" />
        <StatTile icon={Wallet} label={`Payroll (${stats.payrollMonthLabel})`} value={formatMoney(stats.monthlyPayroll)} tone="indigo" to="/admin/payroll"
          hint={stats.monthlyPayrollCount ? `${formatMoney(stats.monthlyPayrollPaid)} paid` : 'Not generated yet'} />
        <StatTile icon={ClipboardList} label="Total assigned tasks" value={stats.totalTasks} to="/admin/tasks" />
        <StatTile icon={CheckCircle2} label="Completed tasks" value={stats.completedTasks} tone="emerald" />
        <StatTile icon={ListChecks} label="Pending tasks" value={stats.pendingTasks} tone="amber"
          hint={stats.overdueTasks ? `${stats.overdueTasks} overdue` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Employees by department" subtitle="Active employees" isEmpty={charts.departmentDistribution.length === 0}
          emptyText="Add employees and assign departments to see the distribution.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.departmentDistribution} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={axis} />
              <YAxis type="category" dataKey="name" width={110} tick={axis} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="count" name="Employees" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly attendance" subtitle="Recorded check-ins, last 6 months" isEmpty={!hasData(charts.attendanceMonthly, ['present', 'late', 'halfDay'])}
          emptyText="Attendance will appear here once employees start checking in.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.attendanceMonthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={axis} />
              <YAxis allowDecimals={false} tick={axis} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Legend />
              <Bar dataKey="present" name="Present" stackId="a" fill={COLORS.emerald} />
              <Bar dataKey="late" name="Late" stackId="a" fill={COLORS.amber} />
              <Bar dataKey="halfDay" name="Half-day" stackId="a" fill={COLORS.orange} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Task status" subtitle={`${taskTotal} task(s) in total`} isEmpty={taskTotal === 0}
          emptyText="Create and assign tasks to see their progress here.">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={charts.taskStatus.filter((t) => t.value > 0)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {charts.taskStatus.filter((t) => t.value > 0).map((t) => <Cell key={t.name} fill={TASK_COLORS[t.name]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Salary expenditure" subtitle="Net payroll per month, last 6 months" isEmpty={!hasData(charts.salaryMonthly, ['net'])}
          emptyText="Generate payroll to see monthly salary expenditure.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.salaryMonthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={axis} />
              <YAxis tick={axis} tickFormatter={compactMoney} width={56} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="net" name="Payroll (net)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="Paid" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Employee joining trend" subtitle="New joiners per month, last 12 months" height={240} isEmpty={!hasData(charts.joiningTrend, ['count'])}
            emptyText="No employees joined in the last 12 months.">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.joiningTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={axis} />
                <YAxis allowDecimals={false} tick={axis} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Joined" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent activity</h2>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <RecentList title="Recently added employees" items={recent.employees} emptyText="No employees added yet."
            renderItem={(e) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/admin/employees/${e._id}`} className="truncate text-sm font-medium text-slate-900 hover:underline">{e.fullName}</Link>
                  <p className="truncate text-xs text-slate-500">{e.employeeId}{e.department?.name ? ` · ${e.department.name}` : ''}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(e.createdAt)}</span>
              </div>
            )} />

          <RecentList title="Recently assigned tasks" items={recent.tasks} emptyText="No tasks assigned yet."
            renderItem={(t) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.assigneeCount} assignee(s) · due {formatDateUTC(t.deadline)}</p>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            )} />

          <RecentList title="Recent leave applications" items={recent.leaveApplications} emptyText="No leave applications yet."
            renderItem={(l) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{l.employee?.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{LEAVE_LABELS[l.type]} · {l.days} day(s) · {formatDate(l.createdAt)}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            )} />

          <RecentList title="Recently approved leaves" items={recent.approvedLeaves} emptyText="No leave approved yet."
            renderItem={(l) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{l.employee?.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{LEAVE_LABELS[l.type]} · {formatDateUTC(l.startDate)}{l.startDate !== l.endDate ? ` – ${formatDateUTC(l.endDate)}` : ''}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(l.reviewedAt)}</span>
              </div>
            )} />

          <RecentList title="Recent salary payments" items={recent.salaryPayments} emptyText="No salary marked as paid yet."
            renderItem={(p) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{p.employeeName}</p>
                  <p className="text-xs text-slate-500">{MONTH_NAMES[p.month - 1]} {p.year} · paid {formatDate(p.paidOn)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-900">{formatMoney(p.net)}</span>
              </div>
            )} />
        </div>
      </div>
    </div>
  );
}

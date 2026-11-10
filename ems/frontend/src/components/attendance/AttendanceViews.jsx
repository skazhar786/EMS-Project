import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import { formatClock, formatDateKey, formatHours, WEEKDAYS } from '../../utils/format';

export function StatCard({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export function SummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard label="Present days" value={summary.present} tone="text-emerald-600" />
      <StatCard label="Absent days" value={summary.absent} tone="text-red-600" />
      <StatCard label="Late arrivals" value={summary.late} tone="text-amber-600" />
      <StatCard label="Half days" value={summary.halfDay} tone="text-orange-600" />
      <StatCard label="Hours worked" value={Number(summary.totalHours).toFixed(1)} />
    </div>
  );
}

// days: from buildMonth() on the server (oldest first); shown newest first.
export function DaysTable({ days }) {
  if (days.length === 0) {
    return <EmptyState title="No days to show" description="Nothing to display for this month yet." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Day</th>
            <th className="px-4 py-3 font-medium">Check-in</th>
            <th className="px-4 py-3 font-medium">Check-out</th>
            <th className="px-4 py-3 font-medium">Hours</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[...days].reverse().map((d) => (
            <tr key={d.date} className={d.isWeeklyOff && !d.recordId ? 'bg-slate-50/60' : 'hover:bg-slate-50'}>
              <td className="px-4 py-2.5 text-slate-800">{formatDateKey(d.date)}</td>
              <td className="px-4 py-2.5 text-slate-600">{WEEKDAYS[d.weekday]}</td>
              <td className="px-4 py-2.5 text-slate-700">{formatClock(d.checkInTime)}</td>
              <td className="px-4 py-2.5 text-slate-700">{formatClock(d.checkOutTime)}</td>
              <td className="px-4 py-2.5 text-slate-700">{formatHours(d.workHours)}</td>
              <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

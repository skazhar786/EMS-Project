const STYLES = {
  Active: 'bg-emerald-50 text-emerald-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Paid: 'bg-emerald-50 text-emerald-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Present: 'bg-emerald-50 text-emerald-700',
  Inactive: 'bg-slate-100 text-slate-600',
  Pending: 'bg-amber-50 text-amber-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  Late: 'bg-amber-50 text-amber-700',
  Rejected: 'bg-red-50 text-red-700',
  Overdue: 'bg-red-50 text-red-700',
  Absent: 'bg-red-50 text-red-700',
  'Half-day': 'bg-orange-50 text-orange-700',
  'Not checked in': 'bg-slate-100 text-slate-600',
  'Weekly off': 'bg-slate-100 text-slate-500',
  Upcoming: 'bg-slate-100 text-slate-500',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${STYLES[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}

const STYLES = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-50 text-blue-700',
  High: 'bg-amber-50 text-amber-700',
  Urgent: 'bg-red-50 text-red-700',
};

export default function PriorityBadge({ priority }) {
  return <span className={`badge ${STYLES[priority] || STYLES.Low}`}>{priority}</span>;
}

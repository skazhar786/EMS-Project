import { Link } from 'react-router-dom';

const TONES = {
  indigo: 'bg-primary-50 text-primary-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
  slate: 'bg-slate-100 text-slate-600',
};

// Dashboard statistic card. Pass `to` to make the whole card a link.
export default function StatTile({ icon: Icon, label, value, hint, tone = 'indigo', to }) {
  const body = (
    <div className={`card flex h-full items-start gap-4 p-5 ${to ? 'transition-shadow hover:shadow-md' : ''}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${TONES[tone] || TONES.indigo}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">{body}</Link> : body;
}

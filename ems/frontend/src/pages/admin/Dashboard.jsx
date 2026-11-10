import { Info, Mail, ShieldCheck, Clock } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { formatDateTime } from '../../utils/format';

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back. You are signed in to the administrator portal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard icon={Mail} label="Signed in as" value={user.email} />
        <InfoCard icon={ShieldCheck} label="Role" value="Administrator" />
        <InfoCard icon={Clock} label="Last login" value={formatDateTime(user.lastLogin)} />
      </div>

      <div className="card flex gap-3 p-5 text-sm text-slate-600">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
        <p>
          Statistics, charts and recent activity are built in the analytics phase and will use real data from
          the database. Until then, this page only shows your account details.
        </p>
      </div>
    </div>
  );
}

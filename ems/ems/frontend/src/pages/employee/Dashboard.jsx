import { Info, BadgeCheck, Building2, Briefcase, CalendarDays } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { formatDate } from '../../utils/format';

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

export default function EmployeeDashboard() {
  const { employee } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome, {employee.fullName}</h1>
        <p className="mt-1 text-sm text-slate-500">This is your employee portal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={BadgeCheck} label="Employee ID" value={employee.employeeId} />
        <InfoCard icon={Building2} label="Department" value={employee.department?.name || 'Not assigned'} />
        <InfoCard icon={Briefcase} label="Designation" value={employee.designation || '—'} />
        <InfoCard icon={CalendarDays} label="Joined" value={formatDate(employee.joiningDate)} />
      </div>

      <div className="card flex gap-3 p-5 text-sm text-slate-600">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
        <p>
          Tasks, attendance, leave balance, salary and notifications will appear here as those modules are built.
        </p>
      </div>
    </div>
  );
}

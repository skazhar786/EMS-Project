import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Download, History, Loader2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { downloadFile } from '../../services/download';
import useDebounce from '../../hooks/useDebounce';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import SearchInput from '../../components/ui/SearchInput';
import TableSkeleton from '../../components/ui/TableSkeleton';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import MonthYearPicker from '../../components/attendance/MonthYearPicker';
import { StatCard } from '../../components/attendance/AttendanceViews';
import EmployeeAttendanceModal from '../../components/attendance/EmployeeAttendanceModal';
import AttendanceEditForm from '../../components/forms/AttendanceEditForm';
import { formatClock, formatHours, MONTH_NAMES } from '../../utils/format';

const LIMIT = 15;
// Browser-local "today" as YYYY-MM-DD (the server decides the real office day).
const localToday = () => new Date().toLocaleDateString('en-CA');

function DepartmentSelect({ departments, value, onChange }) {
  return (
    <select className="input lg:w-48" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by department">
      <option value="">All departments</option>
      {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
    </select>
  );
}

// ------------------------------------------------------------------ daily
function DailyOverview({ departments }) {
  const [date, setDate] = useState(localToday());
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [history, setHistory] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/attendance', {
        params: { date, page, limit: LIMIT, department: department || undefined, status: status || undefined, search: debouncedSearch || undefined },
      });
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [date, page, department, status, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [date, department, status, debouncedSearch]);

  const handleSave = async (values) => {
    await api.put('/attendance/manual', { employee: editing.employee._id, date: editing.date, ...values });
    toast.success('Attendance saved');
    setEditing(null);
    load();
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/attendance/${editing.recordId}`);
      toast.success('Attendance record removed');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  const hasFilters = !!(department || status || debouncedSearch);
  const clearFilters = () => { setDepartment(''); setStatus(''); setSearch(''); };
  const counts = data?.counts;
  const rows = data?.rows || [];

  return (
    <div className="space-y-6">
      {counts && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Employees" value={counts.total} />
          <StatCard label="Present" value={counts.present} tone="text-emerald-600" />
          <StatCard label="Late" value={counts.late} tone="text-amber-600" />
          <StatCard label="Half-day" value={counts.halfDay} tone="text-orange-600" />
          <StatCard label="Absent" value={counts.absent} tone="text-red-600" />
          <StatCard label="On leave" value={counts.onLeave} tone="text-blue-600" />
          <StatCard label="Not checked in" value={counts.notCheckedIn} />
        </div>
      )}

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <input type="date" className="input lg:w-44" value={date} max={localToday()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID..." />
          <DepartmentSelect departments={departments} value={department} onChange={setDepartment} />
          <select className="input lg:w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {['Present', 'Late', 'Half-day', 'Absent', 'On leave', 'Not checked in'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && <button className="btn-secondary" onClick={clearFilters}>Clear</button>}
        </div>

        {data?.isWeeklyOff && (
          <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">This date is a weekly off day.</p>
        )}

        {loading && <TableSkeleton rows={6} cols={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && rows.length === 0 && (
          <EmptyState
            icon={CalendarCheck}
            title={hasFilters ? 'No employees match your filters' : 'No employees to show'}
            description={hasFilters ? 'Try changing or clearing the filters.' : 'Active employees who had joined by this date appear here.'}
          />
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Check-in</th>
                    <th className="px-4 py-3 font-medium">Check-out</th>
                    <th className="px-4 py-3 font-medium">Hours</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.employee._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.employee.fullName} src={r.employee.profilePicture} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900">{r.employee.fullName}</p>
                            <p className="text-xs text-slate-500">{r.employee.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.employee.department?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatClock(r.checkInTime)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatClock(r.checkOutTime)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatHours(r.workHours)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                        {r.edited && <span className="ml-2 text-xs text-slate-400">edited</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setHistory(r.employee)} title="Monthly history" aria-label={`History of ${r.employee.fullName}`}>
                            <History className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setEditing(r)} title="Mark or correct" aria-label={`Edit attendance of ${r.employee.fullName}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Mark or correct attendance">
        {editing && (
          <AttendanceEditForm
            key={`${editing.employee._id}-${editing.date}`}
            row={editing}
            onSubmit={handleSave}
            onRemove={() => setConfirmRemove(true)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirmRemove}
        danger
        loading={removing}
        title="Remove attendance record"
        message="This deletes the recorded check-in/out for this day. The day will then count as absent (if it was a working day in the past)."
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(false)}
      />

      <EmployeeAttendanceModal open={!!history} onClose={() => setHistory(null)} employee={history} />
    </div>
  );
}

// ---------------------------------------------------------------- monthly
function MonthlyReport({ departments }) {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState(null);

  const params = { ...period, department: department || undefined, search: debouncedSearch || undefined };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/attendance/report', {
        params: { month: period.month, year: period.year, department: department || undefined, search: debouncedSearch || undefined },
      });
      setRows(res.data.data.rows);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [period, department, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile('/attendance/export', params, `attendance-${period.year}-${String(period.month).padStart(2, '0')}.csv`);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
        <MonthYearPicker month={period.month} year={period.year} onChange={setPeriod} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID..." />
        <DepartmentSelect departments={departments} value={department} onChange={setDepartment} />
        <button className="btn-secondary lg:ml-auto" onClick={exportCsv} disabled={exporting || rows.length === 0}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
        </button>
      </div>

      {loading && <TableSkeleton rows={6} cols={7} />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={CalendarCheck} title="No employees to report" description="Active employees matching the filters appear here." />
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Attendance report for {MONTH_NAMES[period.month - 1]} {period.year}</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Working days</th>
                <th className="px-4 py-3 font-medium">Present</th>
                <th className="px-4 py-3 font-medium">Late</th>
                <th className="px-4 py-3 font-medium">Half-day</th>
                <th className="px-4 py-3 font-medium">Absent</th>
                <th className="px-4 py-3 font-medium">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.employee._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button className="text-left hover:underline" onClick={() => setHistory(r.employee)}>
                      <p className="font-medium text-slate-900">{r.employee.fullName}</p>
                      <p className="text-xs text-slate-500">{r.employee.employeeId}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.employee.department?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.workingDays}</td>
                  <td className="px-4 py-3 font-medium text-emerald-600">{r.present}</td>
                  <td className="px-4 py-3 text-amber-600">{r.late}</td>
                  <td className="px-4 py-3 text-orange-600">{r.halfDay}</td>
                  <td className="px-4 py-3 font-medium text-red-600">{r.absent}</td>
                  <td className="px-4 py-3 text-slate-700">{Number(r.totalHours).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeAttendanceModal open={!!history} onClose={() => setHistory(null)} employee={history} />
    </div>
  );
}

// ------------------------------------------------------------------- page
export default function AdminAttendance() {
  const [tab, setTab] = useState('daily');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data.data)).catch((err) => toast.error(err.userMessage));
  }, []);

  const tabClass = (name) =>
    `border-b-2 px-4 py-2 text-sm font-medium ${tab === name ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">Daily overview, monthly reports, and corrections.</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button className={tabClass('daily')} onClick={() => setTab('daily')}>Daily overview</button>
        <button className={tabClass('report')} onClick={() => setTab('report')}>Monthly report</button>
      </div>

      {tab === 'daily' ? <DailyOverview departments={departments} /> : <MonthlyReport departments={departments} />}
    </div>
  );
}

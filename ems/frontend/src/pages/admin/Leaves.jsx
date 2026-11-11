import { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Eye, History } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import TableSkeleton from '../../components/ui/TableSkeleton';
import Avatar from '../../components/ui/Avatar';
import LeaveReviewModal from '../../components/leaves/LeaveReviewModal';
import EmployeeLeaveModal from '../../components/leaves/EmployeeLeaveModal';
import { formatDate, formatDateUTC } from '../../utils/format';
import { LEAVE_LABELS, LEAVE_TYPES } from '../../utils/leave';

const LIMIT = 10;

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: LIMIT });
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [status, setStatus] = useState('Pending');
  const [type, setType] = useState('');
  const [department, setDepartment] = useState('');
  const [employee, setEmployee] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [reviewing, setReviewing] = useState(null);
  const [historyOf, setHistoryOf] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/leaves', {
        params: {
          page, limit: LIMIT,
          status: status || undefined, type: type || undefined, department: department || undefined,
          employee: employee || undefined, from: from || undefined, to: to || undefined,
        },
      });
      setLeaves(res.data.data);
      setPagination(res.data.pagination);
      setPendingTotal(res.data.pendingTotal);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [page, status, type, department, employee, from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, type, department, employee, from, to]);

  useEffect(() => {
    Promise.all([api.get('/departments'), api.get('/employees/options')])
      .then(([d, e]) => { setDepartments(d.data.data); setEmployees(e.data.data); })
      .catch((err) => toast.error(err.userMessage));
  }, []);

  const hasFilters = !!(type || department || employee || from || to || status !== 'Pending');
  const reset = () => { setStatus('Pending'); setType(''); setDepartment(''); setEmployee(''); setFrom(''); setTo(''); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leave requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review requests and manage balances.{' '}
          {pendingTotal > 0 ? <strong className="text-amber-600">{pendingTotal} request(s) waiting for review.</strong> : 'Nothing is waiting for review.'}
        </p>
      </div>

      <div className="card">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {['Pending', 'Approved', 'Rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="">All leave types</option>
            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{LEAVE_LABELS[t]}</option>)}
          </select>
          <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select className="input" value={employee} onChange={(e) => setEmployee(e.target.value)} aria-label="Filter by employee">
            <option value="">All employees</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.fullName}</option>)}
          </select>
          <div>
            <label htmlFor="from" className="sr-only">Leave on or after</label>
            <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} title="Leave on or after" />
          </div>
          <div>
            <label htmlFor="to" className="sr-only">Leave on or before</label>
            <input id="to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} title="Leave on or before" />
          </div>
          {hasFilters && <button className="btn-secondary" onClick={reset}>Reset filters</button>}
        </div>

        {loading && <TableSkeleton rows={5} cols={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && leaves.length === 0 && (
          <EmptyState
            icon={CalendarOff}
            title={status === 'Pending' && !hasFilters ? 'No pending requests' : 'No leave requests found'}
            description={hasFilters ? 'Try changing or resetting the filters.' : 'New requests from employees will appear here.'}
          />
        )}

        {!loading && !error && leaves.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Dates</th>
                    <th className="px-4 py-3 font-medium">Days</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Applied</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((l) => (
                    <tr key={l._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={l.employee.fullName} src={l.employee.profilePicture} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900">{l.employee.fullName}</p>
                            <p className="text-xs text-slate-500">{l.employee.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{LEAVE_LABELS[l.type]}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateUTC(l.startDate)}{l.startDate !== l.endDate && <> – {formatDateUTC(l.endDate)}</>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{l.days}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(l.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            className={`rounded-lg p-2 hover:bg-slate-100 ${l.status === 'Pending' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => setReviewing(l)} title={l.status === 'Pending' ? 'Review' : 'View'}
                            aria-label={`${l.status === 'Pending' ? 'Review' : 'View'} request of ${l.employee.fullName}`}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setHistoryOf(l.employee._id)} title="Balance and history"
                            aria-label={`Balance and history of ${l.employee.fullName}`}>
                            <History className="h-4 w-4" />
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

      <LeaveReviewModal key={reviewing?._id} leave={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); load(); }} />
      <EmployeeLeaveModal open={!!historyOf} employeeId={historyOf} onClose={() => setHistoryOf(null)} onChanged={load} />
    </div>
  );
}

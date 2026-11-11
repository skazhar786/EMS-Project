import { useCallback, useEffect, useState } from 'react';
import { Check, Download, Eye, FileSpreadsheet, Loader2, Pencil, Play, Trash2, Undo2, Wallet } from 'lucide-react';
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
import SalaryForm from '../../components/forms/SalaryForm';
import PayslipModal from '../../components/payroll/PayslipModal';
import { formatDate, MONTH_NAMES } from '../../utils/format';
import { formatMoney } from '../../utils/money';

const LIMIT = 10;

function DepartmentSelect({ departments, value, onChange }) {
  return (
    <select className="input lg:w-48" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by department">
      <option value="">All departments</option>
      {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
    </select>
  );
}

const IconButton = ({ title, onClick, tone = 'hover:bg-slate-100 hover:text-slate-900', children }) => (
  <button className={`rounded-lg p-2 text-slate-500 ${tone}`} onClick={onClick} title={title} aria-label={title}>{children}</button>
);

// ------------------------------------------------------------- payroll runs
function PayrollRuns({ departments }) {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);

  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'generate' | 'paid' | 'pending' | 'delete', payment? }
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const periodLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;
  const query = { month: period.month, year: period.year, status: status || undefined, department: department || undefined, search: debouncedSearch || undefined };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/payroll/payments', {
        params: {
          month: period.month, year: period.year, page, limit: LIMIT,
          status: status || undefined, department: department || undefined, search: debouncedSearch || undefined,
        },
      });
      setPayments(res.data.data.payments);
      setTotals(res.data.data.totals);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [period, page, status, department, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [period, status, department, debouncedSearch]);

  const runConfirm = async () => {
    setBusy(true);
    try {
      const { kind, payment } = confirm;
      if (kind === 'generate') {
        const res = await api.post('/payroll/generate', { month: period.month, year: period.year, department: department || undefined });
        const { created, alreadyExisting, skippedNoStructure } = res.data.data;
        toast.success(`${created} payslip(s) created. ${alreadyExisting} already existed. ${skippedNoStructure} skipped (no salary structure).`, { duration: 7000 });
      } else if (kind === 'delete') {
        await api.delete(`/payroll/payments/${payment._id}`);
        toast.success('Payslip deleted');
      } else {
        await api.patch(`/payroll/payments/${payment._id}/status`, { status: kind === 'paid' ? 'Paid' : 'Pending' });
        toast.success(kind === 'paid' ? 'Marked as paid. The employee has been notified.' : 'Marked as pending');
      }
      load();
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const saveEdit = async (values) => {
    await api.put(`/payroll/payments/${editing._id}`, values);
    toast.success('Payslip updated');
    setEditing(null);
    load();
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile('/payroll/export', query, `payroll-${period.year}-${String(period.month).padStart(2, '0')}.csv`);
      toast.success('Payroll report downloaded');
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = !!(status || department || debouncedSearch);
  const confirmText = {
    generate: {
      title: `Generate payroll for ${periodLabel}`,
      message: `A Pending payslip will be created for every active employee${department ? ' in the selected department' : ''} who has a salary structure and no payslip for ${periodLabel} yet. Existing payslips are not changed. Employees without a salary structure are skipped.`,
      label: 'Generate', danger: false,
    },
    paid: { title: 'Mark as paid', message: `Mark ${confirm?.payment?.employeeName}'s payslip as paid? The employee will be notified.`, label: 'Mark as paid', danger: false },
    pending: { title: 'Mark as pending', message: `Move ${confirm?.payment?.employeeName}'s payslip back to pending? This lets you edit or delete it.`, label: 'Mark as pending', danger: false },
    delete: { title: 'Delete payslip', message: `Delete ${confirm?.payment?.employeeName}'s pending payslip for ${periodLabel}? You can generate it again.`, label: 'Delete', danger: true },
  }[confirm?.kind || 'generate'];

  return (
    <div className="space-y-6">
      {totals && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Payslips" value={totals.count} />
          <StatCard label="Total gross" value={formatMoney(totals.gross)} />
          <StatCard label="Total net" value={formatMoney(totals.net)} tone="text-primary-700" />
          <StatCard label={`Paid (${totals.paidCount})`} value={formatMoney(totals.paidNet)} tone="text-emerald-600" />
          <StatCard label={`Pending (${totals.pendingCount})`} value={formatMoney(totals.pendingNet)} tone="text-amber-600" />
        </div>
      )}

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <MonthYearPicker month={period.month} year={period.year} onChange={setPeriod} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID..." />
          <DepartmentSelect departments={departments} value={department} onChange={setDepartment} />
          <select className="input lg:w-36" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
          <div className="flex gap-2 lg:ml-auto">
            <button className="btn-secondary" onClick={exportCsv} disabled={exporting || !totals?.count}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
            </button>
            <button className="btn-primary" onClick={() => setConfirm({ kind: 'generate' })}>
              <Play className="h-4 w-4" /> Generate payroll
            </button>
          </div>
        </div>

        {loading && <TableSkeleton rows={6} cols={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && payments.length === 0 && (
          <EmptyState
            icon={Wallet}
            title={hasFilters ? 'No payslips match your filters' : `No payroll for ${periodLabel} yet`}
            description={hasFilters ? 'Try changing or clearing the filters.' : 'Set up salary structures in the “Salary structures” tab, then click “Generate payroll”.'}
          />
        )}

        {!loading && !error && payments.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Gross</th>
                    <th className="px-4 py-3 font-medium">Deductions</th>
                    <th className="px-4 py-3 font-medium">Net</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Paid on</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.employeeName} src={p.employee?.profilePicture} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900">{p.employeeName}</p>
                            <p className="text-xs text-slate-500">{p.employeeCode}{p.departmentName ? ` · ${p.departmentName}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatMoney(p.gross)}</td>
                      <td className="px-4 py-3 text-red-600">{formatMoney(p.totalDeductions)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(p.net)}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-slate-700">{p.paidOn ? formatDate(p.paidOn) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconButton title={`View payslip of ${p.employeeName}`} onClick={() => setViewing(p)}><Eye className="h-4 w-4" /></IconButton>
                          {p.status === 'Pending' ? (
                            <>
                              <IconButton title={`Edit payslip of ${p.employeeName}`} onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></IconButton>
                              <IconButton title={`Mark ${p.employeeName} as paid`} tone="hover:bg-emerald-50 hover:text-emerald-600" onClick={() => setConfirm({ kind: 'paid', payment: p })}><Check className="h-4 w-4" /></IconButton>
                              <IconButton title={`Delete payslip of ${p.employeeName}`} tone="hover:bg-red-50 hover:text-red-600" onClick={() => setConfirm({ kind: 'delete', payment: p })}><Trash2 className="h-4 w-4" /></IconButton>
                            </>
                          ) : (
                            <IconButton title={`Mark ${p.employeeName} as pending`} tone="hover:bg-amber-50 hover:text-amber-600" onClick={() => setConfirm({ kind: 'pending', payment: p })}><Undo2 className="h-4 w-4" /></IconButton>
                          )}
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

      <PayslipModal payment={viewing} onClose={() => setViewing(null)} />

      <Modal open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing ? `Adjust payslip: ${editing.employeeName}` : 'Adjust payslip'}>
        {editing && (
          <SalaryForm
            key={editing._id}
            initial={editing}
            showRemarks
            initialRemarks={editing.remarks}
            submitLabel="Save payslip"
            onSubmit={saveEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        danger={confirmText.danger}
        loading={busy}
        title={confirmText.title}
        message={confirmText.message}
        confirmLabel={confirmText.label}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

// -------------------------------------------------------- salary structures
function Structures({ departments, defaults }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [department, setDepartment] = useState('');
  const [configured, setConfigured] = useState('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/payroll/structures', {
        params: { page, limit: LIMIT, search: debouncedSearch || undefined, department: department || undefined, configured: configured || undefined },
      });
      setRows(res.data.data.rows);
      setCounts(res.data.data.counts);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, department, configured]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, department, configured]);

  const save = async (values) => {
    await api.put(`/payroll/structures/${editing.employee._id}`, values);
    toast.success('Salary structure saved. The employee has been notified.');
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      {counts && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Active employees" value={counts.total} />
          <StatCard label="Structure set" value={counts.configured} tone="text-emerald-600" />
          <StatCard label="Missing structure" value={counts.missing} tone={counts.missing ? 'text-amber-600' : 'text-slate-900'} />
        </div>
      )}

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID..." />
          <DepartmentSelect departments={departments} value={department} onChange={setDepartment} />
          <select className="input lg:w-48" value={configured} onChange={(e) => setConfigured(e.target.value)} aria-label="Filter by structure">
            <option value="">All employees</option>
            <option value="yes">Structure set</option>
            <option value="no">Missing structure</option>
          </select>
        </div>

        {loading && <TableSkeleton rows={6} cols={5} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && rows.length === 0 && (
          <EmptyState icon={FileSpreadsheet} title="No employees found" description="Active employees appear here so you can set up their salary structure." />
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Basic</th>
                    <th className="px-4 py-3 font-medium">Gross</th>
                    <th className="px-4 py-3 font-medium">Net</th>
                    <th className="px-4 py-3 font-medium">Structure</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
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
                            <p className="text-xs text-slate-500">{r.employee.employeeId}{r.employee.department?.name ? ` · ${r.employee.department.name}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.structure ? formatMoney(r.structure.basic) : '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{r.totals ? formatMoney(r.totals.gross) : '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.totals ? formatMoney(r.totals.net) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${r.structure ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {r.structure ? 'Set' : 'Not set'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button className={r.structure ? 'btn-secondary !py-1.5' : 'btn-primary !py-1.5'} onClick={() => setEditing(r)}>
                            <Pencil className="h-4 w-4" /> {r.structure ? 'Edit' : 'Set up'}
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

      <Modal open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing ? `Salary structure: ${editing.employee.fullName}` : 'Salary structure'}>
        {editing && (
          <SalaryForm
            key={editing.employee._id}
            initial={editing.structure || { basic: editing.currentBasic || '' }}
            defaults={defaults}
            submitLabel="Save structure"
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// -------------------------------------------------------------------- page
export default function AdminPayroll() {
  const [tab, setTab] = useState('runs');
  const [departments, setDepartments] = useState([]);
  const [defaults, setDefaults] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/departments'), api.get('/payroll/defaults')])
      .then(([d, p]) => { setDepartments(d.data.data); setDefaults(p.data.data); })
      .catch((err) => toast.error(err.userMessage));
  }, []);

  const tabClass = (name) =>
    `border-b-2 px-4 py-2 text-sm font-medium ${tab === name ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payroll</h1>
        <p className="mt-1 text-sm text-slate-500">
          Salary structures, monthly payroll and payslips. This is a project-level payroll system, not a legally certified tax or statutory engine.
        </p>
      </div>

      <div className="flex border-b border-slate-200">
        <button className={tabClass('runs')} onClick={() => setTab('runs')}>Payroll runs</button>
        <button className={tabClass('structures')} onClick={() => setTab('structures')}>Salary structures</button>
      </div>

      {tab === 'runs' ? <PayrollRuns departments={departments} /> : <Structures departments={departments} defaults={defaults} />}
    </div>
  );
}

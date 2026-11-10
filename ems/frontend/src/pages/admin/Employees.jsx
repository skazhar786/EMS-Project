import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Plus, Power, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
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
import EmployeeForm from '../../components/forms/EmployeeForm';
import { formatDate } from '../../utils/format';

const LIMIT = 10;

function SortHeader({ label, field, sortBy, order, onSort }) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="px-4 py-3 font-medium">
      <button className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900" onClick={() => onSort(field)}>
        {label} <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary-600' : ''}`} />
      </button>
    </th>
  );
}

export default function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState({ sortBy: 'createdAt', order: 'desc' });
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState({ open: false, employee: null });
  const [confirm, setConfirm] = useState(null); // { kind: 'delete' | 'status', employee }
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/employees', {
        params: {
          page, limit: LIMIT, sortBy: sort.sortBy, order: sort.order,
          search: debouncedSearch || undefined,
          department: department || undefined,
          designation: designation || undefined,
          status: status || undefined,
        },
      });
      setEmployees(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedSearch, department, designation, status]);

  useEffect(() => { load(); }, [load]);

  const loadFilterData = useCallback(async () => {
    try {
      const [d, g] = await Promise.all([api.get('/departments'), api.get('/employees/designations')]);
      setDepartments(d.data.data);
      setDesignations(g.data.data);
    } catch (err) {
      toast.error(err.userMessage);
    }
  }, []);

  useEffect(() => { loadFilterData(); }, [loadFilterData]);

  // Any filter change returns to the first page.
  useEffect(() => { setPage(1); }, [debouncedSearch, department, designation, status]);

  const handleSort = (field) =>
    setSort((s) => (s.sortBy === field ? { sortBy: field, order: s.order === 'asc' ? 'desc' : 'asc' } : { sortBy: field, order: 'asc' }));

  const closeModal = () => setModal({ open: false, employee: null });

  const handleSave = async (values) => {
    if (modal.employee) {
      await api.put(`/employees/${modal.employee._id}`, values);
      toast.success('Employee updated');
    } else {
      const res = await api.post('/employees', values);
      toast.success(res.data.message);
    }
    closeModal();
    load();
    loadFilterData(); // a new designation may now exist
  };

  const runConfirm = async () => {
    const { kind, employee } = confirm;
    setConfirming(true);
    try {
      if (kind === 'delete') {
        await api.delete(`/employees/${employee._id}`);
        toast.success('Employee deleted');
        if (employees.length === 1 && page > 1) setPage(page - 1);
        else load();
      } else {
        const next = employee.status === 'Active' ? 'Inactive' : 'Active';
        await api.patch(`/employees/${employee._id}/status`, { status: next });
        toast.success(`Employee ${next === 'Active' ? 'activated' : 'deactivated'}`);
        load();
      }
      loadFilterData();
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setConfirming(false);
      setConfirm(null);
    }
  };

  const hasFilters = !!(debouncedSearch || department || designation || status);
  const clearFilters = () => { setSearch(''); setDepartment(''); setDesignation(''); setStatus(''); };
  const noData = !loading && !error && employees.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">Add, search and manage all employees.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, employee: null })}>
          <Plus className="h-4 w-4" /> Add employee
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, ID, email, phone..." />
          <select className="input lg:w-44" value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select className="input lg:w-44" value={designation} onChange={(e) => setDesignation(e.target.value)} aria-label="Filter by designation">
            <option value="">All designations</option>
            {designations.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="input lg:w-36" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          {hasFilters && <button className="btn-secondary" onClick={clearFilters}>Clear</button>}
        </div>

        {loading && <TableSkeleton rows={6} cols={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {noData && (
          <EmptyState
            icon={Users}
            title={hasFilters ? 'No employees match your filters' : 'No employees yet'}
            description={hasFilters ? 'Try changing or clearing the filters.' : 'Add your first employee to get started. Departments can be created from the Departments page.'}
            action={hasFilters
              ? <button className="btn-secondary" onClick={clearFilters}>Clear filters</button>
              : <button className="btn-primary" onClick={() => setModal({ open: true, employee: null })}><Plus className="h-4 w-4" /> Add employee</button>}
          />
        )}

        {!loading && !error && employees.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <SortHeader label="Employee" field="fullName" {...sort} onSort={handleSort} />
                    <SortHeader label="ID" field="employeeId" {...sort} onSort={handleSort} />
                    <th className="px-4 py-3 font-medium uppercase tracking-wide">Department</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wide">Designation</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wide">Status</th>
                    <SortHeader label="Joined" field="joiningDate" {...sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((e) => (
                    <tr key={e._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.fullName} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {e.fullName}
                              {e.isSample && <span className="badge ml-2 bg-violet-50 text-violet-700">Sample</span>}
                            </p>
                            <p className="truncate text-xs text-slate-500">{e.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{e.employeeId}</td>
                      <td className="px-4 py-3 text-slate-700">{e.department?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{e.designation || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(e.joiningDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => navigate(`/admin/employees/${e._id}`)} title="View" aria-label={`View ${e.fullName}`}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setModal({ open: true, employee: e })} title="Edit" aria-label={`Edit ${e.fullName}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                            onClick={() => setConfirm({ kind: 'status', employee: e })}
                            title={e.status === 'Active' ? 'Deactivate' : 'Activate'}
                            aria-label={`${e.status === 'Active' ? 'Deactivate' : 'Activate'} ${e.fullName}`}>
                            <Power className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setConfirm({ kind: 'delete', employee: e })} title="Delete" aria-label={`Delete ${e.fullName}`}>
                            <Trash2 className="h-4 w-4" />
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

      <Modal open={modal.open} onClose={closeModal} size="lg" title={modal.employee ? `Edit ${modal.employee.fullName}` : 'Add employee'}>
        <EmployeeForm
          key={modal.employee?._id || 'new'}
          employee={modal.employee}
          departments={departments}
          onSubmit={handleSave}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        danger={confirm?.kind === 'delete' || confirm?.employee?.status === 'Active'}
        loading={confirming}
        title={confirm?.kind === 'delete' ? 'Delete employee' : confirm?.employee?.status === 'Active' ? 'Deactivate employee' : 'Activate employee'}
        message={
          confirm?.kind === 'delete'
            ? `Permanently delete ${confirm?.employee?.fullName} (${confirm?.employee?.employeeId}) and their login account? This cannot be undone. Consider deactivating instead.`
            : confirm?.employee?.status === 'Active'
              ? `${confirm?.employee?.fullName} will no longer be able to log in. You can activate them again later.`
              : `Allow ${confirm?.employee?.fullName} to log in again?`
        }
        confirmLabel={confirm?.kind === 'delete' ? 'Delete' : confirm?.employee?.status === 'Active' ? 'Deactivate' : 'Activate'}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

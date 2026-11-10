import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
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
import PriorityBadge from '../../components/ui/PriorityBadge';
import Avatar from '../../components/ui/Avatar';
import TaskForm from '../../components/forms/TaskForm';
import TaskDetails from '../../components/tasks/TaskDetails';
import { formatDateUTC } from '../../utils/format';

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

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [employee, setEmployee] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState({ sortBy: 'createdAt', order: 'desc' });
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState({ open: false, task: null });
  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tasks', {
        params: {
          page, limit: LIMIT, sortBy: sort.sortBy, order: sort.order,
          search: debouncedSearch || undefined,
          employee: employee || undefined,
          priority: priority || undefined,
          status: status || undefined,
        },
      });
      setTasks(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedSearch, employee, priority, status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/employees/options').then((res) => setEmployees(res.data.data)).catch((err) => toast.error(err.userMessage));
  }, []);

  useEffect(() => { setPage(1); }, [debouncedSearch, employee, priority, status]);

  const handleSort = (field) =>
    setSort((s) => (s.sortBy === field ? { sortBy: field, order: s.order === 'asc' ? 'desc' : 'asc' } : { sortBy: field, order: 'asc' }));

  const closeModal = () => setModal({ open: false, task: null });

  const handleSave = async (values) => {
    if (modal.task) {
      await api.put(`/tasks/${modal.task._id}`, values);
      toast.success('Task updated');
    } else {
      const res = await api.post('/tasks', values);
      toast.success(res.data.message);
    }
    closeModal();
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${toDelete._id}`);
      toast.success('Task deleted');
      if (tasks.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const hasFilters = !!(debouncedSearch || employee || priority || status);
  const clearFilters = () => { setSearch(''); setEmployee(''); setPriority(''); setStatus(''); };
  const noData = !loading && !error && tasks.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">Assign work to employees and track its progress.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, task: null })}>
          <Plus className="h-4 w-4" /> Create task
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search task title..." />
          <select className="input lg:w-48" value={employee} onChange={(e) => setEmployee(e.target.value)} aria-label="Filter by employee">
            <option value="">All employees</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.fullName}</option>)}
          </select>
          <select className="input lg:w-36" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="input lg:w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {['Pending', 'In Progress', 'Completed', 'Overdue'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && <button className="btn-secondary" onClick={clearFilters}>Clear</button>}
        </div>

        {loading && <TableSkeleton rows={6} cols={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {noData && (
          <EmptyState
            icon={ListChecks}
            title={hasFilters ? 'No tasks match your filters' : 'No tasks yet'}
            description={hasFilters ? 'Try changing or clearing the filters.' : 'Create a task and assign it to one or more employees.'}
            action={hasFilters
              ? <button className="btn-secondary" onClick={clearFilters}>Clear filters</button>
              : <button className="btn-primary" onClick={() => setModal({ open: true, task: null })}><Plus className="h-4 w-4" /> Create task</button>}
          />
        )}

        {!loading && !error && tasks.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <SortHeader label="Task" field="title" {...sort} onSort={handleSort} />
                    <th className="px-4 py-3 font-medium uppercase tracking-wide">Assigned to</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wide">Priority</th>
                    <SortHeader label="Deadline" field="deadline" {...sort} onSort={handleSort} />
                    <th className="px-4 py-3 font-medium uppercase tracking-wide">Progress</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50">
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate font-medium text-slate-900">{t.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {t.assignees.slice(0, 3).map((a) => (
                              <div key={a.employee._id} className="rounded-full ring-2 ring-white" title={a.employee.fullName}>
                                <Avatar name={a.employee.fullName} src={a.employee.profilePicture} size="sm" />
                              </div>
                            ))}
                          </div>
                          <span className="ml-2 text-xs text-slate-500">
                            {t.assignees.length === 1 ? t.assignees[0].employee.fullName : `${t.assignees.length} employees`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className={`px-4 py-3 ${t.isOverdue ? 'font-medium text-red-600' : 'text-slate-700'}`}>{formatDateUTC(t.deadline)}</td>
                      <td className="px-4 py-3 text-slate-700">{t.progress.done}/{t.progress.total}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge status={t.status} />
                          {t.isOverdue && <StatusBadge status="Overdue" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setViewing(t)} title="View" aria-label={`View ${t.title}`}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setModal({ open: true, task: t })} title="Edit" aria-label={`Edit ${t.title}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setToDelete(t)} title="Delete" aria-label={`Delete ${t.title}`}>
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

      <Modal open={modal.open} onClose={closeModal} size="lg" title={modal.task ? 'Edit task' : 'Create task'}>
        <TaskForm key={modal.task?._id || 'new'} task={modal.task} employees={employees} onSubmit={handleSave} onCancel={closeModal} />
      </Modal>

      <TaskDetails open={!!viewing} onClose={() => setViewing(null)} task={viewing} mode="admin" />

      <ConfirmDialog
        open={!!toDelete}
        danger
        loading={deleting}
        title="Delete task"
        message={`Delete "${toDelete?.title}"? It will disappear from every assigned employee. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

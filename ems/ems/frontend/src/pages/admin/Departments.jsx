import { useCallback, useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import SearchInput from '../../components/ui/SearchInput';
import TableSkeleton from '../../components/ui/TableSkeleton';
import DepartmentForm from '../../components/forms/DepartmentForm';
import { formatDate } from '../../utils/format';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const [modal, setModal] = useState({ open: false, department: null });
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/departments', { params: { search: debouncedSearch || undefined } });
      setDepartments(res.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  // Active employees that can be chosen as a manager.
  const loadManagers = useCallback(async () => {
    try {
      const res = await api.get('/employees/options');
      setManagers(res.data.data);
    } catch (err) {
      toast.error(err.userMessage);
    }
  }, []);

  useEffect(() => { loadManagers(); }, [loadManagers]);

  const openCreate = () => setModal({ open: true, department: null });
  const openEdit = (department) => setModal({ open: true, department });
  const closeModal = () => setModal({ open: false, department: null });

  const handleSave = async (values) => {
    const payload = { name: values.name, description: values.description, manager: values.manager };
    if (modal.department) {
      await api.put(`/departments/${modal.department._id}`, payload);
      toast.success('Department updated');
    } else {
      await api.post('/departments', payload);
      toast.success('Department created');
    }
    closeModal();
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/departments/${toDelete._id}`);
      toast.success('Department deleted');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(err.userMessage);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const noData = !loading && !error && departments.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          <p className="mt-1 text-sm text-slate-500">Organize employees into departments and assign managers.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add department
        </button>
      </div>

      <div className="card">
        <div className="border-b border-slate-200 p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search departments..." />
        </div>

        {loading && <TableSkeleton rows={5} cols={5} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {noData && (
          <EmptyState
            icon={Building2}
            title={debouncedSearch ? 'No departments match your search' : 'No departments yet'}
            description={debouncedSearch ? 'Try a different search term.' : 'Create your first department to start organizing employees.'}
            action={!debouncedSearch && (
              <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add department</button>
            )}
          />
        )}

        {!loading && !error && departments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Employees</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{d.name}</p>
                      {d.description && <p className="max-w-xs truncate text-xs text-slate-500">{d.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{d.manager ? d.manager.fullName : '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{d.employeeCount}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => openEdit(d)} title="Edit" aria-label={`Edit ${d.name}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setToDelete(d)} title="Delete" aria-label={`Delete ${d.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal.open} onClose={closeModal} title={modal.department ? 'Edit department' : 'Add department'}>
        <DepartmentForm
          key={modal.department?._id || 'new'}
          department={modal.department}
          managers={managers}
          onSubmit={handleSave}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        loading={deleting}
        title="Delete department"
        message={`Are you sure you want to delete "${toDelete?.name}"? This cannot be undone. Departments that still have employees cannot be deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

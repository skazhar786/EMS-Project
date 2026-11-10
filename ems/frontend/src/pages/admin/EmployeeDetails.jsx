import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ErrorState from '../../components/ui/ErrorState';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import PageLoader from '../../components/common/PageLoader';
import EmployeeForm from '../../components/forms/EmployeeForm';
import { formatDate, formatDateTime } from '../../utils/format';

function Section({ title, children }) {
  return (
    <div className="card p-6">
      <h2 className="mb-2 text-base font-semibold text-slate-900">{title}</h2>
      <dl>{children}</dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-3 text-sm last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value || value === 0 ? value : '—'}</dd>
    </div>
  );
}

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function EmployeeDetails() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [e, d] = await Promise.all([api.get(`/employees/${id}`), api.get('/departments')]);
      setEmployee(e.data.data);
      setDepartments(d.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (values) => {
    await api.put(`/employees/${id}`, values);
    toast.success('Employee updated');
    setEditing(false);
    load();
  };

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const next = employee.status === 'Active' ? 'Inactive' : 'Active';
      await api.patch(`/employees/${id}/status`, { status: next });
      toast.success(`Employee ${next === 'Active' ? 'activated' : 'deactivated'}`);
      setConfirmStatus(false);
      load();
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !employee) return <PageLoader label="Loading employee..." />;

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/admin/employees" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to employees
        </Link>
        <div className="card"><ErrorState message={error} onRetry={load} /></div>
      </div>
    );
  }

  const isActive = employee.status === 'Active';

  return (
    <div className="space-y-6">
      <Link to="/admin/employees" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={employee.fullName} src={employee.profilePicture || undefined} size="lg" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {employee.fullName}
              {employee.isSample && <span className="badge ml-2 bg-violet-50 text-violet-700">Sample</span>}
            </h1>
            <p className="text-sm text-slate-500">
              {employee.employeeId} · {employee.designation || 'No designation'}
            </p>
            <div className="mt-2"><StatusBadge status={employee.status} /></div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button className={isActive ? 'btn-danger' : 'btn-primary'} onClick={() => setConfirmStatus(true)}>
            <Power className="h-4 w-4" /> {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Personal information">
          <Row label="Email" value={employee.user?.email} />
          <Row label="Phone" value={employee.phone} />
          <Row label="Gender" value={employee.gender} />
          <Row label="Date of birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : ''} />
          <Row label="Address" value={employee.address} />
        </Section>

        <Section title="Employment">
          <Row label="Department" value={employee.department?.name} />
          <Row label="Designation" value={employee.designation} />
          <Row label="Employment type" value={employee.employmentType} />
          <Row label="Joining date" value={formatDate(employee.joiningDate)} />
          <Row label="Basic salary" value={money(employee.basicSalary)} />
        </Section>

        <Section title="Leave balance (days remaining)">
          <Row label="Casual leave" value={employee.leaveBalance?.casual} />
          <Row label="Sick leave" value={employee.leaveBalance?.sick} />
          <Row label="Earned leave" value={employee.leaveBalance?.earned} />
        </Section>

        <Section title="Account">
          <Row label="Login access" value={employee.user?.isActive ? 'Enabled' : 'Disabled'} />
          <Row label="Last login" value={employee.user?.lastLogin ? formatDateTime(employee.user.lastLogin) : 'Never'} />
          <Row label="Record created" value={formatDate(employee.createdAt)} />
        </Section>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} size="lg" title={`Edit ${employee.fullName}`}>
        <EmployeeForm employee={employee} departments={departments} onSubmit={handleSave} onCancel={() => setEditing(false)} />
      </Modal>

      <ConfirmDialog
        open={confirmStatus}
        danger={isActive}
        loading={busy}
        title={isActive ? 'Deactivate employee' : 'Activate employee'}
        message={isActive
          ? `${employee.fullName} will no longer be able to log in. You can activate them again later.`
          : `Allow ${employee.fullName} to log in again?`}
        confirmLabel={isActive ? 'Deactivate' : 'Activate'}
        onConfirm={toggleStatus}
        onCancel={() => setConfirmStatus(false)}
      />
    </div>
  );
}

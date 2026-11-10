import useAuth from '../../hooks/useAuth';
import ChangePasswordForm from '../../components/forms/ChangePasswordForm';
import AvatarUploader from '../../components/forms/AvatarUploader';
import ProfileForm from '../../components/forms/ProfileForm';
import { uploadAvatar, removeAvatar } from '../../services/avatarService';
import { formatDate } from '../../utils/format';

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-3 text-sm last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export default function EmployeeProfile() {
  const { user, employee, refreshUser } = useAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          You can update your photo and contact details. Other details are managed by the administrator.
        </p>
      </div>

      <div className="card p-6">
        <AvatarUploader
          name={employee.fullName}
          src={employee.profilePicture}
          onUpload={async (file) => { await uploadAvatar('/profile', file); await refreshUser(); }}
          onRemove={async () => { await removeAvatar('/profile'); await refreshUser(); }}
        />
      </div>

      <div className="card p-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Employment details</h2>
        <dl>
          <Row label="Full name" value={employee.fullName} />
          <Row label="Employee ID" value={employee.employeeId} />
          <Row label="Email" value={user.email} />
          <Row label="Department" value={employee.department?.name} />
          <Row label="Designation" value={employee.designation} />
          <Row label="Employment type" value={employee.employmentType} />
          <Row label="Joining date" value={formatDate(employee.joiningDate)} />
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Personal details</h2>
        <ProfileForm employee={employee} />
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

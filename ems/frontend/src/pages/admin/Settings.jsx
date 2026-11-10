import useAuth from '../../hooks/useAuth';
import ChangePasswordForm from '../../components/forms/ChangePasswordForm';

export default function AdminSettings() {
  const { user } = useAuth();
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account security.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-900">Account</h2>
        <p className="mt-1 text-sm text-slate-600">{user.email}</p>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

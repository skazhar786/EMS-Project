import NotificationList from '../../components/common/NotificationList';

export default function EmployeeNotifications() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">Task assignments, announcements and other updates.</p>
      </div>
      <NotificationList />
    </div>
  );
}

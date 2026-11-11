import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AnnouncementForm from '../../components/forms/AnnouncementForm';
import NotificationList from '../../components/common/NotificationList';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import TableSkeleton from '../../components/ui/TableSkeleton';
import { formatDateTime } from '../../utils/format';

export default function AdminNotifications() {
  const [tab, setTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, d] = await Promise.all([api.get('/announcements'), api.get('/departments')]);
      setAnnouncements(a.data.data);
      setDepartments(d.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async (values) => {
    const res = await api.post('/announcements', values);
    toast.success(res.data.message);
    load();
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/announcements/${toDelete._id}`);
      toast.success('Announcement deleted');
      load();
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const tabClass = (name) =>
    `border-b-2 px-4 py-2 text-sm font-medium ${tab === name ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">Send announcements to employees and view your own notifications.</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button className={tabClass('announcements')} onClick={() => setTab('announcements')}>Announcements</button>
        <button className={tabClass('mine')} onClick={() => setTab('mine')}>My notifications</button>
      </div>

      {tab === 'mine' && <NotificationList />}

      {tab === 'announcements' && (
        <>
          <div className="card p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">New announcement</h2>
            <AnnouncementForm departments={departments} onSubmit={send} />
          </div>

          <div className="card">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Sent announcements</h2>
            </div>
            {loading && <TableSkeleton rows={3} cols={4} />}
            {!loading && error && <ErrorState message={error} onRetry={load} />}
            {!loading && !error && announcements.length === 0 && (
              <EmptyState icon={Megaphone} title="No announcements yet" description="Announcements you send will be listed here." />
            )}
            {!loading && !error && announcements.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Announcement</th>
                      <th className="px-4 py-3 font-medium">Sent to</th>
                      <th className="px-4 py-3 font-medium">Recipients</th>
                      <th className="px-4 py-3 font-medium">Sent on</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {announcements.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50">
                        <td className="max-w-sm px-4 py-3">
                          <p className="font-medium text-slate-900">{a.title}</p>
                          <p className="truncate text-xs text-slate-500">{a.message}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{a.department ? a.department.name : 'All employees'}</td>
                        <td className="px-4 py-3 text-slate-700">{a.recipientCount}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDateTime(a.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setToDelete(a)} title="Delete" aria-label={`Delete ${a.title}`}>
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
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        danger
        loading={deleting}
        title="Delete announcement"
        message={`Delete "${toDelete?.title}"? It will also be removed from employees' notification lists.`}
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

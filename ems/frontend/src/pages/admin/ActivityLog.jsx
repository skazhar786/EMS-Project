import { useCallback, useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import api from '../../services/api';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Pagination from '../../components/ui/Pagination';
import TableSkeleton from '../../components/ui/TableSkeleton';
import { formatDateTime } from '../../utils/format';

const LIMIT = 20;
const TYPES = ['Employee', 'Department', 'Task', 'Attendance', 'Leave', 'Payroll', 'Announcement'];

export default function ActivityLog() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: LIMIT });
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/activity', { params: { page, limit: LIMIT, entityType: entityType || undefined } });
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [page, entityType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [entityType]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activity log</h1>
        <p className="mt-1 text-sm text-slate-500">An audit trail of important actions. Entries are kept for one year.</p>
      </div>

      <div className="card">
        <div className="border-b border-slate-200 p-4">
          <select className="input sm:w-56" value={entityType} onChange={(e) => setEntityType(e.target.value)} aria-label="Filter by area">
            <option value="">All areas</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {loading && <TableSkeleton rows={8} cols={3} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && items.length === 0 && (
          <EmptyState icon={ScrollText} title="No activity recorded yet"
            description={entityType ? 'Nothing recorded for this area. Try “All areas”.' : 'Actions such as adding employees, approving leave or paying salary will be listed here.'} />
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Who</th>
                    <th className="px-4 py-3 font-medium">Area</th>
                    <th className="px-4 py-3 font-medium">What happened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(a.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{a.actorName}</p>
                        <p className="text-xs capitalize text-slate-400">{a.actorRole?.toLowerCase()}</p>
                      </td>
                      <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-600">{a.entityType}</span></td>
                      <td className="px-4 py-3 text-slate-700">{a.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

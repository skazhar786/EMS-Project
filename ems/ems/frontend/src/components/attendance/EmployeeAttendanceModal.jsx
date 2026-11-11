import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../ui/Modal';
import ErrorState from '../ui/ErrorState';
import TableSkeleton from '../ui/TableSkeleton';
import MonthYearPicker from './MonthYearPicker';
import { SummaryCards, DaysTable } from './AttendanceViews';

// Admin: one employee's attendance history for a chosen month.
export default function EmployeeAttendanceModal({ open, onClose, employee }) {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/attendance/employee/${employee._id}`, { params: period });
      setData(res.data.data);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [employee, period]);

  useEffect(() => { if (open) load(); }, [open, load]);

  return (
    <Modal open={open} onClose={onClose} size="lg" title={employee ? `Attendance: ${employee.fullName}` : 'Attendance'}>
      <div className="space-y-4">
        <MonthYearPicker month={period.month} year={period.year} onChange={setPeriod} />
        {loading && <TableSkeleton rows={5} cols={5} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data && (
          <>
            <SummaryCards summary={data.summary} />
            <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
              <DaysTable days={data.days} />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

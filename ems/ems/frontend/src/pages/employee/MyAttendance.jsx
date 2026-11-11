import { useCallback, useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import ErrorState from '../../components/ui/ErrorState';
import TableSkeleton from '../../components/ui/TableSkeleton';
import MonthYearPicker from '../../components/attendance/MonthYearPicker';
import { SummaryCards, DaysTable } from '../../components/attendance/AttendanceViews';
import { formatClock, formatDateKey, formatHours } from '../../utils/format';

export default function MyAttendance() {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [today, setToday] = useState(null);
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadToday = useCallback(async () => {
    const res = await api.get('/attendance/today');
    setToday(res.data.data);
  }, []);

  const loadMonth = useCallback(async () => {
    const res = await api.get('/attendance/my', { params: period });
    setMonth(res.data.data);
  }, [period]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadToday(), loadMonth()]);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, [loadToday, loadMonth]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const act = async (path) => {
    setBusy(true);
    try {
      const res = await api.post(path);
      toast.success(res.data.message);
      await Promise.all([loadToday(), loadMonth()]);
    } catch (err) {
      toast.error(err.userMessage);
      loadToday().catch(() => {}); // the server state may differ from what we showed
    } finally {
      setBusy(false);
    }
  };

  const record = today?.record;
  const rules = today?.rules || month?.rules;
  const finished = !!record?.checkOutTime;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">Check in when you start and check out when you finish.</p>
      </div>

      {error && <div className="card"><ErrorState message={error} onRetry={loadAll} /></div>}

      {!error && (
        <>
          <div className="card p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" /> Today{today ? `, ${formatDateKey(today.date)}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <span>Status: {record ? <StatusBadge status={record.status} /> : <StatusBadge status="Not checked in" />}</span>
                  <span className="text-slate-600">Check-in: <strong className="text-slate-900">{formatClock(record?.checkInTime)}</strong></span>
                  <span className="text-slate-600">Check-out: <strong className="text-slate-900">{formatClock(record?.checkOutTime)}</strong></span>
                  {finished && <span className="text-slate-600">Worked: <strong className="text-slate-900">{formatHours(record.workHours)}</strong></span>}
                </div>
                {rules && (
                  <p className="mt-3 text-xs text-slate-500">
                    Shift starts {formatClock(rules.workStart)}. Check-ins more than {rules.graceMinutes} minutes later are marked Late.
                    Working under {rules.halfDayHours} hours counts as a half day.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button className="btn-primary" disabled={busy || loading || !!record} onClick={() => act('/attendance/check-in')}>
                  {busy && !record ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Check in
                </button>
                <button className="btn-secondary" disabled={busy || loading || !record || finished} onClick={() => act('/attendance/check-out')}>
                  {busy && record && !finished ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Check out
                </button>
              </div>
            </div>
            {finished && <p className="mt-4 text-sm text-emerald-700">You have completed today's attendance.</p>}
          </div>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Monthly record</h2>
            <MonthYearPicker month={period.month} year={period.year} onChange={setPeriod} />
          </div>

          {loading && !month ? (
            <div className="card"><TableSkeleton rows={6} cols={5} /></div>
          ) : month && (
            <>
              <SummaryCards summary={month.summary} />
              <div className="card"><DaysTable days={month.days} /></div>
            </>
          )}
        </>
      )}
    </div>
  );
}

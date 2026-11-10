import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, RefreshCw, Server, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

function StatusRow({ icon: Icon, label, value, ok }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span
        className={`badge ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
      >
        {ok ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <XCircle className="mr-1 h-3.5 w-3.5" />}
        {value}
      </span>
    </div>
  );
}

export default function SystemStatus() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/health');
      setData(res.data.data);
    } catch (err) {
      setData(err.response?.data?.data || null);
      setError(err.userMessage);
      toast.error(err.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Employee Management System</h1>
          <p className="mt-1 text-sm text-slate-500">Phase 1: environment check</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
          </div>
        ) : (
          <div className="space-y-3">
            <StatusRow icon={Server} label="Frontend" value="Running" ok />
            <StatusRow
              icon={Activity}
              label="Backend API"
              value={data ? 'Reachable' : 'Unreachable'}
              ok={!!data}
            />
            <StatusRow
              icon={Database}
              label="MongoDB"
              value={data?.database ?? 'Unknown'}
              ok={data?.database === 'connected'}
            />
            {data && (
              <p className="pt-1 text-xs text-slate-500">
                Environment: {data.environment} · Uptime: {data.uptimeSeconds}s
              </p>
            )}
            {error && <p className="field-error">{error}</p>}
          </div>
        )}

        <button onClick={check} disabled={loading} className="btn-primary mt-6 w-full">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Re-check connection
        </button>
      </div>
    </div>
  );
}

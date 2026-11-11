import { BarChart3 } from 'lucide-react';

// Card around a chart. Shows a friendly zero state instead of an empty/blank chart.
export default function ChartCard({ title, subtitle, isEmpty, emptyText = 'No data yet', height = 260, children }) {
  return (
    <div className="card p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4" style={{ height }}>
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 text-center text-slate-500">
            <BarChart3 className="h-6 w-6" />
            <p className="max-w-xs px-4 text-sm">{emptyText}</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}

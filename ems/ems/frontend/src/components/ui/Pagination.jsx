import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, limit, onPageChange }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}</span>–<span className="font-medium text-slate-700">{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button className="btn-secondary !px-3 !py-1.5" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="text-sm text-slate-600">Page {page} of {pages}</span>
        <button className="btn-secondary !px-3 !py-1.5" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

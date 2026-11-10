import { Loader2 } from 'lucide-react';

export default function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

import { Search } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="input pl-9" aria-label={placeholder}
      />
    </div>
  );
}

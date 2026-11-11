import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

// Searchable multi-select of employees. value = array of employee ids.
export default function EmployeePicker({ employees, value, onChange }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? employees.filter((e) => `${e.fullName} ${e.employeeId}`.toLowerCase().includes(term)) : employees;
  }, [employees, q]);

  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const allShown = filtered.length > 0 && filtered.every((e) => value.includes(e._id));
  const toggleShown = () => {
    const ids = filtered.map((e) => e._id);
    onChange(allShown ? value.filter((v) => !ids.includes(v)) : [...new Set([...value, ...ids])]);
  };

  return (
    <div className="rounded-lg border border-slate-300">
      <div className="relative border-b border-slate-200">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employees..."
          className="w-full rounded-t-lg bg-transparent py-2 pl-9 pr-3 text-sm focus:outline-none" aria-label="Search employees"
        />
      </div>
      <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
        <span>{value.length} selected</span>
        {filtered.length > 0 && (
          <button type="button" className="font-medium text-primary-600 hover:underline" onClick={toggleShown}>
            {allShown ? 'Deselect shown' : 'Select shown'}
          </button>
        )}
      </div>
      <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
        {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">No employees found</li>}
        {filtered.map((e) => (
          <li key={e._id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
              <input
                type="checkbox" checked={value.includes(e._id)} onChange={() => toggle(e._id)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600"
              />
              <span className="flex-1 text-slate-800">{e.fullName}</span>
              <span className="text-xs text-slate-500">{e.employeeId}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

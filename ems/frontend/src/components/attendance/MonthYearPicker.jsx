import { MONTH_NAMES } from '../../utils/format';

export default function MonthYearPicker({ month, year, onChange }) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - 4 + i);
  return (
    <div className="flex gap-2">
      <select className="input !w-auto" value={month} onChange={(e) => onChange({ month: Number(e.target.value), year })} aria-label="Month">
        {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className="input !w-auto" value={year} onChange={(e) => onChange({ month, year: Number(e.target.value) })} aria-label="Year">
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

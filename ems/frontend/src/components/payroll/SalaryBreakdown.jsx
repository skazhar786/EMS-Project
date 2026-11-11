import { DEDUCTIONS, EARNINGS, formatMoney } from '../../utils/money';

function Column({ title, fields, values, totalLabel, total, tone }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {fields.map((f) => (
          <div key={f.name} className="flex justify-between gap-3 px-3 py-2 text-sm">
            <dt className="text-slate-600">{f.label}</dt>
            <dd className="font-medium text-slate-900">{formatMoney(values[f.name])}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 bg-slate-50 px-3 py-2 text-sm font-semibold">
          <dt className="text-slate-700">{totalLabel}</dt>
          <dd className={tone}>{formatMoney(total)}</dd>
        </div>
      </dl>
    </div>
  );
}

// values: a structure or a payment; totals: { gross, totalDeductions, net }
export default function SalaryBreakdown({ values, totals }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Column title="Earnings" fields={EARNINGS} values={values} totalLabel="Gross salary" total={totals.gross} tone="text-slate-900" />
        <Column title="Deductions" fields={DEDUCTIONS} values={values} totalLabel="Total deductions" total={totals.totalDeductions} tone="text-red-600" />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-primary-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-primary-700">Net salary</p>
          <p className="text-xs text-primary-700/70">Gross salary minus total deductions</p>
        </div>
        <p className="text-xl font-semibold text-primary-700">{formatMoney(totals.net)}</p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, Wand2 } from 'lucide-react';
import { applyServerErrors } from '../../utils/formErrors';
import { DEDUCTIONS, EARNINGS, calcTotals, formatMoney, round2 } from '../../utils/money';

// Shared by "salary structure" and "adjust a pending payslip".
export default function SalaryForm({ initial, defaults, showRemarks = false, initialRemarks = '', submitLabel, onSubmit, onCancel }) {
  const [netError, setNetError] = useState('');
  const {
    register, handleSubmit, watch, setValue, setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      ...Object.fromEntries([...EARNINGS, ...DEDUCTIONS].map((f) => [f.name, initial?.[f.name] ?? ''])),
      remarks: initialRemarks,
    },
  });

  const values = watch();
  const totals = calcTotals(values);

  const autoFill = () => {
    const basic = Number(values.basic) || 0;
    setValue('hra', round2((basic * defaults.hraPercent) / 100), { shouldDirty: true });
    setValue('pfDeduction', round2((basic * defaults.pfPercent) / 100), { shouldDirty: true });
  };

  const submit = async (data) => {
    setNetError('');
    if (calcTotals(data).net < 0) {
      setNetError('Total deductions cannot be more than the gross salary.');
      return;
    }
    try {
      await onSubmit(data);
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.userMessage);
    }
  };

  const renderField = (f) => (
    <div key={f.name}>
      <label htmlFor={`f-${f.name}`} className="label">{f.label}{f.name === 'basic' ? ' *' : ''}</label>
      <input
        id={`f-${f.name}`} type="number" step="0.01" min="0" inputMode="decimal" className="input" placeholder="0.00"
        {...register(f.name, {
          validate: (v) => {
            if (f.name === 'basic' && !(Number(v) > 0)) return 'Basic salary must be greater than 0';
            if (v !== '' && Number(v) < 0) return 'Must be 0 or more';
            return true;
          },
        })}
      />
      {errors[f.name] && <p className="field-error">{errors[f.name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      {defaults && (
        <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-600">
            Quick start: fill HRA ({defaults.hraPercent}% of basic) and PF ({defaults.pfPercent}% of basic). You can change every amount afterwards.
          </p>
          <button type="button" className="btn-secondary !py-1.5" onClick={autoFill} disabled={!(Number(values.basic) > 0)}>
            <Wand2 className="h-4 w-4" /> Auto-fill
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Earnings (monthly)</h3>
          {EARNINGS.map(renderField)}
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deductions (monthly)</h3>
          {DEDUCTIONS.map(renderField)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 p-3 text-center">
        <div><p className="text-xs text-slate-500">Gross</p><p className="text-sm font-semibold text-slate-900">{formatMoney(totals.gross)}</p></div>
        <div><p className="text-xs text-slate-500">Deductions</p><p className="text-sm font-semibold text-red-600">{formatMoney(totals.totalDeductions)}</p></div>
        <div><p className="text-xs text-slate-500">Net</p><p className={`text-sm font-semibold ${totals.net < 0 ? 'text-red-600' : 'text-primary-700'}`}>{formatMoney(totals.net)}</p></div>
      </div>
      {netError && <p className="field-error">{netError}</p>}

      {showRemarks && (
        <div>
          <label htmlFor="remarks" className="label">Remarks (shown on the payslip)</label>
          <textarea id="remarks" rows={2} className="input" placeholder="e.g. 2 days loss of pay deducted"
            {...register('remarks', { maxLength: { value: 300, message: 'At most 300 characters' } })} />
          {errors.remarks && <p className="field-error">{errors.remarks.message}</p>}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
        </button>
      </div>
    </form>
  );
}

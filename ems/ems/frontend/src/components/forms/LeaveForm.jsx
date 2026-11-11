import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { applyServerErrors } from '../../utils/formErrors';
import { BALANCE_FIELD, LEAVE_LABELS, LEAVE_TYPES, countLeaveDays } from '../../utils/leave';

const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
};

export default function LeaveForm({ balance, weeklyOff, onSubmit, onCancel }) {
  const {
    register, handleSubmit, watch, setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { type: 'Casual', startDate: '', endDate: '', reason: '' } });

  const [type, startDate, endDate] = watch(['type', 'startDate', 'endDate']);
  const days = countLeaveDays(startDate, endDate, weeklyOff);
  const field = BALANCE_FIELD[type];
  const left = field ? balance[field] : null;
  const minStart = type === 'Sick' ? localDate(-7) : localDate(0);

  const submit = async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.userMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="type" className="label">Leave type</label>
        <select id="type" className="input" {...register('type')}>
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAVE_LABELS[t]}{BALANCE_FIELD[t] ? ` (${balance[BALANCE_FIELD[t]]} days left)` : ''}
            </option>
          ))}
        </select>
        {type === 'Sick' && <p className="mt-1 text-xs text-slate-500">Sick leave may start up to 7 days in the past.</p>}
        {type === 'Unpaid' && <p className="mt-1 text-xs text-slate-500">Unpaid leave has no balance limit.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="label">Start date *</label>
          <input id="startDate" type="date" min={minStart} className="input"
            {...register('startDate', { required: 'Start date is required' })} />
          {errors.startDate && <p className="field-error">{errors.startDate.message}</p>}
        </div>
        <div>
          <label htmlFor="endDate" className="label">End date *</label>
          <input id="endDate" type="date" min={startDate || minStart} className="input"
            {...register('endDate', {
              required: 'End date is required',
              validate: (v, all) => !all.startDate || v >= all.startDate || 'End date cannot be before the start date',
            })} />
          {errors.endDate && <p className="field-error">{errors.endDate.message}</p>}
        </div>
      </div>

      {startDate && endDate && endDate >= startDate && (
        <p className={`rounded-lg px-3 py-2 text-sm ${days === 0 ? 'bg-amber-50 text-amber-700' : left !== null && days > left ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
          {days === 0
            ? 'These dates fall only on weekly off days.'
            : `${days} working day${days > 1 ? 's' : ''} requested (weekly off days are not counted).`}
          {left !== null && days > left && days > 0 && ` You only have ${left} day(s) left.`}
        </p>
      )}

      <div>
        <label htmlFor="reason" className="label">Reason *</label>
        <textarea id="reason" rows={3} className="input" placeholder="Briefly explain the reason for your leave"
          {...register('reason', {
            required: 'Reason is required',
            minLength: { value: 5, message: 'At least 5 characters' },
            maxLength: { value: 500, message: 'At most 500 characters' },
          })} />
        {errors.reason && <p className="field-error">{errors.reason.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit request
        </button>
      </div>
    </form>
  );
}

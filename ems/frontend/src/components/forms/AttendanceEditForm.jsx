import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { applyServerErrors } from '../../utils/formErrors';

const STATUSES = ['Present', 'Late', 'Half-day', 'Absent'];

// Administrator creates or corrects one day of attendance for one employee.
export default function AttendanceEditForm({ row, onSubmit, onRemove, onCancel }) {
  const {
    register, handleSubmit, watch, setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      status: STATUSES.includes(row.status) ? row.status : 'Present',
      checkInTime: row.checkInTime || '',
      checkOutTime: row.checkOutTime || '',
    },
  });

  const status = watch('status');
  const isAbsent = status === 'Absent';

  const submit = async (values) => {
    try {
      await onSubmit(isAbsent ? { status: 'Absent', checkInTime: '', checkOutTime: '' } : values);
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.userMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <p className="font-medium text-slate-900">{row.employee.fullName} <span className="text-slate-500">({row.employee.employeeId})</span></p>
        <p className="text-slate-500">Date: {row.date}</p>
      </div>

      <div>
        <label htmlFor="status" className="label">Status</label>
        <select id="status" className="input" {...register('status')}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="checkInTime" className="label">Check-in time</label>
          <input id="checkInTime" type="time" className="input" disabled={isAbsent}
            {...register('checkInTime', { validate: (v) => isAbsent || !!v || 'Check-in time is required' })} />
          {errors.checkInTime && <p className="field-error">{errors.checkInTime.message}</p>}
        </div>
        <div>
          <label htmlFor="checkOutTime" className="label">Check-out time</label>
          <input id="checkOutTime" type="time" className="input" disabled={isAbsent}
            {...register('checkOutTime', {
              validate: (v, all) => isAbsent || !v || !all.checkInTime || v > all.checkInTime || 'Must be after check-in',
            })} />
          {errors.checkOutTime && <p className="field-error">{errors.checkOutTime.message}</p>}
        </div>
      </div>

      <div className="flex flex-col-reverse justify-between gap-3 pt-2 sm:flex-row sm:items-center">
        {row.recordId ? (
          <button type="button" className="btn-secondary text-red-600" onClick={onRemove} disabled={isSubmitting}>
            Remove record
          </button>
        ) : <span />}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </form>
  );
}

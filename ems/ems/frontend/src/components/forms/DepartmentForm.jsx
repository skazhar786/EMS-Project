import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { applyServerErrors } from '../../utils/formErrors';

export default function DepartmentForm({ department, managers, onSubmit, onCancel }) {
  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: department?.name || '',
      description: department?.description || '',
      manager: department?.manager?._id || '',
    },
  });

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
        <label htmlFor="name" className="label">Department name *</label>
        <input id="name" className="input" placeholder="e.g. Engineering"
          {...register('name', {
            required: 'Department name is required',
            minLength: { value: 2, message: 'At least 2 characters' },
            maxLength: { value: 80, message: 'At most 80 characters' },
          })} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea id="description" rows={3} className="input" placeholder="What does this department do?"
          {...register('description', { maxLength: { value: 500, message: 'At most 500 characters' } })} />
        {errors.description && <p className="field-error">{errors.description.message}</p>}
      </div>

      <div>
        <label htmlFor="manager" className="label">Department manager</label>
        <select id="manager" className="input" {...register('manager')}>
          <option value="">No manager</option>
          {managers.map((m) => (
            <option key={m._id} value={m._id}>{m.fullName} ({m.employeeId})</option>
          ))}
        </select>
        {managers.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">Add employees first to be able to assign a manager.</p>
        )}
        {errors.manager && <p className="field-error">{errors.manager.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {department ? 'Save changes' : 'Create department'}
        </button>
      </div>
    </form>
  );
}

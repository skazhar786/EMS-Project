import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import EmployeePicker from './EmployeePicker';
import { applyServerErrors, toInputDate } from '../../utils/formErrors';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function TaskForm({ task, employees, onSubmit, onCancel }) {
  const isEdit = !!task;

  // Keep current assignees selectable even if they are no longer in the "active employees" list.
  const options = useMemo(() => {
    const map = new Map(employees.map((e) => [e._id, e]));
    (task?.assignees || []).forEach((a) => {
      if (a.employee && !map.has(a.employee._id)) map.set(a.employee._id, a.employee);
    });
    return [...map.values()];
  }, [employees, task]);

  const {
    register, control, handleSubmit, setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'Medium',
      deadline: toInputDate(task?.deadline),
      assignedTo: (task?.assignees || []).map((a) => a.employee._id),
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
        <label htmlFor="title" className="label">Title *</label>
        <input id="title" className="input" placeholder="e.g. Prepare monthly report"
          {...register('title', {
            required: 'Title is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            maxLength: { value: 150, message: 'At most 150 characters' },
          })} />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea id="description" rows={3} className="input"
          {...register('description', { maxLength: { value: 2000, message: 'At most 2000 characters' } })} />
        {errors.description && <p className="field-error">{errors.description.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="priority" className="label">Priority</label>
          <select id="priority" className="input" {...register('priority')}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="deadline" className="label">Deadline *</label>
          <input id="deadline" type="date" className="input"
            min={isEdit ? undefined : toInputDate(new Date())}
            {...register('deadline', { required: 'Deadline is required' })} />
          {errors.deadline && <p className="field-error">{errors.deadline.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Assign to *</label>
        <Controller
          name="assignedTo" control={control}
          rules={{ validate: (v) => v.length > 0 || 'Select at least one employee' }}
          render={({ field }) => <EmployeePicker employees={options} value={field.value} onChange={field.onChange} />}
        />
        {errors.assignedTo && <p className="field-error">{errors.assignedTo.message}</p>}
        {options.length === 0 && <p className="mt-1 text-xs text-slate-500">Add active employees first to be able to assign tasks.</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  );
}

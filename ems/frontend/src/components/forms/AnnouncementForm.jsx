import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, Send } from 'lucide-react';
import { applyServerErrors } from '../../utils/formErrors';

export default function AnnouncementForm({ departments, onSubmit }) {
  const {
    register, handleSubmit, reset, setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { title: '', message: '', department: '' } });

  const submit = async (values) => {
    try {
      await onSubmit(values);
      reset();
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.userMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="a-title" className="label">Title *</label>
        <input id="a-title" className="input" placeholder="e.g. Office closed on Friday"
          {...register('title', {
            required: 'Title is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            maxLength: { value: 120, message: 'At most 120 characters' },
          })} />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="a-message" className="label">Message *</label>
        <textarea id="a-message" rows={4} className="input"
          {...register('message', {
            required: 'Message is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            maxLength: { value: 1000, message: 'At most 1000 characters' },
          })} />
        {errors.message && <p className="field-error">{errors.message.message}</p>}
      </div>

      <div>
        <label htmlFor="a-dept" className="label">Send to</label>
        <select id="a-dept" className="input sm:max-w-xs" {...register('department')}>
          <option value="">All active employees</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name} department only</option>)}
        </select>
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send announcement
      </button>
    </form>
  );
}

import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { applyServerErrors, toInputDate } from '../../utils/formErrors';

// Only the fields an employee is allowed to change. Everything else is admin-managed.
export default function ProfileForm({ employee }) {
  const { refreshUser } = useAuth();
  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    defaultValues: {
      phone: employee.phone || '',
      gender: employee.gender || '',
      dateOfBirth: toInputDate(employee.dateOfBirth),
      address: employee.address || '',
    },
  });

  const onSubmit = async (values) => {
    try {
      await api.put('/profile', values);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.userMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="label">Phone</label>
          <input id="phone" className="input" placeholder="e.g. 9876543210"
            {...register('phone', { pattern: { value: /^[0-9+\-\s()]{7,15}$/, message: 'Enter a valid phone number' } })} />
          {errors.phone && <p className="field-error">{errors.phone.message}</p>}
        </div>

        <div>
          <label htmlFor="gender" className="label">Gender</label>
          <select id="gender" className="input" {...register('gender')}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <p className="field-error">{errors.gender.message}</p>}
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="label">Date of birth</label>
          <input id="dateOfBirth" type="date" className="input" max={toInputDate(new Date())}
            {...register('dateOfBirth', { validate: (v) => !v || new Date(v) < new Date() || 'Date of birth must be in the past' })} />
          {errors.dateOfBirth && <p className="field-error">{errors.dateOfBirth.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className="label">Address</label>
          <textarea id="address" rows={2} className="input"
            {...register('address', { maxLength: { value: 300, message: 'At most 300 characters' } })} />
          {errors.address && <p className="field-error">{errors.address.message}</p>}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting || !isDirty}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </button>
    </form>
  );
}

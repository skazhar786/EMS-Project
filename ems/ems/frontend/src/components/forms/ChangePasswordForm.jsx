import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function ChangePasswordForm() {
  const {
    register, handleSubmit, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password updated successfully');
      reset();
    } catch (err) {
      toast.error(err.userMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="currentPassword" className="label">Current password</label>
        <input
          id="currentPassword" type="password" autoComplete="current-password" className="input"
          {...register('currentPassword', { required: 'Current password is required' })}
        />
        {errors.currentPassword && <p className="field-error">{errors.currentPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="newPassword" className="label">New password</label>
        <input
          id="newPassword" type="password" autoComplete="new-password" className="input"
          {...register('newPassword', {
            required: 'New password is required',
            minLength: { value: 8, message: 'Use at least 8 characters' },
            maxLength: { value: 72, message: 'Use at most 72 characters' },
            validate: (v) =>
              (/[A-Za-z]/.test(v) && /[0-9]/.test(v)) || 'Include at least one letter and one number',
          })}
        />
        {errors.newPassword && <p className="field-error">{errors.newPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="label">Confirm new password</label>
        <input
          id="confirmPassword" type="password" autoComplete="new-password" className="input"
          {...register('confirmPassword', {
            required: 'Please confirm your new password',
            validate: (v) => v === watch('newPassword') || 'Passwords do not match',
          })}
        />
        {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </button>
    </form>
  );
}

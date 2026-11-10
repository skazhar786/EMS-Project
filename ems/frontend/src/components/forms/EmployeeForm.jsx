import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { applyServerErrors, toInputDate } from '../../utils/formErrors';

const GENDERS = ['Male', 'Female', 'Other'];
const TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'];

function Field({ label, error, children, htmlFor, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {error && <p className="field-error">{error.message}</p>}
    </div>
  );
}

export default function EmployeeForm({ employee, departments, onSubmit, onCancel }) {
  const isEdit = !!employee;
  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: employee?.fullName || '',
      email: employee?.user?.email || '',
      password: '',
      phone: employee?.phone || '',
      gender: employee?.gender || '',
      dateOfBirth: toInputDate(employee?.dateOfBirth),
      joiningDate: toInputDate(employee?.joiningDate) || toInputDate(new Date()),
      department: employee?.department?._id || '',
      designation: employee?.designation || '',
      employmentType: employee?.employmentType || 'Full-time',
      status: employee?.status || 'Active',
      basicSalary: employee?.basicSalary ?? 0,
      address: employee?.address || '',
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
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *" htmlFor="fullName" error={errors.fullName}>
          <input id="fullName" className="input"
            {...register('fullName', {
              required: 'Full name is required',
              minLength: { value: 2, message: 'At least 2 characters' },
            })} />
        </Field>

        <Field label="Email *" htmlFor="email" error={errors.email}>
          <input id="email" type="email" className="input"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
            })} />
        </Field>

        <Field
          label={isEdit ? 'Reset password (optional)' : 'Initial password *'}
          htmlFor="password" error={errors.password}
        >
          <input id="password" type="password" autoComplete="new-password" className="input"
            placeholder={isEdit ? 'Leave blank to keep current password' : 'Min 8 chars, letter + number'}
            {...register('password', {
              validate: (v) => {
                if (!v) return isEdit ? true : 'Password is required';
                if (v.length < 8) return 'At least 8 characters';
                if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return 'Include a letter and a number';
                return true;
              },
            })} />
        </Field>

        <Field label="Phone" htmlFor="phone" error={errors.phone}>
          <input id="phone" className="input" placeholder="e.g. 9876543210"
            {...register('phone', {
              pattern: { value: /^[0-9+\-\s()]{7,15}$/, message: 'Enter a valid phone number' },
            })} />
        </Field>

        <Field label="Gender" htmlFor="gender" error={errors.gender}>
          <select id="gender" className="input" {...register('gender')}>
            <option value="">Select gender</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>

        <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth}>
          <input id="dateOfBirth" type="date" className="input"
            max={toInputDate(new Date())}
            {...register('dateOfBirth', {
              validate: (v) => !v || new Date(v) < new Date() || 'Date of birth must be in the past',
            })} />
        </Field>

        <Field label="Joining date *" htmlFor="joiningDate" error={errors.joiningDate}>
          <input id="joiningDate" type="date" className="input"
            {...register('joiningDate', { required: 'Joining date is required' })} />
        </Field>

        <Field label="Department" htmlFor="department" error={errors.department}>
          <select id="department" className="input" {...register('department')}>
            <option value="">Not assigned</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>

        <Field label="Designation" htmlFor="designation" error={errors.designation}>
          <input id="designation" className="input" placeholder="e.g. Software Engineer"
            {...register('designation', { maxLength: { value: 100, message: 'At most 100 characters' } })} />
        </Field>

        <Field label="Employment type" htmlFor="employmentType" error={errors.employmentType}>
          <select id="employmentType" className="input" {...register('employmentType')}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Status" htmlFor="status" error={errors.status}>
          <select id="status" className="input" {...register('status')}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </Field>

        <Field label="Basic salary (monthly)" htmlFor="basicSalary" error={errors.basicSalary}>
          <input id="basicSalary" type="number" min="0" step="0.01" className="input"
            {...register('basicSalary', { min: { value: 0, message: 'Cannot be negative' } })} />
        </Field>

        <Field label="Address" htmlFor="address" error={errors.address} className="sm:col-span-2">
          <textarea id="address" rows={2} className="input"
            {...register('address', { maxLength: { value: 300, message: 'At most 300 characters' } })} />
        </Field>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Add employee'}
        </button>
      </div>
    </form>
  );
}

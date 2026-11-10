import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Lock, Mail, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import PageLoader from '../../components/common/PageLoader';
import { homePathFor } from '../../utils/roles';

export default function Login() {
  const { user, loading, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } });

  if (loading) return <PageLoader label="Restoring your session..." />;
  // Already logged in: go straight to the right dashboard (admin or employee).
  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      // The redirect happens automatically: `user` is now set, so this component renders <Navigate>.
    } catch (err) {
      setServerError(err.userMessage || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-full">
      {/* Brand panel (desktop only) */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Users className="h-6 w-6" />
          </div>
          <span className="text-lg font-semibold">Employee Management System</span>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            Manage your people, tasks, attendance and payroll in one place.
          </h2>
          <p className="mt-4 max-w-md text-primary-200">
            A centralized HR platform with separate portals for administrators and employees.
          </p>
        </div>
        <p className="text-sm text-primary-200">B.Tech Final-Year Project</p>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your credentials to access your account.</p>
          </div>

          {serverError && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email" type="email" autoComplete="email" placeholder="you@company.com"
                  className="input pl-10"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                  })}
                />
              </div>
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Enter your password" className="input px-10"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Accounts are created by your administrator. Forgot your password? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { homePathFor } from '../utils/roles';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-primary-600">404</p>
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link to={user ? homePathFor(user.role) : '/login'} className="btn-primary mt-2">
        {user ? 'Back to dashboard' : 'Go to login'}
      </Link>
    </div>
  );
}

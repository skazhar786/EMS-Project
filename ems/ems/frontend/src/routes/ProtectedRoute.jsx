import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import PageLoader from '../components/common/PageLoader';
import { homePathFor } from '../utils/roles';

// <ProtectedRoute allowedRoles={['ADMIN']}> ... </ProtectedRoute>
// This only controls what the UI shows. Real enforcement is on the backend:
// every API route re-checks the token and role.
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Restoring your session..." />;

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Wrong portal: send the user to their own dashboard.
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return children;
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role))
    return <Navigate to="/unauthorized" replace />;

  return children;
}
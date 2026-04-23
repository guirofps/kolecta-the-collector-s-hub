import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, Role } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  role?: Role;
}

export default function ProtectedRoute({ children, requireAuth = true, role }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, hasRole } = useAuth();

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/entrar" state={{ returnTo: location.pathname }} replace />;
  }

  if (role && !hasRole(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, Role } from '@/contexts/AuthContext';

/* Auth: integrar com o contexto de autenticação real
   quando o backend estiver conectado. Por ora usar
   mock de usuário autenticado para não bloquear
   o desenvolvimento do frontend */

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
    if (role === 'admin') {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/conta" replace />;
  }

  return <>{children}</>;
}

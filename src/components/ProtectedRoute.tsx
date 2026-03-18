import { Navigate, useLocation } from 'react-router-dom';

/* Auth: integrar com o contexto de autenticação real
   quando o backend estiver conectado. Por ora usar
   mock de usuário autenticado para não bloquear
   o desenvolvimento do frontend */

type Role = 'buyer' | 'seller' | 'admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  role?: Role;
}

// Mock: simula usuário autenticado com todos os papéis para dev
const mockUser = {
  isAuthenticated: true,
  roles: ['buyer', 'seller', 'admin'] as Role[],
};

export default function ProtectedRoute({ children, requireAuth = true, role }: ProtectedRouteProps) {
  const location = useLocation();

  if (requireAuth && !mockUser.isAuthenticated) {
    return <Navigate to="/entrar" state={{ returnTo: location.pathname }} replace />;
  }

  if (role && !mockUser.roles.includes(role)) {
    if (role === 'admin') {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/conta" replace />;
  }

  return <>{children}</>;
}

import { createContext, useContext, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useMyProfile } from '@/hooks/use-api';

export type Role = 'user' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
}

interface AuthContextType {
  user: AuthUser;
  isAuthenticated: boolean;
  hasRole: (role: Role) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { data: profile, isLoading: profileLoading } = useMyProfile();

  // Construir o user a partir do Clerk + backend
  const user: AuthUser = {
    id: clerkUser?.id ?? '',
    name: clerkUser?.firstName ?? profile?.name ?? 'Usuário',
    email: clerkUser?.primaryEmailAddress?.emailAddress ?? profile?.email ?? '',
    // Role vem do backend (Turso) — fonte de verdade
    role: profile?.role ?? 'user',
    avatar: clerkUser?.imageUrl ?? null,
  };

  const isAuthenticated = !!isSignedIn;
  const isLoading = !clerkLoaded || (isAuthenticated && profileLoading);

  const hasRole = (role: Role) => {
    // admin tem acesso a tudo; user tem acesso a tudo exceto admin
    if (user.role === 'admin') return true;
    return role !== 'admin';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, hasRole, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Re-exportar os mock users para compatibilidade (usado pelo DevToolbar, etc.)
export const mockUsers: Record<Role, AuthUser> = {
  user: {
    id: 'seller-001',
    name: 'João Silva',
    email: 'joao@email.com',
    role: 'user',
    avatar: null,
  },
  admin: {
    id: 'admin-001',
    name: 'Admin Kolecta',
    email: 'admin@kolecta.com.br',
    role: 'admin',
    avatar: null,
  },
};

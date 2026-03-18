import { createContext, useContext, useState, ReactNode } from 'react';

export type Role = 'buyer' | 'seller' | 'admin';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
}

interface AuthContextType {
  user: MockUser;
  setUser: (user: MockUser) => void;
  isAuthenticated: boolean;
  hasRole: (role: Role) => boolean;
}

export const mockUsers: Record<Role, MockUser> = {
  buyer: {
    id: 'buyer-001',
    name: 'João Silva',
    email: 'joao@email.com',
    role: 'buyer',
    avatar: null,
  },
  seller: {
    id: 'seller-001',
    name: 'Coleção Turbo',
    email: 'vendedor@email.com',
    role: 'seller',
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

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser>(mockUsers.buyer);

  const hasRole = (role: Role) => {
    // In dev mock: admin has all roles, seller has buyer+seller, buyer has buyer only
    if (user.role === 'admin') return true;
    if (user.role === 'seller') return role !== 'admin';
    return role === 'buyer';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated: true, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

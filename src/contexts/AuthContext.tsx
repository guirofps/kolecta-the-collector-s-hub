import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'user' | 'admin';

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
  user: {
    id: 'seller-001', // Importante ser seller-001 para parear com o seed do backend
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

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser>(() => {
    const savedId = localStorage.getItem('dev_user_id');
    if (savedId) {
      if (savedId === mockUsers.admin.id) return mockUsers.admin;
      if (savedId === 'seller-001') return mockUsers.user;
    }
    return mockUsers.user;
  });

  useEffect(() => {
    localStorage.setItem('dev_user_id', user.id);
  }, [user.id]);

  const handleSetUser = (newUser: MockUser) => {
    localStorage.setItem('dev_user_id', newUser.id);
    setUser(newUser);
  };

  const hasRole = (role: Role) => {
    // admin tem acesso a tudo; user tem acesso a tudo exceto admin
    if (user.role === 'admin') return true;
    return role !== 'admin';
  };

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, isAuthenticated: true, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

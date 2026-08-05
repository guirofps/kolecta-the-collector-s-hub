import { createContext, useContext, ReactNode } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMyProfile } from '@/hooks/use-api';
import { CLERK_ENABLED } from '@/lib/clerk';

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

// `CLERK_ENABLED` é constante em runtime (vem de env), então escolher o provider
// aqui não viola as regras de hooks — o branch nunca muda entre renders.
export function AuthProvider({ children }: { children: ReactNode }) {
  if (CLERK_ENABLED) return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  // `import.meta.env.DEV` é substituído por `false` no build de produção, então
  // este ramo inteiro some do bundle publicado. Não existe caminho em que o
  // DevAuthProvider rode no site.
  if (import.meta.env.DEV) return <DevAuthProvider>{children}</DevAuthProvider>;
  return <DegradedAuthProvider>{children}</DegradedAuthProvider>;
}

/**
 * Auth de desenvolvimento, sem Clerk.
 *
 * O encanamento já existia inteiro e só faltava esta ponta: o `api.ts` manda
 * `x-dev-user-id` em toda requisição e o backend tem o `DevAuthMiddleware` que
 * lê esse header. Faltava alguém dizer ao `<ProtectedRoute>` que existe um
 * usuário, então TODA rota de painel rebatia para o login mesmo com o backend
 * respondendo normalmente. Quem não tem chave do Clerk não conseguia abrir
 * nenhuma tela autenticada localmente.
 *
 * Chave de PRODUÇÃO do Clerk não resolve: a API deles recusa com 400
 * ("Production Keys are only allowed for domain kolecta.com.br") antes de o app
 * carregar. Sem instância de Development, este é o único caminho.
 *
 * Quem manda é o backend: `isAuthenticated` só fica true quando `/api/users/me`
 * responde de verdade. Backend fora do ar ou recusando o dev user continua
 * dando tela de login, como deve ser.
 */
function DevAuthProvider({ children }: { children: ReactNode }) {
  // `isPending` e NÃO `isLoading`. No React Query v5, `isLoading` é
  // `isPending && isFetching`, e no primeiro render a busca ainda não começou:
  // ele vem false com `data` undefined. O `<ProtectedRoute>` lia isso como
  // "carregou e não tem ninguém" e mandava para o login antes de a requisição
  // sair do navegador. `isPending` fica true até haver dado ou erro.
  const { data: profile, isPending } = useMyProfile();

  const user: AuthUser = {
    id: profile?.id ?? '',
    name: profile?.name ?? 'Usuário',
    email: profile?.email ?? '',
    role: profile?.role ?? 'user',
    avatar: null,
  };

  const isAuthenticated = !!profile;

  // Igual ao provider real, com uma diferença: sem perfil não há papel nenhum.
  // No provider real quem barra é o Clerk; aqui é esta linha.
  const hasRole = (role: Role) => {
    if (!isAuthenticated) return false;
    if (user.role === 'admin') return true;
    return role !== 'admin';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, hasRole, isLoading: isPending }}>
      {children}
    </AuthContext.Provider>
  );
}

// Modo degradado: sem chave do Clerk, a auth fica desativada mas o app renderiza
// (landing, páginas públicas) em vez de quebrar em tela branca.
function DegradedAuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextType = {
    user: { id: '', name: 'Usuário', email: '', role: 'user', avatar: null },
    isAuthenticated: false,
    hasRole: (role: Role) => role !== 'admin',
    isLoading: false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Provider real: Clerk (sessão) + backend (perfil/role).
function ClerkAuthProvider({ children }: { children: ReactNode }) {
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

import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLaunchGate } from '@/hooks/use-launch-gate';

// Allowlist de rotas acessíveis ao público durante o pré-lançamento.
// Tudo que NÃO estiver aqui é fechado por padrão (fail-closed) — novas rotas
// nascem bloqueadas a menos que sejam adicionadas explicitamente.
//
// `/` é tratado à parte: não é redirecionado, a própria Index.tsx decide entre
// countdown e home usando o mesmo hook.
const OPEN_PREFIXES = [
  '/entrar',
  '/criar-conta',
  '/esqueci-senha',
  '/conta', // páginas da conta do usuário logado
  // Institucionais (conteúdo estático, ajudam a converter cadastro):
  '/como-funciona',
  '/taxas-e-comissoes',
  '/seguranca',
  '/ajuda',
  '/termos',
  '/privacidade',
];

function isOpenRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return OPEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

/**
 * Envolve a árvore de rotas. Enquanto o auth carrega, mostra spinner neutro
 * (nunca decide com role parcial, evitando "piscar" countdown/site). Com o gate
 * ativo (pré-lançamento + não-admin), redireciona qualquer rota fechada para `/`.
 */
export default function LaunchGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isLoading, gateActive } = useLaunchGate();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-kolecta-dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (gateActive && !isOpenRoute(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasLaunched } from '@/lib/launch';

// Recalcula "já lançou?" periodicamente para que a virada às 12:00 de 25/07
// abra o site sozinho em abas já abertas, sem exigir F5.
const POLL_MS = 30_000;

export interface LaunchGateState {
  /** Auth (Clerk + perfil/role do backend) ainda carregando — decidir depois. */
  isLoading: boolean;
  /** Ainda estamos antes da data de lançamento. */
  isPreLaunch: boolean;
  /** Usuário é admin (bypassa o gate completamente). */
  isAdmin: boolean;
  /** Gate ativo: pré-lançamento E não-admin → bloquear páginas fechadas. */
  gateActive: boolean;
}

/**
 * Fonte única da decisão do modo pré-lançamento, reusada por LaunchGate
 * (redirect), Index (countdown vs home) e Header (esconder links fechados).
 */
export function useLaunchGate(): LaunchGateState {
  const { hasRole, isLoading } = useAuth();

  const [launched, setLaunched] = useState<boolean>(() => hasLaunched());

  useEffect(() => {
    // Se já lançou, não há mais o que observar.
    if (launched) return;

    const tick = () => setLaunched(hasLaunched());
    const id = setInterval(tick, POLL_MS);
    // Checa uma vez na montagem (cobre o caso de a data já ter passado).
    tick();
    return () => clearInterval(id);
  }, [launched]);

  const isPreLaunch = !launched;
  const isAdmin = hasRole('admin');

  return {
    isLoading,
    isPreLaunch,
    isAdmin,
    gateActive: isPreLaunch && !isAdmin,
  };
}

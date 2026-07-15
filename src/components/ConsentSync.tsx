import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import {
  getStoredConsent,
  isConsentSynced,
  markConsentSynced,
} from '@/lib/legal-consent';

/**
 * Envia o aceite de Termos + LGPD (guardado no localStorage durante o cadastro)
 * ao backend assim que o usuário fica autenticado, atrelando o consentimento à
 * conta. Idempotente dos dois lados: marca sincronizado localmente e o backend
 * ignora reenvios. Não renderiza nada. Ver docs/PLAN-programa-fundadores.md (T10).
 *
 * IMPORTANTE: só deve ser montado quando o Clerk está ativo (usa useAuth).
 */
export default function ConsentSync() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    const record = getStoredConsent();
    if (!record || isConsentSynced()) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        await api.users.recordConsent(token || '', record);
        if (!cancelled) markConsentSynced();
      } catch {
        // Falhou: não marca como sincronizado — tenta de novo no próximo load.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  return null;
}

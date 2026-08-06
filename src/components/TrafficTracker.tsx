import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';

/**
 * Dispara um `page_view` a cada troca de rota, alimentando o funil próprio
 * (visitantes, tempo de sessão, online agora). Anônimo, sem cookie nem PII.
 * Fora do <Routes> de propósito: mede a navegação inteira e um erro aqui não
 * derruba a página.
 */
export default function TrafficTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackEvent('page_view');
  }, [pathname]);
  return null;
}

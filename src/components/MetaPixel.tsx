import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { metaTrack, metaTrackSignupOnce, isCadastroRecente } from '@/lib/meta-pixel';

/**
 * PageView a cada troca de rota. O index.html já dispara o primeiro,
 * então aqui pulamos a montagem inicial para não contar em dobro.
 */
export function MetaPixelPageView() {
  const { pathname } = useLocation();
  const primeiraRota = useRef(true);

  useEffect(() => {
    if (primeiraRota.current) {
      primeiraRota.current = false;
      return;
    }
    metaTrack('PageView');
  }, [pathname]);

  return null;
}

/**
 * Cadastro concluído. Só monta quando o Clerk está ativo (ver CLERK_ENABLED),
 * porque depende de `useUser`.
 *
 * O Clerk não avisa "acabou de se cadastrar", então usamos a data de criação
 * da conta: se ela nasceu nos últimos 30 minutos, é cadastro novo. Login de
 * quem já era cadastrado não dispara nada.
 */
export function MetaPixelSignup() {
  const { isSignedIn, user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (!isCadastroRecente(user.createdAt)) return;
    metaTrackSignupOnce(user.id);
  }, [isLoaded, isSignedIn, user]);

  return null;
}

// ── Meta Pixel ────────────────────────────────────────────────────────────
// O snippet base (init + PageView do primeiro carregamento) fica no index.html.
// Aqui ficam os disparos que dependem do app: troca de rota na SPA e eventos
// de conversão. Se o script do Meta não carregar (bloqueador, offline), tudo
// vira no-op — nada aqui pode quebrar a tela.

/** Eventos padrão do Meta que a Kolecta usa. */
export type MetaEvent =
  | 'PageView'
  | 'Lead'
  | 'CompleteRegistration'
  | 'ViewContent'
  | 'Search'
  | 'InitiateCheckout'
  | 'Purchase';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq(...args);
}

/** Dispara um evento padrão do Meta. */
export function metaTrack(event: MetaEvent, data?: Record<string, unknown>) {
  if (data) fbq('track', event, data);
  else fbq('track', event);
}

/** Dispara um evento customizado (não conta como evento padrão nas campanhas). */
export function metaTrackCustom(event: string, data?: Record<string, unknown>) {
  if (data) fbq('trackCustom', event, data);
  else fbq('trackCustom', event);
}

// ── Guarda de cadastro ────────────────────────────────────────────────────
// O evento de cadastro só pode contar uma vez por pessoa. Guardamos o id do
// usuário no navegador para não redisparar a cada login ou refresh.
const SIGNUP_KEY = 'kolecta_pixel_signup';

/** Janela em que uma conta ainda é considerada "recém-criada" (30 min). */
const NOVO_CADASTRO_MS = 30 * 60 * 1000;

/** A conta foi criada agora, ou é um login de alguém que já era cadastrado? */
export function isCadastroRecente(criadoEm: Date | null | undefined) {
  if (!criadoEm) return false;
  return Date.now() - criadoEm.getTime() < NOVO_CADASTRO_MS;
}

/**
 * Dispara o cadastro concluído uma única vez por usuário.
 * Manda `CompleteRegistration` (o evento semanticamente certo) e `Lead`
 * (que é o que as campanhas de captação otimizam).
 */
export function metaTrackSignupOnce(userId: string) {
  if (!userId) return;
  try {
    const jaContado = localStorage.getItem(SIGNUP_KEY);
    if (jaContado === userId) return;
    localStorage.setItem(SIGNUP_KEY, userId);
  } catch {
    // localStorage bloqueado (aba anônima com restrição): dispara mesmo assim.
  }
  metaTrack('CompleteRegistration', { content_name: 'Cadastro Kolecta' });
  metaTrack('Lead', { content_name: 'Candidato a Membro Fundador' });
}

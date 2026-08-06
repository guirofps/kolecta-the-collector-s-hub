// ─── Analytics de tráfego próprio ────────────────────────────────────────────
//
// Funil interno do painel: cada evento vira uma linha no backend, agrupado por
// uma sessão ANÔNIMA (id gerado no navegador, sem cookie nem PII). É o que
// alimenta "quantos viram, puseram no carrinho, abandonaram, compraram" na tela
// de Analytics. NÃO é o Google Analytics (que mede SEO/ads à parte).

type EventName =
  | 'page_view'
  | 'view_home'
  | 'search'
  | 'filter_apply'
  | 'view_product'
  | 'add_to_cart'
  | 'add_to_favorites'
  | 'remove_from_favorites'
  | 'start_sell_flow'
  | 'submit_listing'
  | 'bid_place'
  | 'bid_confirm'
  | 'buy_now_click'
  | 'checkout_start'
  | 'purchase_complete'
  | 'contact_seller'
  | 'report_listing'
  | 'admin_approve_listing'
  | 'admin_reject_listing'
  | 'promo_click'
  | 'view_seller_dashboard';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const SID_KEY = 'kolecta_sid';

/** Id da sessão anônima. Persistente por navegador, sem identificar a pessoa. */
function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let s = localStorage.getItem(SID_KEY);
    if (!s) {
      s = (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SID_KEY, s);
    }
    return s;
  } catch {
    return 'anon';
  }
}

interface EventoFila {
  sessionId: string;
  event: string;
  path?: string;
  listingId?: string;
  meta?: string;
}

let fila: EventoFila[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!fila.length) return;
  const lote = fila.splice(0, 50);
  try {
    // keepalive garante o envio mesmo quando a página está saindo (purchase na
    // navegação). Falha em silêncio: medição nunca pode quebrar a experiência.
    fetch(`${API_BASE}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: lote }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignora */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function trackEvent(event: EventName, data?: Record<string, unknown>) {
  // Ponte com o gtag/Google, quando existir (o Guilherme vai plugar o GA à parte).
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, data);
  }
  if (typeof window === 'undefined') return;

  const listingId =
    (data?.id as string) ?? (data?.listingId as string) ?? (data?.productId as string) ?? undefined;
  fila.push({
    sessionId: sessionId(),
    event,
    path: window.location?.pathname,
    listingId: typeof listingId === 'string' ? listingId : undefined,
    meta: data ? JSON.stringify(data).slice(0, 1000) : undefined,
  });

  // Junta alguns antes de mandar, para não fazer uma requisição por clique.
  if (fila.length >= 8) flush();
  else if (!timer) timer = setTimeout(flush, 3000);
}

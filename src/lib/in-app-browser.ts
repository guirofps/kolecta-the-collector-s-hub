// ─── Detecção de navegador EMBUTIDO (in-app / webview) ───────────────────────
//
// Instagram, Facebook, TikTok e afins abrem links num navegador embutido, não no
// Chrome/Safari de verdade. Nesses webviews o login trava: o Clerk às vezes nem
// inicializa (storage/cookies bloqueados) e o "Continuar com Google" é RECUSADO
// pelo próprio Google (`disallowed_useragent`) por questão de segurança. Foi o
// que a galera que veio do Instagram relatou: seguem a loja, mas não conseguem
// criar a conta. A saída é orientar a abrir no navegador do sistema.

export interface InAppBrowser {
  isInApp: boolean;
  /** Nome amigável do app quando dá pra identificar (ex.: "Instagram"). */
  app: string | null;
}

const APPS: { re: RegExp; nome: string }[] = [
  { re: /Instagram/i, nome: 'Instagram' },
  // FBAN/FBAV = app do Facebook; FB_IAB = in-app browser do Facebook/Messenger.
  { re: /FBAN|FBAV|FB_IAB|Messenger/i, nome: 'Facebook' },
  { re: /TikTok|musical_ly|BytedanceWebview/i, nome: 'TikTok' },
  { re: /Line\//i, nome: 'LINE' },
  { re: /Twitter/i, nome: 'Twitter' },
  { re: /Snapchat/i, nome: 'Snapchat' },
  { re: /Pinterest/i, nome: 'Pinterest' },
  { re: /LinkedInApp/i, nome: 'LinkedIn' },
];

/** Identifica o app embutido a partir do user agent. SSR-safe. */
export function detectInAppBrowser(): InAppBrowser {
  if (typeof navigator === 'undefined') return { isInApp: false, app: null };
  const ua = navigator.userAgent || '';
  for (const { re, nome } of APPS) {
    if (re.test(ua)) return { isInApp: true, app: nome };
  }
  return { isInApp: false, app: null };
}

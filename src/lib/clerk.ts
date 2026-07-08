// Sem fallback hardcoded: a chave vem SEMPRE da env var (local: .env.local com
// pk_test_ da instância de dev; produção: VITE_CLERK_PUBLISHABLE_KEY = pk_live_
// na Vercel). Se a env faltar, CLERK_ENABLED fica false e a auth é desativada
// de forma visível — melhor que embutir uma chave de teste no bundle de produção.
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";

export const CLERK_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY);

// Alerta de build errado: um bundle de PRODUÇÃO com chave pk_test_ deixa o site
// em "Development mode". A chave é embutida no build (Vite), então isso só se
// corrige com a env var certa + redeploy na Vercel — ver docs/STATUS-clerk-producao.md.
if (import.meta.env.PROD && CLERK_PUBLISHABLE_KEY.startsWith('pk_test_')) {
  console.error(
    '[Clerk] Build de PRODUÇÃO com chave pk_test_ → site fica em "Development mode". ' +
      'Defina VITE_CLERK_PUBLISHABLE_KEY=pk_live_ no escopo Production da Vercel e refaça o deploy sem cache.',
  );
}

/**
 * Tema Clerk com a identidade da Kolecta.
 *
 * Mapeado a partir dos tokens do `index.css` (primary gold #FFCC00 = hsl(48 100% 50%),
 * texto navy, cards claros, radius 0.5rem). Aplicado globalmente no `ClerkProvider`,
 * então tematiza de uma vez o `UserButton`, o dropdown E o modal "Manage account".
 *
 * Importante: NÃO mirar classes `cl-internal-*` (hash instável). Usar as keys
 * semânticas de `elements` abaixo.
 */
export const kolectaClerkAppearance = {
  variables: {
    colorPrimary: 'hsl(48, 100%, 50%)',
    colorText: 'hsl(225, 20%, 12%)',
    colorTextSecondary: 'hsl(225, 8%, 45%)',
    colorBackground: 'hsl(0, 0%, 100%)',
    colorInputBackground: 'hsl(225, 10%, 94%)',
    colorInputText: 'hsl(225, 20%, 12%)',
    borderRadius: '0.5rem',
    fontFamily: 'inherit',
  },
  elements: {
    // ── Trigger (avatar no header) ──
    userButtonAvatarBox: 'ring-2 ring-primary/40',
    // ── Dropdown popover ──
    userButtonPopoverCard: 'bg-card border border-border shadow-xl',
    userButtonPopoverActionButton: 'text-foreground hover:bg-accent/30',
    userButtonPopoverActionButtonText: 'font-body',
    userButtonPopoverActionButtonIcon: 'text-primary',
    // ── Modal "Manage account" (UserProfile) ──
    card: 'bg-card border border-border',
    headerTitle: 'font-heading uppercase tracking-tight',
    profileSectionTitleText: 'font-heading uppercase',
    formButtonPrimary:
      'bg-primary text-primary-foreground font-heading uppercase tracking-tight hover:bg-primary/90',
    badge: 'bg-primary/15 text-primary',
    footerActionLink: 'text-primary hover:text-primary/80',
  },
};

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
 * As cores são AMARRADAS aos tokens CSS do app (`hsl(var(--token))` do
 * `index.css`), então viram sozinhas no modo escuro pela classe `.dark` — sem
 * isso o widget ficava com tema claro fixo (texto navy sobre card claro) e, no
 * dark, os rótulos sumiam e o rodapé aparecia numa faixa branca. Aplicado
 * globalmente no `ClerkProvider`: tematiza `SignIn`, `UserButton`, o dropdown E
 * o modal "Manage account".
 *
 * Importante: NÃO mirar classes `cl-internal-*` (hash instável). Usar as keys
 * semânticas de `elements` abaixo, e as classes Tailwind (bg-card, text-*) que
 * já são theme-aware.
 */
export const kolectaClerkAppearance = {
  variables: {
    colorPrimary: 'hsl(var(--primary))',
    colorText: 'hsl(var(--card-foreground))',
    colorTextSecondary: 'hsl(var(--muted-foreground))',
    colorTextOnPrimaryBackground: 'hsl(var(--primary-foreground))',
    colorBackground: 'hsl(var(--card))',
    colorInputBackground: 'hsl(var(--input))',
    colorInputText: 'hsl(var(--foreground))',
    colorDanger: 'hsl(var(--accent))',
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
    // ── Card (SignIn/SignUp e modal "Manage account") ──
    card: 'bg-card border border-border',
    // O rodapé "Não possui conta?" vinha numa faixa clara fixa; força o token.
    footer: 'bg-card border-t border-border',
    footerAction: 'bg-card',
    footerActionText: 'text-muted-foreground',
    headerTitle: 'font-heading uppercase tracking-tight',
    profileSectionTitleText: 'font-heading uppercase',
    formButtonPrimary:
      'bg-primary text-primary-foreground font-heading uppercase tracking-tight hover:bg-primary/90',
    badge: 'bg-primary/15 text-primary',
    footerActionLink: 'text-primary hover:text-primary/80',
  },
};

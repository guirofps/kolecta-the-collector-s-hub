import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, ShieldCheck, Gavel,
  AlertTriangle, DollarSign, BarChart3, Settings, Megaphone, Wallet, Award, Activity,
} from 'lucide-react';
import Header from './Header';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users },
  { label: 'Verificação', href: '/admin/vendedores/verificacao', icon: ShieldCheck },
  { label: 'Fundadores', href: '/admin/fundadores', icon: Award },
  { label: 'Anúncios', href: '/admin/anuncios', icon: Package },
  { label: 'Modo Lance', href: '/admin/modo-lance', icon: Gavel },
  { label: 'Disputas', href: '/admin/disputas', icon: AlertTriangle },
  { label: 'Comissões', href: '/admin/comissoes-e-taxas', icon: DollarSign },
  { label: 'Financeiro', href: '/admin/financeiro', icon: Wallet },
  { label: 'Mídia', href: '/admin/midia', icon: Megaphone },
  { label: 'Analytics', href: '/admin/analytics', icon: Activity },
  { label: 'Relatórios', href: '/admin/relatorios', icon: BarChart3 },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* pt-16 compensa o Header, que é fixo. */}
      <div className="flex-1 flex flex-col pt-16">
        {/* Navegação do admin em tela pequena. A barra lateral some abaixo de
            1024px e o Header não tem link de admin nenhum, então sem isto o
            celular ficava sem forma de trocar de página, só digitando a URL. */}
        <nav className="lg:hidden sticky top-16 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                )}
              >
                <link.icon className="h-3.5 w-3.5 shrink-0" />
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex-1 flex">
          <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-card/50 py-6 px-3 gap-1">
            <span className="font-heading text-[10px] uppercase tracking-widest text-accent px-3 mb-3">
              Admin
            </span>
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            ))}
          </aside>
          {/* pb-16 no mobile: existe uma barra de navegação fixa no rodapé que
              tampava o fim da página. min-w-0 evita que tabela larga estoure. */}
          <main className="flex-1 min-w-0 pb-16 lg:pb-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, PlusCircle, ShoppingBag, Gavel, Wallet, MessageSquare, Settings, Megaphone } from 'lucide-react';
import Header from './Header';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { label: 'Dashboard', href: '/painel', icon: LayoutDashboard },
  { label: 'Anúncios', href: '/painel/anuncios', icon: Package },
  { label: 'Novo Anúncio', href: '/painel/anuncios/novo', icon: PlusCircle },
  { label: 'Pedidos', href: '/painel/pedidos', icon: ShoppingBag },
  { label: 'Modo Lance', href: '/painel/modo-lance', icon: Gavel },
  { label: 'Financeiro', href: '/painel/financeiro', icon: Wallet },
  { label: 'Mensagens', href: '/painel/mensagens', icon: MessageSquare },
  { label: 'Mídia', href: '/painel/midia', icon: Megaphone },
  { label: 'Configurações', href: '/painel/configuracoes', icon: Settings },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex pt-16">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-card/50 py-6 px-3 gap-1">
          <span className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-3">
            Painel do Vendedor
          </span>
          {sidebarLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/painel' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

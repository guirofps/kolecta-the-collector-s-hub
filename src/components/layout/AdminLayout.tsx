import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, ShieldCheck, Gavel,
  AlertTriangle, DollarSign, BarChart3, Settings, Megaphone, Wallet,
} from 'lucide-react';
import Header from './Header';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users },
  { label: 'Verificação', href: '/admin/vendedores/verificacao', icon: ShieldCheck },
  { label: 'Anúncios', href: '/admin/anuncios', icon: Package },
  { label: 'Modo Lance', href: '/admin/modo-lance', icon: Gavel },
  { label: 'Denúncias', href: '/admin/denuncias', icon: AlertTriangle },
  { label: 'Comissões', href: '/admin/comissoes-e-taxas', icon: DollarSign },
  { label: 'Financeiro', href: '/admin/financeiro', icon: Wallet },
  { label: 'Mídia', href: '/admin/midia', icon: Megaphone },
  { label: 'Relatórios', href: '/admin/relatorios', icon: BarChart3 },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex pt-16">
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-card/50 py-6 px-3 gap-1">
          <span className="font-heading text-[10px] uppercase tracking-widest text-accent px-3 mb-3">
            Admin
          </span>
          {sidebarLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </aside>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

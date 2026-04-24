import { useUser } from '@clerk/clerk-react';
import { Link, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import {
  ShoppingBag,
  Gavel,
  Heart,
  MapPin,
  CreditCard,
  ShieldCheck,
  MessageSquare,
  Star,
  AlertTriangle,
  Store,
  ArrowRight,
  Wallet,
  TrendingUp,
  Loader2,
  Shield,
} from 'lucide-react';
import { useWallet, useMyProfile } from '@/hooks/use-api';

// ── Helpers ───────────────────────────────────────────────

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Menu items ────────────────────────────────────────────

const menuItems = [
  { label: 'Meus Pedidos', href: '/conta/pedidos', icon: ShoppingBag, description: 'Acompanhe suas compras' },
  { label: 'Meus Lances', href: '/conta/lances', icon: Gavel, description: 'Lances ativos e histórico' },
  { label: 'Favoritos', href: '/conta/favoritos', icon: Heart, description: 'Itens salvos' },
  { label: 'Endereços', href: '/conta/enderecos', icon: MapPin, description: 'Gerenciar endereços' },
  { label: 'Pagamentos', href: '/conta/pagamentos', icon: CreditCard, description: 'Métodos de pagamento' },
  { label: 'Verificação', href: '/conta/verificacao', icon: ShieldCheck, description: 'Status da verificação' },
  { label: 'Mensagens', href: '/conta/mensagens', icon: MessageSquare, description: 'Chat com vendedores' },
  { label: 'Avaliações', href: '/conta/avaliacoes', icon: Star, description: 'Minhas avaliações' },
  { label: 'Disputas', href: '/conta/disputas', icon: AlertTriangle, description: 'Acompanhar disputas' },
];

// ── Wallet Summary Component ──────────────────────────────

function WalletSummary() {
  const { data, isLoading, isError } = useWallet();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[0, 1].map((i) => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-5 w-32 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {/* Saldo disponível */}
      <Link to="/conta/pagamentos">
        <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors cursor-pointer">
          <CardContent className="flex items-center gap-4 p-5">
            <Wallet className="h-8 w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-body">Saldo disponível</p>
              <p className="font-heading font-extrabold text-lg text-primary">{formatBRL(data.balanceInCents)}</p>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto text-primary shrink-0" />
          </CardContent>
        </Card>
      </Link>

      {/* Saldo pendente */}
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-5">
          <TrendingUp className="h-8 w-8 text-kolecta-gold shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-body">Saldo pendente</p>
            <p className="font-heading font-extrabold text-lg">{formatBRL(data.pendingInCents)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════

export default function AccountDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { data: profile } = useMyProfile();
  const isAdmin = profile?.role === 'admin';

  if (!isLoaded) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/entrar" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 min-h-[70vh]">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold italic uppercase">
            Olá, {user.firstName || 'Colecionador'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>

        {/* Wallet Overview — dados reais da API */}
        <h2 className="font-heading text-lg font-bold uppercase mb-4">Minha Carteira</h2>
        <WalletSummary />

        {/* Admin Panel Link — apenas para admins */}
        {isAdmin && (
          <div className="mb-6">
            <Link to="/admin" className="block">
              <Card className="bg-red-500/10 border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <Shield className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="font-heading font-bold uppercase text-sm">Painel Admin</p>
                    <p className="text-xs text-muted-foreground">Gerenciar plataforma, anúncios e usuários</p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-red-500" />
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link to="/painel" className="block">
            <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-5">
                <Store className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-heading font-bold uppercase text-sm">Painel do Vendedor</p>
                  <p className="text-xs text-muted-foreground">Gerencie seus anúncios</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/busca" className="block">
            <Card className="bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-5">
                <ShoppingBag className="h-8 w-8 text-foreground" />
                <div>
                  <p className="font-heading font-bold uppercase text-sm">Explorar</p>
                  <p className="text-xs text-muted-foreground">Encontre colecionáveis</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/modo-lance" className="block">
            <Card className="bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-5">
                <Gavel className="h-8 w-8 text-foreground" />
                <div>
                  <p className="font-heading font-bold uppercase text-sm">Modo Lance</p>
                  <p className="text-xs text-muted-foreground">Leilões ativos</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Menu grid */}
        <h2 className="font-heading text-lg font-bold uppercase mb-4">Minha Conta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="bg-card border-border hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <item.icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

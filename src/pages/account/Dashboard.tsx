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
  AlertCircle,
} from 'lucide-react';
import { useWallet, useMyProfile, useConnect } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/currency';

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

  if (isError || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="font-heading font-bold">Carteira Indisponível</p>
            <p className="text-xs text-muted-foreground">Não foi possível carregar o saldo ou a carteira ainda não foi criada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {/* Saldo disponível */}
      <Link to="/conta/pagamentos">
        <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors cursor-pointer">
          <CardContent className="flex items-center gap-4 p-5">
            <Wallet className="h-8 w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-body">Saldo disponível</p>
              <p className="font-heading font-extrabold text-lg text-primary">{formatBRL(data.balanceInCents / 100)}</p>
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
            <p className="font-heading font-extrabold text-lg">{formatBRL(data.pendingInCents / 100)}</p>
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
  const { statusQuery, loginLinkMutation } = useConnect();
  
  const isAdmin = profile?.role === 'admin';
  const showStripeAlert = statusQuery.data && !statusQuery.data.chargesEnabled;

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

        {/* Stripe Connect alert */}
        {showStripeAlert && (
          <div className="mb-6">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm font-bold uppercase">Configure seus recebimentos</p>
                  <p className="text-xs text-muted-foreground">Conecte sua conta bancária para começar a vender na plataforma</p>
                </div>
                <Button variant="kolecta" size="sm" asChild>
                  <Link to="/painel/stripe-onboarding">Conectar conta bancária</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* Stripe Express Access — apenas se ativo */}
        {statusQuery.data?.status === 'active' && (
          <div className="mb-6">
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-heading font-bold uppercase text-sm">Conta Stripe Conectada</p>
                  <p className="text-xs text-muted-foreground">Gerencie seus dados bancários e visualize extratos detalhados</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => loginLinkMutation.mutate()}
                  disabled={loginLinkMutation.isPending}
                >
                  {loginLinkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><CreditCard className="h-4 w-4 mr-2" /> Gerenciar no Stripe</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link to="/painel" className="block">
            <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-5">
                <Store className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-heading font-bold uppercase text-sm">Painel de Vendas</p>
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

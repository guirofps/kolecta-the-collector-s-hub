import { useUser } from '@clerk/clerk-react';
import { Link, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

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

export default function AccountDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
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

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link to="/painel-vendedor" className="block">
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

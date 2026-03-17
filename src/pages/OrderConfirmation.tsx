import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Package, MessageCircle, Search } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { formatBRL } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Mock fallback data ───────────────────────────────────

const mockOrder = {
  number: '#KL-000123',
  items: [
    { name: 'Tomica Limited Vintage Neo – Toyota AE86 Sprinter Trueno', image: '/placeholder.svg', quantity: 1, price: 289 },
    { name: 'Majorette Porsche 911 GT3 RS – Racing Edition', image: '/placeholder.svg', quantity: 2, price: 45 },
  ],
  address: 'Rua Augusta, 1234 — São Paulo/SP',
  deliveryEstimate: '5 a 8 dias úteis',
  total: 379,
};

// ═════════════════════════════════════════════════════════

export default function OrderConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  // Merge location state with mock fallback
  const order = (location.state as typeof mockOrder) || mockOrder;

  // Clear cart + replace history so back button won't return to checkout
  useEffect(() => {
    clearCart();
    navigate(location.pathname, { replace: true, state: order });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="container py-12 flex justify-center">
        <div className="w-full max-w-[640px] space-y-8">

          {/* ── Hero ──────────────────────────────────── */}
          <div className="text-center space-y-3 animate-slide-up">
            <div className="inline-flex items-center justify-center glow-primary-strong rounded-full p-3 mb-2">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <h1 className="font-heading text-4xl font-bold uppercase tracking-tight">
              Pedido Confirmado!
            </h1>
            <p className="text-muted-foreground animate-fade-in">{order.number}</p>
            <Badge className="bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600/90">
              Pagamento aprovado
            </Badge>
          </div>

          {/* ── Order summary card ────────────────────── */}
          <Card className="bg-gradient-card animate-fade-in">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Resumo</h2>

              {/* Items */}
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-xs font-bold uppercase truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <span className="font-heading text-sm font-bold text-primary shrink-0">
                      {formatBRL(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="line-tech" />

              {/* Address + delivery */}
              <div className="space-y-1 text-sm font-body">
                <p><span className="text-muted-foreground">Entregar em:</span> {order.address}</p>
                <p><span className="text-muted-foreground">Prazo estimado:</span> {order.deliveryEstimate}</p>
              </div>

              <div className="line-tech" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-heading text-base font-bold uppercase">Total pago</span>
                <span className="font-heading text-xl font-bold text-primary">{formatBRL(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* ── Next steps ────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
            {[
              { icon: Package, label: 'Acompanhe seu pedido', to: '/conta/pedidos' },
              { icon: MessageCircle, label: 'Fale com o vendedor', to: '/conta/mensagens' },
              { icon: Search, label: 'Continue explorando', to: '/' },
            ].map(step => (
              <Card key={step.to} className="text-center">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <step.icon className="h-6 w-6 text-primary" />
                  <p className="font-heading text-xs font-bold uppercase tracking-wide">{step.label}</p>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={step.to}>Ir →</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── CTAs ──────────────────────────────────── */}
          <div className="space-y-3 animate-fade-in">
            <Button variant="kolecta" size="lg" className="w-full glow-primary" asChild>
              <Link to="/conta/pedidos">Ver meus pedidos</Link>
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>

        </div>
      </div>
    </Layout>
  );
}

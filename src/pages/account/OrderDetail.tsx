import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import StatusTimeline from '@/components/StatusTimeline';
import DisputeModal from '@/components/DisputeModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Truck, Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatBRL } from '@/lib/mock-data';

// Mock order data
const mockOrder = {
  id: 'ORD-2026-0042',
  product: {
    title: 'Hot Wheels RLC Nissan Skyline GT-R R34 – Edição Exclusiva',
    image: '/placeholder.svg',
    price: 520,
    condition: 'Lacrado',
  },
  seller: { name: 'JDM Garage Collectibles', verified: true },
  status: 'verificacao' as const,
  tracking: 'BR123456789XX',
  paidAt: '2026-02-16T10:00:00Z',
  shippedAt: '2026-02-17T14:00:00Z',
  deliveredAt: '2026-02-20T09:00:00Z',
  verificationEndsAt: '2026-02-27T09:00:00Z',
  daysLeft: 5,
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const order = mockOrder;

  const handleConfirm = () => {
    setConfirmed(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back */}
        <Button variant="ghost-light" size="sm" className="mb-6" asChild>
          <Link to="/conta/pedidos"><ArrowLeft className="h-4 w-4" /> Meus Pedidos</Link>
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">Pedido #{order.id}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pago em {new Date(order.paidAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Badge className="bg-accent/10 text-accent border border-accent/20 text-xs font-heading uppercase">
            Verificação
          </Badge>
        </div>

        {/* Timeline */}
        <div className="p-6 rounded-lg border border-border bg-card mb-6">
          <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Status do Pedido</h2>
          <StatusTimeline currentStep={confirmed ? 'concluido' : order.status} daysLeft={order.daysLeft} />
        </div>

        {/* Verification period actions */}
        {order.status === 'verificacao' && !confirmed && (
          <div className="p-5 rounded-lg border border-accent/20 bg-accent/5 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Período de verificação</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você tem <span className="text-accent font-bold">{order.daysLeft} dias</span> para verificar autenticidade e condição do item.
                  Se não houver problema, confirme o recebimento.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="kolecta" size="sm" onClick={handleConfirm}>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar recebimento
              </Button>
              <Button variant="accent" size="sm" onClick={() => setDisputeOpen(true)}>
                <AlertTriangle className="h-4 w-4" />
                Reportar problema
              </Button>
            </div>
          </div>
        )}

        {confirmed && (
          <div className="p-5 rounded-lg border border-primary/20 bg-primary/5 mb-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="font-heading text-lg font-bold text-primary uppercase">Recebimento confirmado!</p>
            <p className="text-xs text-muted-foreground mt-1">O pagamento será liberado ao vendedor.</p>
          </div>
        )}

        {/* Product info */}
        <div className="p-4 rounded-lg border border-border bg-card mb-6">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-md overflow-hidden bg-kolecta-dark shrink-0">
              <img src={order.product.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground">{order.product.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{order.product.condition}</p>
              <p className="font-heading text-lg font-bold text-foreground mt-2">{formatBRL(order.product.price)}</p>
            </div>
          </div>
        </div>

        {/* Tracking */}
        {order.tracking && (
          <div className="p-4 rounded-lg border border-border bg-card mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Rastreio</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm text-foreground font-mono">{order.tracking}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Seller */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Vendedor</span>
          <p className="text-sm text-foreground mt-1">{order.seller.name}</p>
        </div>

        <DisputeModal open={disputeOpen} onOpenChange={setDisputeOpen} orderId={order.id} />
      </div>
    </Layout>
  );
}

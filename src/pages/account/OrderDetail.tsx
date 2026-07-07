import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import StatusTimeline, { type OrderStep } from '@/components/StatusTimeline';
import DisputeModal from '@/components/DisputeModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/EmptyState';
import { ArrowLeft, Package, Truck, Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useOrderById, useConfirmDelivery } from '@/hooks/use-api';
import type { Order, OrderStatus } from '@/lib/api';
import { formatBRL } from '@/lib/currency';

// Mapeia o status da API para o passo exibido na timeline.
function toStep(status: OrderStatus): OrderStep {
  switch (status) {
    case 'pending':
    case 'paid':
    case 'processing':
      return 'pago';
    case 'shipped':
      return 'enviado';
    case 'delivered':
    case 'disputed':
      return 'verificacao';
    default:
      return 'pago';
  }
}

// Janela de verificação de 7 dias a partir da entrega (updatedAt no status `delivered`).
const VERIFICATION_DAYS = 7;
function daysLeftFrom(order: Order): number | undefined {
  if (order.status !== 'delivered') return undefined;
  const end = new Date(order.updatedAt).getTime() + VERIFICATION_DAYS * 24 * 60 * 60 * 1000;
  const diff = end - Date.now();
  return diff > 0 ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { data: order, isLoading, isError } = useOrderById(id ?? '');
  const confirmDelivery = useConfirmDelivery();

  const handleConfirm = async () => {
    if (!order) return;
    await confirmDelivery.mutateAsync(order.id);
    setConfirmed(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  if (isError || !order) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <EmptyState
            icon={Package}
            title="Pedido não encontrado"
            action={
              <Button variant="kolecta" asChild>
                <Link to="/conta/pedidos">Voltar aos meus pedidos</Link>
              </Button>
            }
          />
        </div>
      </Layout>
    );
  }

  const step = toStep(order.status);
  const daysLeft = daysLeftFrom(order);
  const inVerification = order.status === 'delivered';

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
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Criado em {new Date(order.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          {inVerification && (
            <Badge className="bg-accent/10 text-accent border border-accent/20 text-xs font-heading uppercase">
              Verificação
            </Badge>
          )}
        </div>

        {/* Timeline */}
        <div className="p-6 rounded-lg border border-border bg-card mb-6">
          <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Status do Pedido</h2>
          <StatusTimeline currentStep={confirmed ? 'concluido' : step} daysLeft={daysLeft} />
        </div>

        {/* Verification period actions */}
        {inVerification && !confirmed && (
          <div className="p-5 rounded-lg border border-accent/20 bg-accent/5 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Período de verificação</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você tem <span className="text-accent font-bold">{daysLeft ?? VERIFICATION_DAYS} dias</span> para verificar autenticidade e condição do item.
                  Se não houver problema, confirme o recebimento.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="kolecta" size="sm" onClick={handleConfirm} disabled={confirmDelivery.isPending}>
                <CheckCircle2 className="h-4 w-4" />
                {confirmDelivery.isPending ? 'Confirmando...' : 'Confirmar recebimento'}
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
              <img src={order.listing?.images?.[0] || '/placeholder.svg'} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground">{order.listing?.title ?? 'Item'}</h3>
              <p className="font-heading text-lg font-bold text-foreground mt-2">{formatBRL(order.totalInCents / 100)}</p>
            </div>
          </div>
        </div>

        {/* Tracking */}
        {order.trackingCode && (
          <div className="p-4 rounded-lg border border-border bg-card mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Rastreio</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm text-foreground font-mono">{order.trackingCode}</code>
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
          <p className="text-sm text-foreground mt-1">{order.seller?.name ?? '—'}</p>
        </div>

        <DisputeModal open={disputeOpen} onOpenChange={setDisputeOpen} orderId={order.id} />
      </div>
    </Layout>
  );
}

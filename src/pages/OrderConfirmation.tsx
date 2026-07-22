import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useOrderById } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, ArrowRight, Loader2, Clock, XCircle } from 'lucide-react';
import { formatBRL } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';

// F18: rótulo legível do status (antes exibia "paid"/"processing" cru).
const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pagamento confirmado',
  processing: 'Em separação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  disputed: 'Disputa aberta',
};

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  // Pagamento PIX é assíncrono: o pedido chega aqui 'pending' e só vira 'paid'
  // quando o webhook da Pagar.me confirma. Fazemos polling até confirmar.
  const { data: order, isLoading } = useOrderById(orderId ?? '', {
    pollWhilePending: true,
  });

  // 'pending' = aguardando confirmação do PIX; 'cancelled' = pagamento não
  // concluído/cancelado (F34: antes qualquer status não-pendente virava
  // "Pagamento Aprovado!", inclusive falha); demais = pago/processado.
  const isPending = order?.status === 'pending';
  const isFailed = order?.status === 'cancelled';

  useEffect(() => {
    if (orderId && order && order.status !== 'pending') {
      trackEvent('purchase_complete', { orderId });
    }
  }, [orderId, order]);

  if (!orderId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Nenhum pedido encontrado!</h1>
          <Button className="mt-4" asChild>
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-kolecta-green" />
            <p className="text-muted-foreground text-sm uppercase tracking-wider">Confirmando seu pagamento...</p>
          </div>
        ) : !order ? (
          <div className="text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold uppercase italic text-foreground tracking-wider mb-2">
              Pedido não encontrado
            </h1>
            <p className="text-muted-foreground">Não conseguimos localizar os detalhes deste pedido.</p>
          </div>
        ) : (
          <div className="max-w-2xl w-full">
            <div className="text-center mb-10">
              {isPending ? (
                <>
                  <div className="mx-auto w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                    <Clock className="w-10 h-10 animate-pulse" />
                  </div>
                  <h1 className="font-heading text-4xl sm:text-5xl font-extrabold italic uppercase text-foreground mb-4">
                    Aguardando pagamento
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Assim que o PIX for confirmado, seu pedido é processado automaticamente.
                    Esta página atualiza sozinha — pode deixar aberta.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando o pagamento...
                  </div>
                </>
              ) : isFailed ? (
                <>
                  <div className="mx-auto w-20 h-20 bg-kolecta-red/10 text-kolecta-red rounded-full flex items-center justify-center mb-6">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <h1 className="font-heading text-4xl sm:text-5xl font-extrabold italic uppercase text-foreground mb-4">
                    Pagamento não concluído
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Este pedido foi cancelado ou o pagamento não foi confirmado a tempo.
                    Você pode tentar a compra novamente.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-20 h-20 bg-kolecta-green/10 text-kolecta-green rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h1 className="font-heading text-4xl sm:text-5xl font-extrabold italic uppercase text-foreground mb-4">
                    Pagamento Aprovado!
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Seu pedido foi processado com sucesso. O vendedor será notificado para preparar o envio.
                  </p>
                </>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
              {/* Header do resumo */}
              <div className="border-b border-border pb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-heading mb-1">
                    Número do Pedido
                  </p>
                  <p className="font-mono text-sm sm:text-base font-semibold text-foreground">
                    #{order.id.slice(0,8).toUpperCase()}
                  </p>
                </div>
                
                <div className="md:text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-heading mb-1">
                    Total
                  </p>
                  <p className="font-heading text-2xl font-bold text-kolecta-green">
                    {formatBRL(order.totalInCents / 100)}
                  </p>
                </div>
              </div>

              {/* Detalhes do item */}
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                  Detalhes da Compra
                </h3>
                
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-secondary rounded-lg overflow-hidden shrink-0 border border-border">
                    <img 
                      src={order.listing?.images?.[0] || '/placeholder.svg'} 
                      alt="Produto" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{order.listing?.title || 'Produto Indisponível'}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status da operação: <span className="font-semibold text-primary">{STATUS_LABELS[order.status] ?? order.status}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild variant="kolecta" size="lg" className="px-8">
                {/* F17: comprador vai para os pedidos DELE (/conta), não o painel do vendedor. */}
                <Link to="/conta/pedidos">
                  Rastrear Meus Pedidos
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8">
                <Link to="/busca">
                  Continuar Colecionando
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Package, ChevronLeft, ChevronRight, MessageCircle, Star, Loader2, Truck } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import AuctionShippingDialog from '@/components/AuctionShippingDialog';
import { useOrders, useStartConversationFromOrder, useConfirmDelivery, useCreateReview, useCancelOrder, usePayAuctionOrder } from '@/hooks/use-api';
import type { Order, OrderStatus } from '@/lib/api';
import { formatBRL } from '@/lib/currency';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Tempo restante até o prazo (arremate pending_payment). Null se já venceu.
function timeLeft(iso?: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return h >= 1 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

// ── Status config ────────────────────────────────────────
// F11: `completed` passa a ter rótulo e cor (antes vazava "completed" cru).

const statusMap: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Aguardando pagamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  pending_payment: { label: 'Pagamento pendente', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  paid:       { label: 'Pagamento confirmado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  processing: { label: 'Em separação',        cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  shipped:    { label: 'Enviado',              cls: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30' },
  delivered:  { label: 'Entregue',            cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  completed:  { label: 'Concluído',           cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  cancelled:  { label: 'Cancelado',           cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
  disputed:   { label: 'Disputa aberta',      cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

type TabKey = 'todos' | 'em-andamento' | 'entregues' | 'cancelados';

// F9: a aba filtrava pelo status 'active', que não existe → sempre vazia.
// Cada aba agora agrupa os status reais que fazem sentido nela.
const TAB_STATUSES: Record<TabKey, OrderStatus[] | null> = {
  todos: null,
  'em-andamento': ['pending', 'pending_payment', 'paid', 'processing', 'shipped', 'disputed'],
  entregues: ['delivered', 'completed'],
  cancelados: ['cancelled'],
};

const emptyMessages: Record<TabKey, { title: string; showCta: boolean }> = {
  todos: { title: 'Você ainda não fez nenhum pedido', showCta: true },
  'em-andamento': { title: 'Nenhum pedido em andamento', showCta: false },
  entregues: { title: 'Nenhum pedido entregue ainda', showCta: false },
  cancelados: { title: 'Nenhum pedido cancelado', showCta: false },
};

const ITEMS_PER_PAGE = 10;
// Buscamos uma página ampla e paginamos/filtramos no cliente. Interino: enquanto
// o backend não devolve total nem filtro multi-status (ver decisão D6), isto dá
// paginação e abas corretas no volume atual da plataforma.
const FETCH_LIMIT = 200;

// ═════════════════════════════════════════════════════════

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('status') as TabKey) in TAB_STATUSES
    ? (searchParams.get('status') as TabKey)
    : 'todos';
  const currentPage = Number(searchParams.get('page') || '1');

  const { data: allOrders = [], isLoading } = useOrders(undefined, 1, FETCH_LIMIT);

  const filtered = useMemo(() => {
    const wanted = TAB_STATUSES[activeTab];
    return wanted ? allOrders.filter((o) => wanted.includes(o.status)) : allOrders;
  }, [allOrders, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  function setTab(tab: string) {
    setSearchParams({ status: tab, page: '1' });
  }

  function setPage(p: number) {
    const params: Record<string, string> = { page: String(p) };
    if (activeTab !== 'todos') params.status = activeTab;
    setSearchParams(params);
  }

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">Meus Pedidos</h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} {filtered.length === 1 ? 'pedido' : 'pedidos'}
              {activeTab !== 'todos' ? ' nesta aba' : ' no total'}
            </p>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setTab} className="mb-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="em-andamento">Em andamento</TabsTrigger>
            <TabsTrigger value="entregues">Entregues</TabsTrigger>
            <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-gradient-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && paged.length === 0 && (
          <EmptyState
            icon={Package}
            title={emptyMessages[activeTab].title}
            action={
              emptyMessages[activeTab].showCta ? (
                <Button variant="kolecta" asChild>
                  <Link to="/">Explorar produtos</Link>
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Order list */}
        {!isLoading && paged.length > 0 && (
          <div className="space-y-4">
            {paged.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground font-body">
              Página {safePage} de {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── OrderCard ────────────────────────────────────────────

const CHAT_ELIGIBLE = ['paid', 'shipped', 'delivered', 'completed'];

function OrderCard({ order }: { order: Order }) {
  const cfg = statusMap[order.status] ?? { label: order.status, cls: 'bg-muted text-muted-foreground border-border' };
  const listing = order.listing;
  const navigate = useNavigate();
  const startChat = useStartConversationFromOrder();
  const confirmDelivery = useConfirmDelivery();
  const cancelOrder = useCancelOrder();
  const payAuctionOrder = usePayAuctionOrder();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);

  // Arremate aguardando o vencedor: leilão não tem checkout, então é aqui que
  // ele escolhe como receber e paga. `remaining` é null quando o prazo venceu.
  const isPendingPayment = order.status === 'pending_payment';
  const remaining = isPendingPayment ? timeLeft(order.paymentDeadlineAt) : null;
  // Entrega já escolhida? 'pickup' só existe por escolha explícita, e no envio
  // o serviço fica gravado — um dos dois basta (mesma regra do backend).
  const escolheuEntrega =
    order.deliveryMethod === 'pickup' || !!order.shippingServiceName;

  // F12: comprador confirma recebimento (libera saldo retido ao vendedor).
  const alreadyConfirmed = !!order.buyerConfirmedAt;
  const canConfirm = (order.status === 'shipped' || order.status === 'delivered') && !alreadyConfirmed;
  // "Avaliar compra" só depois de recebido/concluído.
  const canReview = order.status === 'delivered' || order.status === 'completed';
  // Cancelar: só enquanto aguarda pagamento (PIX não pago). Libera o anúncio.
  const canCancel = order.status === 'pending';

  async function handleChat() {
    const result = await startChat.mutateAsync(order.id);
    navigate(`/conta/mensagens?conv=${result.conversationId}`);
  }

  return (
    <Card className="bg-gradient-card">
      <CardContent className="p-5 space-y-3">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-heading text-sm font-bold uppercase tracking-wide">
              #{order.id.slice(-6).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground ml-2">{formatDate(order.createdAt)}</span>
          </div>
          <Badge className={cfg.cls}>{cfg.label}</Badge>
        </div>

        {/* Item */}
        {listing && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
              {listing.images?.[0] && (
                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xs font-bold uppercase truncate">{listing.title}</p>
              <p className="text-[10px] text-muted-foreground">Qtd: 1</p>
            </div>
          </div>
        )}

        {/* Arremate pendente: falta escolher a entrega e/ou pagar */}
        {isPendingPayment && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            {!remaining
              ? <>O prazo venceu. Se o item ainda estiver disponível, você pode tentar concluir; caso contrário, ele foi oferecido a outro participante.</>
              : escolheuEntrega
                ? <>Você arrematou este item, mas o pagamento não foi concluído. Pague no seu cartão salvo em <strong>{remaining}</strong> para garantir a compra.</>
                : <>Você arrematou este item! Falta escolher como quer receber — o frete entra no total e a cobrança sai de uma vez só. Você tem <strong>{remaining}</strong>.</>}
          </div>
        )}

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="font-heading text-lg font-bold text-primary">
            {formatBRL(order.totalInCents / 100)}
          </span>
          <div className="flex gap-2 flex-wrap justify-end">
            {/* Sem entrega escolhida o pagamento nem é oferecido: o backend
                recusa, porque o total ainda não inclui o frete. */}
            {isPendingPayment && !escolheuEntrega && (
              <Button variant="kolecta" size="sm" onClick={() => setShippingOpen(true)}>
                <Truck className="h-3.5 w-3.5 mr-1" />
                Escolher frete e pagar
              </Button>
            )}
            {isPendingPayment && escolheuEntrega && (
              <Button
                variant="kolecta"
                size="sm"
                disabled={payAuctionOrder.isPending}
                onClick={() => payAuctionOrder.mutate(order.id)}
              >
                {payAuctionOrder.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Pagar {formatBRL(order.totalInCents / 100)}
              </Button>
            )}
            {canReview && (
              <Button variant="outline-gold" size="sm" onClick={() => setReviewOpen(true)}>
                Avaliar compra
              </Button>
            )}
            {canConfirm && (
              <Button
                variant="outline-gold"
                size="sm"
                disabled={confirmDelivery.isPending}
                onClick={() => confirmDelivery.mutate(order.id)}
              >
                {confirmDelivery.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Confirmar recebimento
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={cancelOrder.isPending}
                onClick={() => {
                  if (window.confirm('Cancelar este pedido? O anúncio voltará a ficar disponível.')) {
                    cancelOrder.mutate(order.id);
                  }
                }}
              >
                {cancelOrder.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Cancelar pedido
              </Button>
            )}
            {CHAT_ELIGIBLE.includes(order.status) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={startChat.isPending}
                onClick={handleChat}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Chat
              </Button>
            )}
            <Button variant="kolecta" size="sm" asChild>
              <Link to={`/conta/pedidos/${order.id}`}>Ver detalhes</Link>
            </Button>
          </div>
        </div>
      </CardContent>

      <AuctionShippingDialog
        orderId={order.id}
        listingTitle={listing?.title}
        open={shippingOpen}
        onOpenChange={setShippingOpen}
      />

      <ReviewDialog order={order} open={reviewOpen} onOpenChange={setReviewOpen} />
    </Card>
  );
}

// ── ReviewDialog (F12: "Avaliar compra") ─────────────────

function ReviewDialog({
  order, open, onOpenChange,
}: { order: Order; open: boolean; onOpenChange: (v: boolean) => void }) {
  const createReview = useCreateReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  function submit() {
    if (rating < 1) return;
    createReview.mutate(
      { orderId: order.id, rating, comment: comment.trim() || undefined },
      { onSuccess: () => { onOpenChange(false); setRating(0); setComment(''); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Avaliar compra</DialogTitle>
          <DialogDescription>
            {order.listing?.title
              ? <>Como foi sua experiência com <strong>{order.listing.title}</strong>?</>
              : 'Como foi sua experiência com esta compra?'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
              className="p-1"
            >
              <Star className={`h-7 w-7 ${n <= rating ? 'fill-kolecta-gold text-kolecta-gold' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Conte como foi (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="kolecta" onClick={submit} disabled={rating < 1 || createReview.isPending}>
            {createReview.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Enviar avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

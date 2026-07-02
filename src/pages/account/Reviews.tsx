import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGivenReviews,
  useReceivedReviews,
  useOrders,
  useCreateReview,
} from '@/hooks/use-api';
import type { Order } from '@/lib/api';

/* ─── Helpers ─── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function parseFirstImage(raw: string[] | undefined): string {
  return raw?.[0] || '/placeholder.svg';
}

// Status de pedido em que a avaliação é permitida (espelha o backend).
function isReviewable(status: string): boolean {
  return status === 'delivered' || status === 'completed';
}

/* ─── Star Selector ─── */
function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className="p-0.5 transition-transform hover:scale-110"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              (hover || value) >= i ? 'fill-kolecta-gold text-kolecta-gold' : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}

/* ─── Star Display ─── */
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('h-4 w-4', i <= rating ? 'fill-kolecta-gold text-kolecta-gold' : 'text-muted-foreground')}
        />
      ))}
    </div>
  );
}

/* ─── Review Dialog (rating único + comentário) ─── */
function ReviewDialog({
  open,
  onOpenChange,
  order,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: Order;
  isPending: boolean;
  onSubmit: (data: { rating: number; comment: string }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold uppercase">Avaliar compra</DialogTitle>
        </DialogHeader>

        {/* Product info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
            <img src={parseFirstImage(order.listing?.images)} alt={order.listing?.title ?? ''} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm line-clamp-1">{order.listing?.title ?? 'Item'}</p>
            <p className="text-xs text-muted-foreground">{order.seller?.name ?? 'Vendedor'}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2 mt-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide">Sua avaliação</p>
          <StarSelector value={rating} onChange={setRating} />
          <div className="relative">
            <Textarea
              placeholder="Conte sua experiência com este pedido..."
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              className="resize-none min-h-[100px]"
              maxLength={500}
            />
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">{comment.length}/500</span>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="kolecta"
            className="glow-primary"
            disabled={rating < 1 || isPending}
            onClick={() => onSubmit({ rating, comment })}
          >
            {isPending ? 'Enviando...' : 'Enviar avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ─── */
export default function ReviewsPage() {
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: given = [], isLoading: givenLoading } = useGivenReviews();
  const { data: received = [] } = useReceivedReviews();
  const createReview = useCreateReview();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const reviewedOrderIds = new Set(given.map((r) => r.orderId));
  const receivedByOrder = new Set(received.map((r) => r.orderId));
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const pending = orders.filter((o) => isReviewable(o.status) && !reviewedOrderIds.has(o.id));

  const handleSubmit = async (data: { rating: number; comment: string }) => {
    if (!selectedOrder) return;
    await createReview.mutateAsync({
      orderId: selectedOrder.id,
      rating: data.rating,
      comment: data.comment || undefined,
    });
    setSelectedOrder(null);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-wide">Avaliações</h1>
          <p className="text-muted-foreground text-sm mt-1">Avalie suas compras e veja o histórico</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="pending" className="font-heading uppercase tracking-wider text-xs gap-1.5">
              Pendentes
              {pending.length > 0 && (
                <Badge className="bg-kolecta-gold text-kolecta-gold-foreground text-[10px] h-5 min-w-5 px-1.5">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="font-heading uppercase tracking-wider text-xs">
              Realizadas
            </TabsTrigger>
          </TabsList>

          {/* Pendentes: pedidos entregues sem avaliação do comprador */}
          <TabsContent value="pending" className="mt-6">
            {ordersLoading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : pending.length === 0 ? (
              <EmptyState icon={Star} title="Nenhuma compra aguardando avaliação" />
            ) : (
              <div className="space-y-3">
                {pending.map((order) => (
                  <Card key={order.id} className="bg-gradient-card border-border p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                        <img src={parseFirstImage(order.listing?.images)} alt={order.listing?.title ?? ''} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold line-clamp-1">{order.listing?.title ?? 'Item'}</p>
                        <p className="text-sm text-muted-foreground">{order.seller?.name ?? 'Vendedor'}</p>
                        <p className="text-xs text-muted-foreground mt-1">Pedido #{order.id.slice(-6).toUpperCase()}</p>
                      </div>
                      <Button
                        variant="kolecta"
                        className="glow-primary shrink-0"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Avaliar agora
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Realizadas: avaliações feitas pelo usuário */}
          <TabsContent value="completed" className="mt-6">
            {givenLoading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : given.length === 0 ? (
              <EmptyState icon={Star} title="Você ainda não fez nenhuma avaliação" />
            ) : (
              <div className="space-y-4">
                {given.map((review) => {
                  const order = orderById.get(review.orderId);
                  return (
                    <Card key={review.id} className="bg-gradient-card border-border p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                          <img src={parseFirstImage(order?.listing?.images)} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-heading font-bold line-clamp-1">
                                {order?.listing?.title ?? `Pedido #${review.orderId.slice(-6).toUpperCase()}`}
                              </p>
                              <p className="text-sm text-muted-foreground">{review.target.name ?? 'Vendedor'}</p>
                              <p className="text-xs text-muted-foreground mt-1">Avaliado em {formatDate(review.createdAt)}</p>
                            </div>
                            {receivedByOrder.has(review.orderId) && (
                              <Badge className="bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/20 text-[10px] shrink-0">
                                Avaliação recebida
                              </Badge>
                            )}
                          </div>

                          <Separator className="my-2" />

                          <StarDisplay rating={review.rating} />
                          {review.comment && (
                            <p className="text-sm text-foreground/80 mt-1">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review dialog */}
      {selectedOrder && (
        <ReviewDialog
          open
          onOpenChange={(v) => { if (!v) setSelectedOrder(null); }}
          order={selectedOrder}
          isPending={createReview.isPending}
          onSubmit={handleSubmit}
        />
      )}
    </Layout>
  );
}

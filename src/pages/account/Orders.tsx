import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import EmptyState from '@/components/EmptyState';
import { useOrders } from '@/hooks/use-api';
import type { Order } from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Status config ────────────────────────────────────────

const statusMap: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Aguardando pagamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  paid:       { label: 'Pagamento confirmado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  processing: { label: 'Em separação',        cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  shipped:    { label: 'Enviado',              cls: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30' },
  delivered:  { label: 'Entregue',            cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  cancelled:  { label: 'Cancelado',           cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
  disputed:   { label: 'Disputa aberta',      cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

type TabKey = 'todos' | 'em-andamento' | 'entregues' | 'cancelados';

const tabStatusParam: Record<TabKey, string | undefined> = {
  todos: undefined,
  'em-andamento': 'active',
  entregues: 'delivered',
  cancelados: 'cancelled',
};

const emptyMessages: Record<TabKey, { title: string; showCta: boolean }> = {
  todos: { title: 'Você ainda não fez nenhum pedido', showCta: true },
  'em-andamento': { title: 'Nenhum pedido em andamento', showCta: false },
  entregues: { title: 'Nenhum pedido entregue ainda', showCta: false },
  cancelados: { title: 'Nenhum pedido cancelado', showCta: false },
};

const ITEMS_PER_PAGE = 10;

// ═════════════════════════════════════════════════════════

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('status') as TabKey) || 'todos';
  const currentPage = Number(searchParams.get('page') || '1');

  const statusParam = tabStatusParam[activeTab];
  const { data: orders = [], isLoading } = useOrders(statusParam, currentPage);

  const totalPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = orders.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

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
            <p className="text-sm text-muted-foreground mt-1">{orders.length} pedidos no total</p>
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

function OrderCard({ order }: { order: Order }) {
  const cfg = statusMap[order.status] ?? { label: order.status, cls: 'bg-muted text-muted-foreground border-border' };
  const listing = order.listing;

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

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="font-heading text-lg font-bold text-primary">
            {formatBRL(order.totalInCents)}
          </span>
          <div className="flex gap-2">
            {order.status === 'delivered' && (
              <Button variant="outline-gold" size="sm">Avaliar compra</Button>
            )}
            {order.status === 'shipped' && (
              <Button variant="outline-gold" size="sm">Confirmar recebimento</Button>
            )}
            <Button variant="kolecta" size="sm" asChild>
              <Link to={`/conta/pedidos/${order.id}`}>Ver detalhes</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

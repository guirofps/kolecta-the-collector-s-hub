import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Package, Gavel, DollarSign, ShoppingBag,
  PlusCircle, AlertCircle, Clock, Loader2
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/currency';
import { trackEvent } from '@/lib/analytics';
import { useWallet, useSellerOrders, useMyListings, useSellerAuctions } from '@/hooks/use-api';
import type { Order, OrderStatus } from '@/lib/api';

// Status de pedido que representam uma venda efetiva (excluem pending/cancelled).
const SALE_STATUSES: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered'];

const statusColors: Record<string, string> = {
  paid: 'bg-blue-500/10 text-blue-400',
  processing: 'bg-primary/10 text-primary',
  shipped: 'bg-blue-500/10 text-blue-400',
  delivered: 'bg-green-500/10 text-green-400',
  pending: 'bg-accent/10 text-accent',
};

const statusLabels: Record<string, string> = {
  paid: 'Pago',
  processing: 'Preparar Envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
  pending: 'Aguardando Pgto',
};

function shortNumber(id: string) {
  return `KL-${id.slice(-6).toUpperCase()}`;
}

/** Formata o tempo restante de um leilão a partir do ISO de término. */
function endsIn(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Encerrado';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function SellerDashboard() {
  const { data: walletData, isLoading: walletLoading } = useWallet();
  const { data: sales = [], isLoading: salesLoading } = useSellerOrders();
  const { data: listings = [], isLoading: listingsLoading } = useMyListings();
  const { data: auctions = [], isLoading: auctionsLoading } = useSellerAuctions();

  useEffect(() => {
    trackEvent('view_seller_dashboard');
  }, []);

  // ── Métricas derivadas de dados reais ──────────────────────────────
  const saleOrders = useMemo(
    () =>
      (sales as Order[])
        .filter((o) => SALE_STATUSES.includes(o.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sales],
  );

  const revenue = useMemo(
    () => saleOrders.reduce((sum, o) => sum + o.totalInCents / 100, 0),
    [saleOrders],
  );
  const totalSales = saleOrders.length;
  const recentOrders = saleOrders.slice(0, 3);

  const activeListings = useMemo(
    () => listings.filter((l) => l.status === 'active').length,
    [listings],
  );
  const pendingListings = useMemo(
    () => listings.filter((l) => l.status === 'pending_review').length,
    [listings],
  );

  const activeAuctions = useMemo(
    () => auctions.filter((a) => a.status === 'active'),
    [auctions],
  );
  const recentAuctions = useMemo(
    () =>
      [...activeAuctions]
        .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
        .slice(0, 3),
    [activeAuctions],
  );

  return (
    <SellerLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">Painel de Vendas</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral do seu desempenho</p>
          </div>
          <Button variant="kolecta" asChild>
            <Link to="/painel/anuncios/novo">
              <PlusCircle className="h-4 w-4" />
              Novo Anúncio
            </Link>
          </Button>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Receita Total', value: formatBRL(revenue), icon: DollarSign, loading: salesLoading },
            { label: 'Vendas', value: totalSales.toString(), icon: ShoppingBag, loading: salesLoading },
            {
              label: 'Anúncios Ativos',
              value: activeListings.toString(),
              icon: Package,
              extra: pendingListings > 0 ? `${pendingListings} pendentes` : undefined,
              loading: listingsLoading,
            },
          ].map((m, i) => (
            <motion.div key={m.label} variants={fadeIn} custom={i} initial="hidden" animate="visible">
              <Card className="bg-card border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</span>
                    <m.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {m.loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="font-heading text-2xl font-bold">{m.value}</div>
                  )}
                  {m.extra && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                      <AlertCircle className="h-3 w-3" />
                      {m.extra}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Financial summary */}
        <motion.div variants={fadeIn} custom={4} initial="hidden" animate="visible" className="mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-heading text-sm font-semibold uppercase tracking-wider">Resumo Financeiro</span>
              </div>

              {walletLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase">Saldo Disponível</span>
                    <div className="font-heading text-xl font-bold text-primary">
                      {walletData ? formatBRL(walletData.balanceInCents / 100) : 'R$ 0,00'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase">Pendente</span>
                    <div className="font-heading text-xl font-bold">
                      {walletData ? formatBRL(walletData.pendingInCents / 100) : 'R$ 0,00'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase">Modo Lance Ativos</span>
                    <div className="font-heading text-xl font-bold">
                      {auctionsLoading ? '—' : activeAuctions.length}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Two-column: Recent Orders + Active Auctions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent orders */}
          <motion.div variants={fadeIn} custom={5} initial="hidden" animate="visible">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Pedidos Recentes</CardTitle>
                  <Link to="/painel/pedidos" className="text-xs text-primary hover:underline">Ver todos</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {salesLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : recentOrders.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{order.listing?.title ?? shortNumber(order.id)}</div>
                          <div className="text-xs text-muted-foreground">
                            {(order.buyer?.name ?? 'Comprador')} · {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-heading text-sm font-bold">{formatBRL(order.totalInCents / 100)}</span>
                          <Badge className={`text-[10px] ${statusColors[order.status] ?? 'bg-muted'}`}>
                            {statusLabels[order.status] ?? order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Auctions */}
          <motion.div variants={fadeIn} custom={6} initial="hidden" animate="visible">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-accent" />
                    Modo Lance Ativos
                  </CardTitle>
                  <Link to="/painel/modo-lance" className="text-xs text-primary hover:underline">Ver todos</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {auctionsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : recentAuctions.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum leilão ativo.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {recentAuctions.map((auction) => (
                      <div key={auction.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{auction.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {auction.currentBidInCents ? 'Lance atual' : 'Sem lances'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-heading text-sm font-bold text-accent">
                            {formatBRL((auction.currentBidInCents ?? auction.startingBidInCents) / 100)}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <Clock className="h-3 w-3" />
                            {endsIn(auction.endsAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </SellerLayout>
  );
}

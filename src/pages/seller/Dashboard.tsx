import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Package, Gavel, DollarSign, Eye, ShoppingBag,
  ArrowUpRight, ArrowDownRight, PlusCircle, AlertCircle, Clock,
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';

// Mock seller metrics
const metrics = {
  totalSales: 47,
  revenue: 14850,
  revenueChange: 12.5,
  activeListings: 18,
  pendingListings: 3,
  activeAuctions: 5,
  totalBids: 42,
  views: 1284,
  viewsChange: 8.3,
  balance: 3250,
  pendingPayout: 1800,
};

const recentOrders = [
  { id: 'o1', product: 'Hot Wheels RLC Skyline R34', buyer: 'Col***or', amount: 520, status: 'preparar_envio', date: '2026-02-22' },
  { id: 'o2', product: 'Tomica AE86 Sprinter Trueno', buyer: 'JDM***an', amount: 289, status: 'enviado', date: '2026-02-21' },
  { id: 'o3', product: 'Kyosho Silvia S15', buyer: 'Rac***er', amount: 175, status: 'entregue', date: '2026-02-19' },
];

const recentAuctions = [
  { id: 'p1', title: 'HW RLC Skyline R34', currentBid: 520, bids: 14, endsIn: '2h 30m', status: 'ativo' },
  { id: 'p4', title: 'Mini GT LB Huracán Chase', currentBid: 380, bids: 9, endsIn: '30m', status: 'ativo' },
  { id: 'p6', title: 'HW Premium RX-7 FD3S', currentBid: 145, bids: 7, endsIn: '18h', status: 'ativo' },
];

const statusColors: Record<string, string> = {
  preparar_envio: 'bg-primary/10 text-primary',
  enviado: 'bg-blue-500/10 text-blue-400',
  entregue: 'bg-green-500/10 text-green-400',
  aguardando_pagamento: 'bg-accent/10 text-accent',
  ativo: 'bg-primary/10 text-primary',
};

const statusLabels: Record<string, string> = {
  preparar_envio: 'Preparar Envio',
  enviado: 'Enviado',
  entregue: 'Entregue',
  aguardando_pagamento: 'Aguardando Pgto',
  ativo: 'Ativo',
};

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function SellerDashboard() {
  useEffect(() => {
    trackEvent('view_seller_dashboard');
  }, []);

  return (
    <SellerLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral do seu desempenho</p>
          </div>
          <Button variant="kolecta" asChild>
            <Link to="/painel-vendedor/anuncios/novo">
              <PlusCircle className="h-4 w-4" />
              Novo Anúncio
            </Link>
          </Button>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Receita Total', value: formatBRL(metrics.revenue), change: metrics.revenueChange, icon: DollarSign },
            { label: 'Vendas', value: metrics.totalSales.toString(), icon: ShoppingBag },
            { label: 'Anúncios Ativos', value: metrics.activeListings.toString(), icon: Package, extra: metrics.pendingListings > 0 ? `${metrics.pendingListings} pendentes` : undefined },
            { label: 'Visualizações', value: metrics.views.toLocaleString('pt-BR'), change: metrics.viewsChange, icon: Eye },
          ].map((m, i) => (
            <motion.div key={m.label} variants={fadeIn} custom={i} initial="hidden" animate="visible">
              <Card className="bg-card border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</span>
                    <m.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="font-heading text-2xl font-bold">{m.value}</div>
                  {m.change !== undefined && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${m.change >= 0 ? 'text-green-400' : 'text-accent'}`}>
                      {m.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(m.change)}% vs mês anterior
                    </div>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase">Saldo Disponível</span>
                  <div className="font-heading text-xl font-bold text-primary">{formatBRL(metrics.balance)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase">Pendente</span>
                  <div className="font-heading text-xl font-bold">{formatBRL(metrics.pendingPayout)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase">Leilões Ativos</span>
                  <div className="font-heading text-xl font-bold">{metrics.activeAuctions}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase">Total de Lances</span>
                  <div className="font-heading text-xl font-bold">{metrics.totalBids}</div>
                </div>
              </div>
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
                  <Link to="/painel-vendedor/pedidos" className="text-xs text-primary hover:underline">Ver todos</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{order.product}</div>
                        <div className="text-xs text-muted-foreground">{order.buyer} · {order.date}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-heading text-sm font-bold">{formatBRL(order.amount)}</span>
                        <Badge className={`text-[10px] ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
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
                    Leilões Ativos
                  </CardTitle>
                  <Link to="/painel-vendedor/leiloes" className="text-xs text-primary hover:underline">Ver todos</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentAuctions.map((auction) => (
                    <div key={auction.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{auction.title}</div>
                        <div className="text-xs text-muted-foreground">{auction.bids} lances</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-heading text-sm font-bold text-accent">{formatBRL(auction.currentBid)}</span>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Clock className="h-3 w-3" />
                          {auction.endsIn}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </SellerLayout>
  );
}

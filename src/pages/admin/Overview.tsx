import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  DollarSign, Users, Package, Gavel, TrendingUp,
  AlertTriangle, ShieldCheck,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBRL } from '@/lib/currency';
import { useAdminStats, useAdminOverview } from '@/hooks/use-api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const CAT_COLORS = [
  'hsl(48, 100%, 50%)', 'hsl(0, 80%, 55%)', 'hsl(200, 70%, 50%)',
  'hsl(140, 60%, 45%)', 'hsl(280, 60%, 55%)', 'hsl(225, 12%, 40%)',
];

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } }),
};

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: overview, isLoading: overviewLoading } = useAdminOverview();

  const liveKpis = [
    { label: 'Usuários', value: stats ? String(stats.totalUsers) : '—', icon: Users },
    // "No ar", não o total da tabela: o total conta rascunho nunca enviado e
    // reprovado, e mostrava 878 com 136 na vitrine.
    { label: 'Anúncios no ar', value: stats ? String(stats.activeListings) : '—', icon: Package },
    { label: 'Pedidos', value: stats ? String(stats.totalOrders) : '—', icon: TrendingUp },
    { label: 'Receita (taxas)', value: stats ? formatBRL(stats.totalRevenueInCents / 100) : '—', icon: DollarSign },
    { label: 'Leilões ativos', value: stats ? String(stats.activeAuctions) : '—', icon: Gavel },
    { label: 'Disputas abertas', value: stats ? String(stats.openDisputes) : '—', icon: AlertTriangle },
  ];

  const pending = overview?.pendingActions;
  const pendingActions = pending
    ? [
        { label: `${pending.pendingListings} anúncios aguardando aprovação`, href: '/admin/anuncios', icon: Package, show: pending.pendingListings > 0 },
        { label: `${pending.pendingVerifications} vendedores para verificar`, href: '/admin/vendedores/verificacao', icon: ShieldCheck, show: pending.pendingVerifications > 0 },
        { label: `${pending.openDisputes} disputas abertas`, href: '/admin/disputas', icon: AlertTriangle, show: pending.openDisputes > 0 },
      ].filter((a) => a.show)
    : [];

  const salesByMonth = overview?.salesByMonth ?? [];
  const categoryData = (overview?.categoryBreakdown ?? []).map((c, i) => ({
    ...c,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));
  const topSellers = overview?.topSellers ?? [];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Admin Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do marketplace Kolecta</p>
        </div>

        {/* Pending actions */}
        {pendingActions.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8">
            {pendingActions.map((a) => (
              <Link
                key={a.href}
                to={a.href}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors text-sm"
              >
                <a.icon className="h-4 w-4 text-accent" />
                <span className="text-foreground">{a.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* KPIs — reais da API */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {statsLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
            : liveKpis.map((kpi, i) => (
              <motion.div key={kpi.label} variants={fadeIn} custom={i} initial="hidden" animate="visible">
                <Card className="bg-card border-border hover:border-primary/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                      <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="font-heading text-xl font-bold">{kpi.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          }
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Sales chart */}
          <motion.div variants={fadeIn} custom={6} initial="hidden" animate="visible" className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                  Vendas & Comissões (6 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-[260px] w-full rounded" />
                ) : salesByMonth.every((m) => m.vendas === 0) ? (
                  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                    Sem vendas no período ainda.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={salesByMonth} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 18%)" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(225, 18%, 12%)', border: '1px solid hsl(225, 12%, 18%)', borderRadius: 8, fontSize: 12 }}
                        formatter={(value: number) => formatBRL(value)}
                      />
                      <Bar dataKey="vendas" fill="hsl(48, 100%, 50%)" radius={[4, 4, 0, 0]} name="Vendas" />
                      <Bar dataKey="comissao" fill="hsl(0, 80%, 55%)" radius={[4, 4, 0, 0]} name="Comissão" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Category pie */}
          <motion.div variants={fadeIn} custom={7} initial="hidden" animate="visible">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                  Vendas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-[200px] w-full rounded" />
                ) : categoryData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    Sem dados de categoria.
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                          {categoryData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: 'hsl(225, 18%, 12%)', border: '1px solid hsl(225, 12%, 18%)', borderRadius: 8, fontSize: 12 }}
                          formatter={(value: number) => `${value}%`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {categoryData.map((c) => (
                        <div key={c.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                          {c.name} ({c.value}%)
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top sellers */}
        <motion.div variants={fadeIn} custom={9} initial="hidden" animate="visible">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Top Vendedores</CardTitle>
                <Link to="/admin/usuarios" className="text-xs text-primary hover:underline">Ver todos</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {overviewLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
              ) : topSellers.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
              ) : (
                <div className="divide-y divide-border">
                  {topSellers.map((seller, i) => (
                    <div key={seller.sellerId} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-heading text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            {seller.name}
                            {seller.verified && <ShieldCheck className="h-3 w-3 text-primary" />}
                          </div>
                          <span className="text-[11px] text-muted-foreground">{seller.sales} vendas</span>
                        </div>
                      </div>
                      <span className="font-heading text-sm font-bold">{formatBRL(seller.gmv)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  DollarSign, Users, Package, Gavel, TrendingUp, TrendingDown,
  ArrowUpRight, AlertTriangle, ShieldCheck, Eye,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/mock-data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

const kpis = [
  { label: 'GMV Total', value: formatBRL(187450), change: 18.2, icon: DollarSign },
  { label: 'Receita (Comissões)', value: formatBRL(18745), change: 15.8, icon: TrendingUp },
  { label: 'Usuários Ativos', value: '1.284', change: 12.5, icon: Users },
  { label: 'Anúncios Ativos', value: '847', change: 8.3, icon: Package },
  { label: 'Leilões Ativos', value: '124', change: 22.1, icon: Gavel },
  { label: 'Denúncias Pendentes', value: '7', change: -15, icon: AlertTriangle, negative: true },
];

const salesByMonth = [
  { month: 'Set', vendas: 12400, comissao: 1240 },
  { month: 'Out', vendas: 15800, comissao: 1580 },
  { month: 'Nov', vendas: 22100, comissao: 2210 },
  { month: 'Dez', vendas: 31500, comissao: 3150 },
  { month: 'Jan', vendas: 28900, comissao: 2890 },
  { month: 'Fev', vendas: 34200, comissao: 3420 },
];

const categoryData = [
  { name: 'Carrinhos', value: 58, color: 'hsl(48, 100%, 50%)' },
  { name: 'Funko Pop', value: 18, color: 'hsl(0, 80%, 55%)' },
  { name: 'Cards', value: 12, color: 'hsl(200, 70%, 50%)' },
  { name: 'Action Figures', value: 8, color: 'hsl(140, 60%, 45%)' },
  { name: 'Outros', value: 4, color: 'hsl(225, 12%, 40%)' },
];

const conversionData = [
  { day: '17', taxa: 3.2 },
  { day: '18', taxa: 3.8 },
  { day: '19', taxa: 4.1 },
  { day: '20', taxa: 3.5 },
  { day: '21', taxa: 4.6 },
  { day: '22', taxa: 5.2 },
  { day: '23', taxa: 4.8 },
];

const pendingActions = [
  { type: 'anuncio', label: '12 anúncios aguardando aprovação', href: '/admin/anuncios', icon: Package },
  { type: 'verificacao', label: '3 vendedores para verificar', href: '/admin/vendedores/verificacao', icon: ShieldCheck },
  { type: 'denuncia', label: '7 denúncias pendentes', href: '/admin/denuncias', icon: AlertTriangle },
];

const topSellers = [
  { name: 'MiniAuto Brasil', sales: 512, gmv: 45200, verified: true },
  { name: 'JDM Garage Collectibles', sales: 342, gmv: 38900, verified: true },
  { name: 'Coleção Turbo', sales: 276, gmv: 22100, verified: true },
  { name: 'Escala Premium', sales: 189, gmv: 18400, verified: true },
  { name: 'Imports & Racers', sales: 58, gmv: 5200, verified: false },
];

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } }),
};

export default function AdminOverview() {
  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Admin Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do marketplace Kolecta</p>
        </div>

        {/* Pending actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          {pendingActions.map((a) => (
            <Link
              key={a.type}
              to={a.href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors text-sm"
            >
              <a.icon className="h-4 w-4 text-accent" />
              <span className="text-foreground">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.label} variants={fadeIn} custom={i} initial="hidden" animate="visible">
              <Card className="bg-card border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                    <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="font-heading text-xl font-bold">{kpi.value}</div>
                  <div className={`flex items-center gap-1 mt-1 text-[11px] ${
                    kpi.negative
                      ? (kpi.change <= 0 ? 'text-green-400' : 'text-accent')
                      : (kpi.change >= 0 ? 'text-green-400' : 'text-accent')
                  }`}>
                    {kpi.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(kpi.change)}%
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
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
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Conversion + Top sellers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion */}
          <motion.div variants={fadeIn} custom={8} initial="hidden" animate="visible">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                  Taxa de Conversão (7 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 18%)" />
                    <XAxis dataKey="day" tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip
                      contentStyle={{ background: 'hsl(225, 18%, 12%)', border: '1px solid hsl(225, 12%, 18%)', borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number) => `${value}%`}
                    />
                    <Line type="monotone" dataKey="taxa" stroke="hsl(48, 100%, 50%)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(48, 100%, 50%)' }} name="Conversão" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

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
                <div className="divide-y divide-border">
                  {topSellers.map((seller, i) => (
                    <div key={seller.name} className="flex items-center justify-between px-4 py-3">
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
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}

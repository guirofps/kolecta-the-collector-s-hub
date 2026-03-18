import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { formatBRL } from '@/lib/mock-data';
import {
  DollarSign, ShoppingBag, ArrowUpFromLine, AlertCircle, TrendingUp, TrendingDown,
  Download, Check, X, RotateCcw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from 'recharts';

// ── Mock Data ──────────────────────────────────────────────

const mockSummary = {
  revenue: 47850,
  revenueDelta: 12.4,
  volume: 398200,
  volumeDelta: 8.7,
  payouts: 342600,
  payoutsDelta: 6.2,
  refunds: 5430,
  refundsDelta: -3.1,
  disputesClosed: 4,
};

const mockChartData = [
  { month: 'Set', revenue: 28400, volume: 210000 },
  { month: 'Out', revenue: 34200, volume: 265000 },
  { month: 'Nov', revenue: 41800, volume: 328000 },
  { month: 'Dez', revenue: 52600, volume: 412000 },
  { month: 'Jan', revenue: 45300, volume: 362000 },
  { month: 'Fev', revenue: 47850, volume: 398200 },
];

const mockRevenueDistribution = [
  { name: 'Comissões de vendas', value: 32400, color: 'hsl(48, 100%, 50%)' },
  { name: 'Taxa de destaque/mídia', value: 8200, color: 'hsl(200, 70%, 50%)' },
  { name: 'Taxa de modo lance', value: 5800, color: 'hsl(38, 92%, 50%)' },
  { name: 'Outras taxas', value: 1450, color: 'hsl(225, 8%, 55%)' },
];

const mockTransactions = [
  { id: 'TX-001', date: '2024-02-18', orderId: 'KL-0045', buyer: 'Carlos M.', seller: 'JDM Store', gross: 1250, commissionPct: 12, commission: 150, net: 1100, status: 'completed' as const },
  { id: 'TX-002', date: '2024-02-18', orderId: 'KL-0046', buyer: 'Ana P.', seller: 'Vintage Toys', gross: 890, commissionPct: 12, commission: 106.8, net: 783.2, status: 'completed' as const },
  { id: 'TX-003', date: '2024-02-17', orderId: 'KL-0044', buyer: 'Pedro S.', seller: 'Card Master', gross: 2300, commissionPct: 12, commission: 276, net: 2024, status: 'awaiting_delivery' as const },
  { id: 'TX-004', date: '2024-02-17', orderId: 'KL-0043', buyer: 'Marina L.', seller: 'JDM Store', gross: 450, commissionPct: 12, commission: 54, net: 396, status: 'completed' as const },
  { id: 'TX-005', date: '2024-02-16', orderId: 'KL-0041', buyer: 'Lucas R.', seller: 'Funko Brasil', gross: 180, commissionPct: 12, commission: 21.6, net: 158.4, status: 'refunded' as const },
  { id: 'TX-006', date: '2024-02-16', orderId: 'KL-0040', buyer: 'Julia F.', seller: 'Retro Games', gross: 3200, commissionPct: 12, commission: 384, net: 2816, status: 'awaiting_delivery' as const },
  { id: 'TX-007', date: '2024-02-15', orderId: 'KL-0039', buyer: 'Rafael C.', seller: 'Card Master', gross: 670, commissionPct: 12, commission: 80.4, net: 589.6, status: 'completed' as const },
  { id: 'TX-008', date: '2024-02-14', orderId: 'KL-0037', buyer: 'Beatriz N.', seller: 'Vintage Toys', gross: 1580, commissionPct: 12, commission: 189.6, net: 1390.4, status: 'completed' as const },
];

const mockPayouts = [
  { id: 'PO-001', date: '2024-02-18', seller: 'JDM Store', orders: 3, gross: 2890, commission: 346.8, net: 2543.2, stripeStatus: 'settled' as const, settledAt: '2024-02-19' },
  { id: 'PO-002', date: '2024-02-17', seller: 'Card Master', orders: 2, gross: 1850, commission: 222, net: 1628, stripeStatus: 'in_transit' as const, settledAt: null },
  { id: 'PO-003', date: '2024-02-16', seller: 'Vintage Toys', orders: 4, gross: 4200, commission: 504, net: 3696, stripeStatus: 'scheduled' as const, settledAt: null },
  { id: 'PO-004', date: '2024-02-15', seller: 'Funko Brasil', orders: 1, gross: 780, commission: 93.6, net: 686.4, stripeStatus: 'failed' as const, settledAt: null },
  { id: 'PO-005', date: '2024-02-14', seller: 'Retro Games', orders: 2, gross: 3200, commission: 384, net: 2816, stripeStatus: 'settled' as const, settledAt: '2024-02-16' },
];

const mockRefunds = [
  { id: 'RF-001', date: '2024-02-16', orderId: 'KL-0041', buyer: 'Lucas R.', seller: 'Funko Brasil', amount: 180, reason: 'Produto com defeito', origin: 'disputa' as const, status: 'completed' as const },
  { id: 'RF-002', date: '2024-02-13', orderId: 'KL-0035', buyer: 'Thiago M.', seller: 'JDM Store', amount: 3200, reason: 'Produto não recebido', origin: 'admin' as const, status: 'completed' as const },
  { id: 'RF-003', date: '2024-02-10', orderId: 'KL-0028', buyer: 'Camila S.', seller: 'Vintage Toys', amount: 2050, reason: 'Chargeback Stripe', origin: 'stripe' as const, status: 'processing' as const },
];

const mockPendingWithdrawals = [
  { id: 'WD-001', date: '2024-02-18', seller: 'JDM Store', amount: 4200, bankAccount: 'Nubank •••• 4521', availableBalance: 5340 },
  { id: 'WD-002', date: '2024-02-17', seller: 'Card Master', amount: 1800, bankAccount: 'Itaú •••• 7832', availableBalance: 2150 },
];

// ── Helpers ────────────────────────────────────────────────

const txStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { label: 'Concluído', variant: 'default' },
  awaiting_delivery: { label: 'Aguardando entrega', variant: 'secondary' },
  refunded: { label: 'Estornado', variant: 'destructive' },
};

const payoutStatusConfig: Record<string, { label: string; cls: string }> = {
  settled: { label: 'Liquidado', cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
  in_transit: { label: 'Em trânsito', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  scheduled: { label: 'Agendado', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  failed: { label: 'Falhou', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const refundOriginLabel: Record<string, string> = { disputa: 'Disputa', admin: 'Admin', stripe: 'Stripe' };

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(0, 0%, 100%)',
    border: '1px solid hsl(48, 100%, 50%, 0.3)',
    borderRadius: 8,
    fontSize: 12,
  },
};

// ── Summary Card ───────────────────────────────────────────

function SummaryCard({ title, value, delta, icon: Icon, valueClass }: {
  title: string; value: string; delta?: number; icon: React.ElementType; valueClass?: string;
}) {
  const isPositive = delta !== undefined && delta >= 0;
  return (
    <Card className="bg-gradient-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`font-heading text-3xl font-extrabold italic ${valueClass ?? ''}`}>{value}</p>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-green-500' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{delta}% vs período anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────

export default function AdminFinancial() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([]);

  /* API: GET /api/admin/financial/summary?period= */
  /* API: GET /api/admin/financial/export?period= Retorna CSV com dados financeiros do período */

  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesSearch = !txSearch || tx.orderId.toLowerCase().includes(txSearch.toLowerCase()) || tx.buyer.toLowerCase().includes(txSearch.toLowerCase()) || tx.seller.toLowerCase().includes(txSearch.toLowerCase());
    const matchesStatus = txStatusFilter === 'all' || tx.status === txStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const txTotals = filteredTransactions.reduce((acc, tx) => ({
    gross: acc.gross + tx.gross,
    commission: acc.commission + tx.commission,
    net: acc.net + tx.net,
  }), { gross: 0, commission: 0, net: 0 });

  const refundTotal = mockRefunds.reduce((acc, r) => acc + r.amount, 0);

  const revenueTotal = mockRevenueDistribution.reduce((acc, r) => acc + r.value, 0);

  const toggleWithdrawal = (id: string) => {
    setSelectedWithdrawals(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-7xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 lg:col-span-2" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral financeira da plataforma</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="year">Ano atual</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar relatório
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Receita da plataforma"
            value={formatBRL(mockSummary.revenue)}
            delta={mockSummary.revenueDelta}
            icon={DollarSign}
            valueClass="text-kolecta-gold"
          />
          <SummaryCard
            title="Volume transacionado"
            value={formatBRL(mockSummary.volume)}
            delta={mockSummary.volumeDelta}
            icon={ShoppingBag}
          />
          <SummaryCard
            title="Repasses realizados"
            value={formatBRL(mockSummary.payouts)}
            delta={mockSummary.payoutsDelta}
            icon={ArrowUpFromLine}
          />
          <SummaryCard
            title="Estornos e disputas"
            value={formatBRL(mockSummary.refunds)}
            delta={mockSummary.refundsDelta}
            icon={AlertCircle}
            valueClass="text-kolecta-red"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* AreaChart - Revenue vs Volume */}
          <Card className="bg-gradient-card border-border lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Receita vs Volume Transacionado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 10%, 88%)" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(225, 8%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(225, 8%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(48, 100%, 50%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(48, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="hsl(48, 100%, 50%)" strokeWidth={2} fill="url(#revGrad)" name="Receita" />
                  <Area type="monotone" dataKey="volume" stroke="hsl(200, 70%, 50%)" strokeWidth={2} fill="url(#volGrad)" name="Volume" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Distribution - Horizontal BarChart */}
          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Distribuição de Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mockRevenueDistribution} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" tick={{ fill: 'hsl(225, 8%, 45%)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'hsl(225, 8%, 45%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Valor">
                    {mockRevenueDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Separator className="my-3" />
              <div className="space-y-2">
                {mockRevenueDistribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatBRL(item.value)}</span>
                      <span className="text-muted-foreground">({((item.value / revenueTotal) * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Tabs */}
        <Tabs defaultValue="transactions">
          <TabsList className="mb-4">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="payouts">Repasses</TabsTrigger>
            <TabsTrigger value="refunds">Estornos</TabsTrigger>
            <TabsTrigger value="withdrawals">Saques pendentes</TabsTrigger>
          </TabsList>

          {/* ── Transações ──────────────────────────────── */}
          <TabsContent value="transactions">
            <Card className="bg-gradient-card border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input placeholder="Buscar pedido, comprador ou vendedor..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="sm:max-w-xs" />
                  <Select value={txStatusFilter} onValueChange={setTxStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="awaiting_delivery">Aguardando entrega</SelectItem>
                      <SelectItem value="refunded">Estornado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              {/* API: GET /api/admin/financial/transactions?period=&seller=&status=&search=&page= */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase">Data</TableHead>
                        <TableHead className="text-[11px] uppercase">Pedido</TableHead>
                        <TableHead className="text-[11px] uppercase">Comprador</TableHead>
                        <TableHead className="text-[11px] uppercase">Vendedor</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Valor bruto</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Comissão (%)</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Comissão (R$)</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Líquido vendedor</TableHead>
                        <TableHead className="text-[11px] uppercase">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map(tx => {
                        const sc = txStatusConfig[tx.status];
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs text-muted-foreground">{tx.date}</TableCell>
                            <TableCell className="text-xs font-medium">{tx.orderId}</TableCell>
                            <TableCell className="text-xs">{tx.buyer}</TableCell>
                            <TableCell className="text-xs">{tx.seller}</TableCell>
                            <TableCell className="text-xs text-right font-medium">{formatBRL(tx.gross)}</TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground">{tx.commissionPct}%</TableCell>
                            <TableCell className="text-xs text-right text-kolecta-gold font-medium">{formatBRL(tx.commission)}</TableCell>
                            <TableCell className="text-xs text-right">{formatBRL(tx.net)}</TableCell>
                            <TableCell><Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={4} className="text-xs font-heading uppercase">Total da página</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold">{formatBRL(txTotals.gross)}</TableCell>
                        <TableCell />
                        <TableCell className="text-xs text-right font-heading font-bold text-kolecta-gold">{formatBRL(txTotals.commission)}</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold">{formatBRL(txTotals.net)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Repasses ────────────────────────────────── */}
          <TabsContent value="payouts">
            {/* API: GET /api/admin/financial/payouts?period= */}
            {/* API: POST /api/admin/financial/payouts/:id/retry */}
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase">Data</TableHead>
                        <TableHead className="text-[11px] uppercase">Vendedor</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Pedidos</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Valor bruto</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Comissão</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Valor líquido</TableHead>
                        <TableHead className="text-[11px] uppercase">Status Stripe</TableHead>
                        <TableHead className="text-[11px] uppercase">Liquidação</TableHead>
                        <TableHead className="text-[11px] uppercase">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPayouts.map(po => {
                        const sc = payoutStatusConfig[po.stripeStatus];
                        return (
                          <TableRow key={po.id}>
                            <TableCell className="text-xs text-muted-foreground">{po.date}</TableCell>
                            <TableCell className="text-xs font-medium">{po.seller}</TableCell>
                            <TableCell className="text-xs text-right">{po.orders}</TableCell>
                            <TableCell className="text-xs text-right">{formatBRL(po.gross)}</TableCell>
                            <TableCell className="text-xs text-right text-kolecta-gold">{formatBRL(po.commission)}</TableCell>
                            <TableCell className="text-xs text-right font-medium">{formatBRL(po.net)}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] ${sc.cls}`}>{sc.label}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{po.settledAt ?? '—'}</TableCell>
                            <TableCell>
                              {po.stripeStatus === 'failed' && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                  <RotateCcw className="h-3 w-3" /> Retentar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={3} className="text-xs font-heading uppercase">Total</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold">{formatBRL(mockPayouts.reduce((a, p) => a + p.gross, 0))}</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold text-kolecta-gold">{formatBRL(mockPayouts.reduce((a, p) => a + p.commission, 0))}</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold">{formatBRL(mockPayouts.reduce((a, p) => a + p.net, 0))}</TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Estornos ────────────────────────────────── */}
          <TabsContent value="refunds">
            {/* API: GET /api/admin/financial/refunds?period= */}
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase">Data</TableHead>
                        <TableHead className="text-[11px] uppercase">Pedido</TableHead>
                        <TableHead className="text-[11px] uppercase">Comprador</TableHead>
                        <TableHead className="text-[11px] uppercase">Vendedor</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Valor estornado</TableHead>
                        <TableHead className="text-[11px] uppercase">Motivo</TableHead>
                        <TableHead className="text-[11px] uppercase">Origem</TableHead>
                        <TableHead className="text-[11px] uppercase">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockRefunds.map(rf => (
                        <TableRow key={rf.id}>
                          <TableCell className="text-xs text-muted-foreground">{rf.date}</TableCell>
                          <TableCell className="text-xs font-medium">{rf.orderId}</TableCell>
                          <TableCell className="text-xs">{rf.buyer}</TableCell>
                          <TableCell className="text-xs">{rf.seller}</TableCell>
                          <TableCell className="text-xs text-right font-medium text-kolecta-red">{formatBRL(rf.amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{rf.reason}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{refundOriginLabel[rf.origin]}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={rf.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                              {rf.status === 'completed' ? 'Concluído' : 'Processando'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={4} className="text-xs font-heading uppercase">Total de estornos</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold text-kolecta-red">{formatBRL(refundTotal)}</TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Saques Pendentes ─────────────────────────── */}
          <TabsContent value="withdrawals">
            {/* API: GET /api/admin/financial/withdrawals/pending */}
            {/* API: POST /api/admin/financial/withdrawals/:id/approve */}
            {/* API: POST /api/admin/financial/withdrawals/:id/reject */}
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedWithdrawals.length === mockPendingWithdrawals.length && mockPendingWithdrawals.length > 0}
                            onCheckedChange={(c) => setSelectedWithdrawals(c ? mockPendingWithdrawals.map(w => w.id) : [])}
                          />
                        </TableHead>
                        <TableHead className="text-[11px] uppercase">Solicitação</TableHead>
                        <TableHead className="text-[11px] uppercase">Vendedor</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Valor</TableHead>
                        <TableHead className="text-[11px] uppercase">Conta destino</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Saldo disponível</TableHead>
                        <TableHead className="text-[11px] uppercase">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPendingWithdrawals.map(wd => (
                        <TableRow key={wd.id}>
                          <TableCell>
                            <Checkbox checked={selectedWithdrawals.includes(wd.id)} onCheckedChange={() => toggleWithdrawal(wd.id)} />
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{wd.id}</div>
                            <div className="text-muted-foreground">{wd.date}</div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{wd.seller}</TableCell>
                          <TableCell className="text-xs text-right font-heading font-bold text-kolecta-gold">{formatBRL(wd.amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{wd.bankAccount}</TableCell>
                          <TableCell className="text-xs text-right">{formatBRL(wd.availableBalance)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white">
                                <Check className="h-3 w-3" /> Aprovar
                              </Button>
                              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1">
                                <X className="h-3 w-3" /> Recusar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Bulk actions */}
            {selectedWithdrawals.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg px-6 py-3 flex items-center gap-4">
                <span className="text-sm font-medium">{selectedWithdrawals.length} selecionado(s)</span>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1">
                  <Check className="h-3 w-3" /> Aprovar selecionados
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Clock, TrendingUp, ArrowDownToLine, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/mock-data';
import { useWallet, useWithdrawals } from '@/hooks/use-api';

// ── Mock data ────────────────────────────────────────────

const mockFinancialSummary = {
  available: 8450.0,
  pending: 11290.0,
  monthTotal: 19740.0,
  totalWithdrawn: 34200.0,
  stripeConnected: true,
};

const mockChartData = [
  { month: 'Out', gross: 12400, net: 10540, orders: 8 },
  { month: 'Nov', gross: 15800, net: 13430, orders: 11 },
  { month: 'Dez', gross: 22100, net: 18785, orders: 16 },
  { month: 'Jan', gross: 18600, net: 15810, orders: 13 },
  { month: 'Fev', gross: 14200, net: 12070, orders: 9 },
  { month: 'Mar', gross: 19740, net: 16779, orders: 14 },
];

interface Transfer {
  id: string; date: string; order: string; gross: number; commission: number; net: number;
  status: 'transferido' | 'em_processamento' | 'aguardando_entrega';
}

const mockTransfers: Transfer[] = [
  { id: 't1', date: '2025-03-15', order: 'KL-000195', gross: 6500, commission: 975, net: 5525, status: 'transferido' },
  { id: 't2', date: '2025-03-12', order: 'KL-000188', gross: 2400, commission: 360, net: 2040, status: 'transferido' },
  { id: 't3', date: '2025-03-10', order: 'KL-000185', gross: 7200, commission: 1080, net: 6120, status: 'em_processamento' },
  { id: 't4', date: '2025-03-08', order: 'KL-000201', gross: 4890, commission: 733.5, net: 4156.5, status: 'aguardando_entrega' },
  { id: 't5', date: '2025-03-05', order: 'KL-000198', gross: 4090, commission: 613.5, net: 3476.5, status: 'em_processamento' },
];

interface Commission {
  id: string; date: string; order: string; saleValue: number; percent: number; charged: number;
}

const mockCommissions: Commission[] = [
  { id: 'c1', date: '2025-03-15', order: 'KL-000195', saleValue: 6500, percent: 15, charged: 975 },
  { id: 'c2', date: '2025-03-12', order: 'KL-000188', saleValue: 2400, percent: 15, charged: 360 },
  { id: 'c3', date: '2025-03-10', order: 'KL-000185', saleValue: 7200, percent: 15, charged: 1080 },
  { id: 'c4', date: '2025-03-08', order: 'KL-000201', saleValue: 4890, percent: 15, charged: 733.5 },
  { id: 'c5', date: '2025-03-05', order: 'KL-000198', saleValue: 4090, percent: 15, charged: 613.5 },
];

interface Withdrawal {
  id: string; requestDate: string; amount: number; account: string;
  status: 'concluido' | 'em_processamento' | 'solicitado' | 'recusado';
  settleDate?: string;
}

const mockWithdrawals: Withdrawal[] = [
  { id: 'w1', requestDate: '2025-03-01', amount: 12000, account: 'Nubank •••• 4521', status: 'concluido', settleDate: '2025-03-03' },
  { id: 'w2', requestDate: '2025-03-10', amount: 8500, account: 'Nubank •••• 4521', status: 'em_processamento' },
  { id: 'w3', requestDate: '2025-03-16', amount: 5000, account: 'Nubank •••• 4521', status: 'solicitado' },
];

// ── Helpers ──────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

const transferStatusConfig: Record<Transfer['status'], { label: string; cls: string }> = {
  transferido: { label: 'Transferido', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  em_processamento: { label: 'Em processamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  aguardando_entrega: { label: 'Aguardando entrega', cls: 'bg-muted text-muted-foreground border-border' },
};

const withdrawalStatusConfig: Record<Withdrawal['status'], { label: string; cls: string }> = {
  concluido: { label: 'Concluído', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  em_processamento: { label: 'Em processamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  solicitado: { label: 'Solicitado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  recusado: { label: 'Recusado', cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
};

type ChartMetric = 'gross' | 'net' | 'orders';
const chartMetricLabels: Record<ChartMetric, string> = {
  gross: 'Receita bruta',
  net: 'Receita líquida',
  orders: 'Número de vendas',
};

// ── Summary cards config ─────────────────────────────────

const summaryCards = [
  { key: 'available', label: 'Saldo disponível', sub: 'Disponível para saque', icon: Wallet, highlight: true },
  { key: 'pending', label: 'A receber', sub: 'Em pedidos em andamento', icon: Clock, highlight: false },
  { key: 'monthTotal', label: 'Total do mês', sub: 'Vendas no mês atual', icon: TrendingUp, highlight: false },
  { key: 'totalWithdrawn', label: 'Total de saques', sub: 'Histórico total sacado', icon: ArrowDownToLine, highlight: false },
] as const;

// ── Component ────────────────────────────────────────────

export default function SellerFinancialPage() {
  const { toast } = useToast();
  const [chartMetric, setChartMetric] = useState<ChartMetric>('gross');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // ── API real ──────────────────────────────────────────
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawals().query;
  const { requestMutation } = useWithdrawals();

  const loading = walletLoading;

  const summary = {
    available:      (wallet?.balanceInCents ?? 0) / 100,
    pending:        (wallet?.pendingInCents ?? 0) / 100,
    monthTotal:     mockFinancialSummary.monthTotal,     // ainda mock
    totalWithdrawn: mockFinancialSummary.totalWithdrawn, // ainda mock
    stripeConnected: true,
  };

  // ── Withdraw dialog helpers ────────────────────────────

  function handleWithdrawAmountChange(val: string) {
    const clean = val.replace(/[^\d,]/g, '');
    setWithdrawAmount(clean);
  }

  function parseAmount(val: string): number {
    return parseFloat(val.replace(',', '.')) || 0;
  }

  function handleConfirmWithdraw() {
    const amount = parseAmount(withdrawAmount);
    const minAmount = 50; // R$50,00 — igual ao backend
    if (amount < minAmount) {
      toast({ title: 'Valor mínimo', description: `O valor mínimo para saque é R$ ${minAmount},00.`, variant: 'destructive' });
      return;
    }
    if (amount > summary.available) {
      toast({ title: 'Saldo insuficiente', description: `O valor máximo disponível é ${formatBRL(summary.available)}.`, variant: 'destructive' });
      return;
    }
    const amountInCents = Math.round(amount * 100);
    requestMutation.mutate(amountInCents, {
      onSuccess: () => {
        setWithdrawOpen(false);
        setWithdrawAmount('');
      },
    });
  }

  // ── Chart tooltip ──────────────────────────────────────

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    return (
      <div className="rounded-lg border border-kolecta-gold/30 bg-card px-3 py-2 shadow-md">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-bold text-kolecta-gold">
          {chartMetric === 'orders' ? `${val} vendas` : formatBRL(val)}
        </p>
      </div>
    );
  }

  return (
    <SellerLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-1">Saldo, repasses e histórico financeiro</p>
          </div>
          {summary.stripeConnected ? (
            <Button variant="kolecta" className="glow-primary" onClick={() => setWithdrawOpen(true)}>
              <Wallet className="h-4 w-4 mr-2" /> Solicitar saque
            </Button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-kolecta-red/30 bg-kolecta-red/5 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-kolecta-red shrink-0" />
              <div>
                <p className="text-sm font-medium text-kolecta-red">Configure seus recebimentos</p>
                <p className="text-xs text-muted-foreground">Conecte sua conta bancária para receber pagamentos</p>
              </div>
              <Button size="sm" variant="kolecta" asChild>
                <Link to="/painel-vendedor/stripe-onboarding">Configurar</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-gradient-card">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((c) => {
              const Icon = c.icon;
              const value = summary[c.key];
              return (
                <Card key={c.key} className="bg-gradient-card">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">{c.label}</span>
                      <Icon className={`h-5 w-5 ${c.highlight ? 'text-kolecta-gold' : 'text-muted-foreground'}`} />
                    </div>
                    <p className={`font-heading text-3xl font-bold ${c.highlight ? 'text-kolecta-gold' : ''}`}>
                      {formatBRL(value)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Chart */}
        {loading ? (
          <Card className="bg-gradient-card">
            <CardContent className="p-6">
              <Skeleton className="h-[280px] w-full rounded" />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-heading text-xl">Receita mensal</CardTitle>
              <Select value={chartMetric} onValueChange={(v) => setChartMetric(v as ChartMetric)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(chartMetricLabels) as ChartMetric[]).map((k) => (
                    <SelectItem key={k} value={k}>{chartMetricLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            {/* API: GET /api/seller/financial/chart?period=6m
                Retorna: { month: string, gross: number, net: number, orders: number }[] */}
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={mockChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => chartMetric === 'orders' ? String(v) : `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey={chartMetric}
                    fill="hsl(var(--kolecta-gold))"
                    radius={[4, 4, 0, 0]}
                    className="hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* History tabs */}
        {loading ? (
          <Card className="bg-gradient-card">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="repasses">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="repasses">Repasses</TabsTrigger>
              <TabsTrigger value="comissoes">Comissões</TabsTrigger>
              <TabsTrigger value="saques">Saques</TabsTrigger>
            </TabsList>

            {/* TAB REPASSES */}
            <TabsContent value="repasses">
              {/* API: GET /api/seller/financial/transfers?period= */}
              <Card className="bg-gradient-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead className="text-right">Valor bruto</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                        <TableHead className="text-right">Valor líquido</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockTransfers.map((t) => {
                        const sc = transferStatusConfig[t.status];
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-sm">{fmtDate(t.date)}</TableCell>
                            <TableCell className="font-heading font-semibold">{t.order}</TableCell>
                            <TableCell className="text-right text-sm">{formatBRL(t.gross)}</TableCell>
                            <TableCell className="text-right text-sm text-kolecta-red">-{formatBRL(t.commission)}</TableCell>
                            <TableCell className="text-right font-heading font-bold text-kolecta-gold">{formatBRL(t.net)}</TableCell>
                            <TableCell><Badge variant="outline" className={sc.cls}>{sc.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className="font-heading font-bold">Total</TableCell>
                        <TableCell className="text-right font-heading font-bold">
                          {formatBRL(mockTransfers.reduce((s, t) => s + t.gross, 0))}
                        </TableCell>
                        <TableCell className="text-right font-heading font-bold text-kolecta-red">
                          -{formatBRL(mockTransfers.reduce((s, t) => s + t.commission, 0))}
                        </TableCell>
                        <TableCell className="text-right font-heading font-bold text-kolecta-gold">
                          {formatBRL(mockTransfers.reduce((s, t) => s + t.net, 0))}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB COMISSÕES */}
            <TabsContent value="comissoes">
              {/* API: GET /api/seller/financial/commissions?period= */}
              <Card className="bg-gradient-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead className="text-right">Valor da venda</TableHead>
                        <TableHead className="text-right">Percentual</TableHead>
                        <TableHead className="text-right">Valor cobrado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockCommissions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">{fmtDate(c.date)}</TableCell>
                          <TableCell className="font-heading font-semibold">{c.order}</TableCell>
                          <TableCell className="text-right text-sm">{formatBRL(c.saleValue)}</TableCell>
                          <TableCell className="text-right text-sm">{c.percent}%</TableCell>
                          <TableCell className="text-right font-heading font-bold text-kolecta-red">{formatBRL(c.charged)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="font-heading font-bold">Total de comissões</TableCell>
                        <TableCell className="text-right font-heading font-bold text-kolecta-red">
                          {formatBRL(mockCommissions.reduce((s, c) => s + c.charged, 0))}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB SAQUES — dados reais da API */}
            <TabsContent value="saques">
              <Card className="bg-gradient-card">
                <CardContent className="p-0">
                  {withdrawalsLoading ? (
                    <div className="p-6 space-y-3">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : withdrawals.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      Nenhum saque realizado ainda.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data da solicitação</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((w) => {
                          const statusCfg = {
                            processing: { label: 'Em processamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
                            paid:       { label: 'Concluído', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
                            failed:     { label: 'Recusado', cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
                          }[w.status] ?? { label: w.status, cls: 'bg-muted' };
                          return (
                            <TableRow key={w.id}>
                              <TableCell className="text-sm">{new Date(w.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell className="text-right font-heading font-bold">{(w.amountInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                              <TableCell><Badge variant="outline" className={statusCfg.cls}>{statusCfg.label}</Badge></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Withdraw dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Solicitar saque</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Transfira seu saldo para a conta bancária conectada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="rounded-lg bg-kolecta-gold/10 border border-kolecta-gold/30 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Saldo disponível</p>
              <p className="font-heading text-3xl font-bold text-kolecta-gold">{formatBRL(summary.available)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Valor do saque</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="withdraw-amount"
                  className="pl-9"
                  placeholder="0,00"
                  value={withdrawAmount}
                  onChange={(e) => handleWithdrawAmountChange(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Mínimo R$ 20,00 · Máximo {formatBRL(summary.available)}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Conta destino</p>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
                <span className="text-sm">Nubank •••• 4521</span>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/painel-vendedor/stripe-onboarding">Alterar conta</Link>
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Prazo estimado: <span className="font-medium">2 dias úteis</span></p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setWithdrawOpen(false)}>Cancelar</Button>
            <Button
              variant="kolecta"
              className="glow-primary"
              onClick={handleConfirmWithdraw}
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? 'Processando...' : 'Confirmar saque'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wallet, Clock, TrendingUp, ArrowDownToLine, AlertCircle, Copy, Loader2,
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
import { formatBRL } from '@/lib/currency';
import { useWallet, useWithdrawals, useWalletDeposit, useSellerOrders, useConnect } from '@/hooks/use-api';
import { isValidCpf } from '@/lib/cpf';
import type { Order } from '@/lib/api';

// ── Tipos derivados de dados reais ───────────────────────

interface Transfer {
  id: string; date: string; order: string; gross: number; commission: number | null; net: number | null;
  status: 'transferido' | 'em_processamento' | 'aguardando_entrega';
}

interface Commission {
  id: string; date: string; order: string; saleValue: number; percent: number; charged: number;
}

// Status de pedido que representam uma venda efetiva (excluem pending/cancelled).
const SALE_STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'completed'] as const;

// ── Helpers ──────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

const transferStatusConfig: Record<Transfer['status'], { label: string; cls: string }> = {
  transferido: { label: 'Liberado', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  em_processamento: { label: 'Em processamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  aguardando_entrega: { label: 'Aguardando confirmação', cls: 'bg-muted text-muted-foreground border-border' },
};

/** Deriva a linha de repasse a partir de um pedido de venda. */
function orderToTransfer(o: Order): Transfer {
  const gross = o.totalInCents / 100;
  const hasFee = o.platformFeeInCents != null && o.sellerNetInCents != null;
  const commission = hasFee ? o.platformFeeInCents! / 100 : null;
  const net = hasFee ? o.sellerNetInCents! / 100 : null;
  // Repasse é liberado quando o comprador confirma o recebimento.
  const status: Transfer['status'] = o.buyerConfirmedAt
    ? 'transferido'
    : o.status === 'delivered'
      ? 'aguardando_entrega'
      : 'em_processamento';
  return { id: o.id, date: o.createdAt, order: `#${o.id.slice(0, 8)}`, gross, commission, net, status };
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCpf, setDepositCpf] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const queryClient = useQueryClient();

  // ── API real ──────────────────────────────────────────
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawals().query;
  const { requestMutation } = useWithdrawals();
  const { statusQuery, bankAccountQuery } = useConnect();
  const depositMutation = useWalletDeposit();
  const { data: sales = [], isLoading: salesLoading } = useSellerOrders();

  const loading = walletLoading || salesLoading;

  // Vendas efetivas (exclui pending/cancelled), mais recentes primeiro.
  const saleOrders = useMemo(
    () =>
      sales
        .filter((o) => (SALE_STATUSES as readonly string[]).includes(o.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sales],
  );

  const transfers = useMemo(() => saleOrders.map(orderToTransfer), [saleOrders]);

  // Comissões: só pedidos com taxa já calculada (definida na confirmação).
  const commissions: Commission[] = useMemo(
    () =>
      saleOrders
        .filter((o) => o.platformFeeInCents != null)
        .map((o) => {
          const saleValue = o.totalInCents / 100;
          const charged = o.platformFeeInCents! / 100;
          return {
            id: o.id,
            date: o.createdAt,
            order: `#${o.id.slice(0, 8)}`,
            saleValue,
            percent: saleValue > 0 ? Math.round((charged / saleValue) * 100) : 0,
            charged,
          };
        }),
    [saleOrders],
  );

  // Gráfico: últimos 6 meses (bruto, líquido, nº de vendas).
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; month: string; gross: number; net: number; orders: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: MONTH_LABELS[d.getMonth()],
        gross: 0,
        net: 0,
        orders: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const o of saleOrders) {
      const d = new Date(o.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(k);
      if (i === undefined) continue;
      buckets[i].gross += o.totalInCents / 100;
      buckets[i].net += (o.sellerNetInCents ?? o.totalInCents) / 100;
      buckets[i].orders += 1;
    }
    return buckets;
  }, [saleOrders]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    return saleOrders.reduce((sum, o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        ? sum + o.totalInCents / 100
        : sum;
    }, 0);
  }, [saleOrders]);

  const totalWithdrawn = useMemo(
    () =>
      withdrawals
        .filter((w) => w.status === 'paid')
        .reduce((sum, w) => sum + w.amountInCents / 100, 0),
    [withdrawals],
  );

  const summary = {
    available:      (wallet?.balanceInCents ?? 0) / 100,
    pending:        (wallet?.pendingInCents ?? 0) / 100,
    monthTotal,
    totalWithdrawn,
    stripeConnected: statusQuery.data?.status === 'active',
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

  const pixData = depositMutation.data;
  const depositCpfDigits = depositCpf.replace(/\D/g, '');
  const depositPhoneDigits = depositPhone.replace(/\D/g, '');

  const formatCpf = (v: string) =>
    v
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  function handleConfirmDeposit() {
    const amount = parseAmount(depositAmount);
    if (amount < 5) {
      toast({ title: 'Valor mínimo', description: 'O valor mínimo para depósito é R$ 5,00.', variant: 'destructive' });
      return;
    }
    if (!isValidCpf(depositCpfDigits)) {
      toast({ title: 'CPF inválido', description: 'Confira os dígitos do CPF.', variant: 'destructive' });
      return;
    }
    if (depositPhoneDigits.length < 10) {
      toast({ title: 'Telefone inválido', description: 'Informe o telefone com DDD.', variant: 'destructive' });
      return;
    }
    const amountInCents = Math.round(amount * 100);
    depositMutation.mutate({ amountInCents, cpf: depositCpfDigits, phone: depositPhoneDigits });
  }

  async function handleCopyDepositPix() {
    if (!pixData?.qrCode) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    toast({ title: 'Código Pix copiado!' });
  }

  function handleDepositOpenChange(open: boolean) {
    setDepositOpen(open);
    if (!open) {
      depositMutation.reset();
      setDepositAmount('');
      setDepositCpf('');
      setDepositPhone('');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }
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
            <div className="flex gap-2">
              <Button variant="outline-gold" onClick={() => setDepositOpen(true)}>
                <TrendingUp className="h-4 w-4 mr-2" /> Adicionar Saldo
              </Button>
              <Button variant="kolecta" className="glow-primary" onClick={() => setWithdrawOpen(true)}>
                <Wallet className="h-4 w-4 mr-2" /> Solicitar saque
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-kolecta-red/30 bg-kolecta-red/5 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-kolecta-red shrink-0" />
              <div>
                <p className="text-sm font-medium text-kolecta-red">Configure seus recebimentos</p>
                <p className="text-xs text-muted-foreground">Conecte sua conta bancária para receber pagamentos</p>
              </div>
              <Button size="sm" variant="kolecta" asChild>
                <Link to="/painel/stripe-onboarding">Configurar</Link>
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
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              <Card className="bg-gradient-card">
                <CardContent className="p-0">
                  {transfers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      Nenhuma venda ainda. Os repasses aparecem aqui quando você vende.
                    </div>
                  ) : (
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
                      {transfers.map((t) => {
                        const sc = transferStatusConfig[t.status];
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-sm">{fmtDate(t.date)}</TableCell>
                            <TableCell className="font-heading font-semibold">{t.order}</TableCell>
                            <TableCell className="text-right text-sm">{formatBRL(t.gross)}</TableCell>
                            <TableCell className="text-right text-sm text-kolecta-red">
                              {t.commission != null ? `-${formatBRL(t.commission)}` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-heading font-bold text-kolecta-gold">
                              {t.net != null ? formatBRL(t.net) : '—'}
                            </TableCell>
                            <TableCell><Badge variant="outline" className={sc.cls}>{sc.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className="font-heading font-bold">Total</TableCell>
                        <TableCell className="text-right font-heading font-bold">
                          {formatBRL(transfers.reduce((s, t) => s + t.gross, 0))}
                        </TableCell>
                        <TableCell className="text-right font-heading font-bold text-kolecta-red">
                          -{formatBRL(transfers.reduce((s, t) => s + (t.commission ?? 0), 0))}
                        </TableCell>
                        <TableCell className="text-right font-heading font-bold text-kolecta-gold">
                          {formatBRL(transfers.reduce((s, t) => s + (t.net ?? 0), 0))}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB COMISSÕES */}
            <TabsContent value="comissoes">
              <Card className="bg-gradient-card">
                <CardContent className="p-0">
                  {commissions.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      Nenhuma comissão cobrada ainda. A comissão é calculada quando a venda é confirmada.
                    </div>
                  ) : (
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
                      {commissions.map((c) => (
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
                          {formatBRL(commissions.reduce((s, c) => s + c.charged, 0))}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                  )}
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
              <p className="text-xs text-muted-foreground">Mínimo R$ 50,00 · Máximo {formatBRL(summary.available)}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Conta destino</p>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
                {bankAccountQuery.isLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : bankAccountQuery.data ? (
                  <span className="text-sm">
                    {bankAccountQuery.data.bankName} •••• {bankAccountQuery.data.last4}
                  </span>
                ) : (
                  <span className="text-sm text-destructive">Nenhuma conta configurada</span>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/painel/stripe-onboarding">Alterar conta</Link>
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

      {/* ── Deposit Dialog ──────────────────────────────────── */}
      <Dialog open={depositOpen} onOpenChange={handleDepositOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase tracking-wider">
              {pixData ? 'Pague com Pix' : 'Adicionar Saldo'}
            </DialogTitle>
            <DialogDescription>
              {pixData
                ? 'Escaneie o QR Code ou copie o código no app do seu banco. O saldo é creditado automaticamente após o pagamento.'
                : 'Recarregue sua carteira Kolecta via Pix. Informe os dados abaixo para gerar o código.'}
            </DialogDescription>
          </DialogHeader>

          {pixData ? (
            <div className="flex flex-col items-center gap-4 py-2">
              {pixData.qrCodeUrl && (
                <img
                  src={pixData.qrCodeUrl}
                  alt="QR Code Pix"
                  className="h-52 w-52 rounded-lg border border-border bg-white p-2"
                />
              )}
              <div className="w-full space-y-1">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Pix copia e cola</Label>
                <div className="flex gap-2">
                  <Input readOnly value={pixData.qrCode} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyDepositPix}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Valor:{' '}
                <span className="font-heading text-foreground">
                  R$ {(pixData.amountInCents / 100).toFixed(2).replace('.', ',')}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount" className="text-sm">Valor do depósito (R$)</Label>
                <Input
                  id="deposit-amount"
                  placeholder="Ex: 50,00"
                  className="font-mono text-lg"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/[^\d,]/g, ''))}
                />
              </div>

              <div className="flex gap-2">
                {[25, 50, 100, 250].map((val) => (
                  <Button
                    key={val}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setDepositAmount(String(val).replace('.', ','))}
                  >
                    R$ {val}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-cpf" className="text-sm">CPF</Label>
                <Input
                  id="deposit-cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={depositCpf}
                  onChange={(e) => setDepositCpf(formatCpf(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-phone" className="text-sm">Telefone (com DDD)</Label>
                <Input
                  id="deposit-phone"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  value={depositPhone}
                  onChange={(e) => setDepositPhone(formatPhone(e.target.value))}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Mínimo R$ 5,00 · CPF e telefone são exigidos pelo Pix.
              </p>
            </div>
          )}

          <DialogFooter>
            {pixData ? (
              <Button variant="kolecta" className="w-full" onClick={() => handleDepositOpenChange(false)}>
                Concluir
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => handleDepositOpenChange(false)}>Cancelar</Button>
                <Button
                  variant="kolecta"
                  className="glow-primary"
                  onClick={handleConfirmDeposit}
                  disabled={depositMutation.isPending}
                >
                  {depositMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando Pix...
                    </>
                  ) : (
                    'Gerar Pix'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}

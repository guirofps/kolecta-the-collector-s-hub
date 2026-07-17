import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { formatBRL } from '@/lib/currency';
import { useAdminFinancial } from '@/hooks/use-api';
import { DollarSign, ShoppingBag, ArrowUpFromLine, Wallet, Clock } from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  paid: { label: 'Pago', variant: 'secondary' },
  processing: { label: 'Em separação', variant: 'secondary' },
  shipped: { label: 'Enviado', variant: 'outline' },
  delivered: { label: 'Entregue', variant: 'outline' },
  completed: { label: 'Concluído', variant: 'default' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function SummaryCard({ title, value, icon: Icon, valueClass }: {
  title: string; value: string; icon: React.ElementType; valueClass?: string;
}) {
  return (
    <Card className="bg-gradient-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`font-heading text-3xl font-extrabold italic ${valueClass ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <Card className="bg-gradient-card border-border">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Clock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-md">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminFinancial() {
  const { data, isLoading } = useAdminFinancial();
  const [txSearch, setTxSearch] = useState('');

  const summary = data?.summary;
  const transactions = data?.transactions ?? [];
  const pendingWithdrawals = data?.pendingWithdrawals ?? [];

  const filteredTransactions = transactions.filter((tx) => {
    if (!txSearch) return true;
    const q = txSearch.toLowerCase();
    return tx.orderId.toLowerCase().includes(q) || tx.buyer.toLowerCase().includes(q);
  });

  const txTotals = filteredTransactions.reduce(
    (acc, tx) => ({
      gross: acc.gross + tx.gross,
      commission: acc.commission + tx.commission,
      net: acc.net + (tx.net ?? 0),
    }),
    { gross: 0, commission: 0, net: 0 },
  );

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold italic uppercase">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral financeira da plataforma</p>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard title="Receita da plataforma" value={formatBRL(summary?.revenue ?? 0)} icon={DollarSign} valueClass="text-kolecta-gold" />
            <SummaryCard title="Volume transacionado" value={formatBRL(summary?.volume ?? 0)} icon={ShoppingBag} />
            <SummaryCard title="Repasses (líquido liberado)" value={formatBRL(summary?.payouts ?? 0)} icon={ArrowUpFromLine} />
            <SummaryCard title="Saques pendentes" value={formatBRL(summary?.pendingWithdrawals ?? 0)} icon={Wallet} />
          </div>
        )}

        {/* Detail Tabs */}
        <Tabs defaultValue="transactions">
          <TabsList className="mb-4">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="withdrawals">Saques pendentes</TabsTrigger>
            <TabsTrigger value="payouts">Repasses</TabsTrigger>
            <TabsTrigger value="refunds">Estornos</TabsTrigger>
          </TabsList>

          {/* Transações */}
          <TabsContent value="transactions">
            <Card className="bg-gradient-card border-border">
              <CardHeader className="pb-3">
                <Input placeholder="Buscar pedido ou comprador..." value={txSearch} onChange={(e) => setTxSearch(e.target.value)} className="sm:max-w-xs" />
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
                ) : filteredTransactions.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] uppercase">Data</TableHead>
                          <TableHead className="text-[11px] uppercase">Pedido</TableHead>
                          <TableHead className="text-[11px] uppercase">Comprador</TableHead>
                          <TableHead className="text-[11px] uppercase text-right">Valor bruto</TableHead>
                          <TableHead className="text-[11px] uppercase text-right">Comissão</TableHead>
                          <TableHead className="text-[11px] uppercase text-right">Líquido vendedor</TableHead>
                          <TableHead className="text-[11px] uppercase">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx) => {
                          const sc = statusConfig[tx.status] ?? { label: tx.status, variant: 'outline' as const };
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs text-muted-foreground">{fmtDate(tx.date)}</TableCell>
                              <TableCell className="text-xs font-medium">{tx.orderId}</TableCell>
                              <TableCell className="text-xs">{tx.buyer}</TableCell>
                              <TableCell className="text-xs text-right font-medium">{formatBRL(tx.gross)}</TableCell>
                              <TableCell className="text-xs text-right text-kolecta-gold font-medium">
                                {tx.commissionPct != null ? formatBRL(tx.commission) : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-right">{tx.net != null ? formatBRL(tx.net) : '—'}</TableCell>
                              <TableCell><Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell colSpan={3} className="text-xs font-heading uppercase">Total da página</TableCell>
                          <TableCell className="text-xs text-right font-heading font-bold">{formatBRL(txTotals.gross)}</TableCell>
                          <TableCell className="text-xs text-right font-heading font-bold text-kolecta-gold">{formatBRL(txTotals.commission)}</TableCell>
                          <TableCell className="text-xs text-right font-heading font-bold">{formatBRL(txTotals.net)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Saques pendentes */}
          <TabsContent value="withdrawals">
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
                ) : pendingWithdrawals.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum saque pendente.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] uppercase">Solicitação</TableHead>
                          <TableHead className="text-[11px] uppercase">Vendedor</TableHead>
                          <TableHead className="text-[11px] uppercase text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingWithdrawals.map((wd) => (
                          <TableRow key={wd.id}>
                            <TableCell className="text-xs text-muted-foreground">{fmtDate(wd.date)}</TableCell>
                            <TableCell className="text-xs font-medium">{wd.seller}</TableCell>
                            <TableCell className="text-xs text-right font-heading font-bold text-kolecta-gold">{formatBRL(wd.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Repasses — via provedor de pagamento */}
          <TabsContent value="payouts">
            <ComingSoon label="Em breve — os repasses são liquidados diretamente pelo provedor de pagamento (Stripe/Pagar.me). A conciliação detalhada por vendedor será adicionada aqui." />
          </TabsContent>

          {/* Estornos */}
          <TabsContent value="refunds">
            <ComingSoon label="Em breve — o fluxo de estorno/refund ainda não está implementado no backend." />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

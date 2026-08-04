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
import {
  vendasDeHoje, resumoDoDia, tempoRelativo, horaDe, filtrarBusca,
  rotuloOrigem, rotuloPagamento, ehVenda,
} from '@/lib/admin-vendas';
import { DollarSign, ShoppingBag, ArrowUpFromLine, Wallet, Clock, Package, Store, User, Gavel } from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  paid: { label: 'Pago', variant: 'secondary' },
  processing: { label: 'Em separação', variant: 'secondary' },
  shipped: { label: 'Enviado', variant: 'outline' },
  delivered: { label: 'Entregue', variant: 'outline' },
  completed: { label: 'Concluído', variant: 'default' },
  // O painel passou a listar o pedido desde que ele nasce, então precisa de
  // nome para o que ainda não virou venda. Sem isto aparecia o status cru
  // ("pending_payment") na tela.
  pending: { label: 'Aguardando', variant: 'outline' },
  pending_payment: { label: 'Aguardando pagamento', variant: 'outline' },
  cancelled: { label: 'Não pago', variant: 'destructive' },
  disputed: { label: 'Em disputa', variant: 'destructive' },
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

  // Busca agora varre vendedor e produto também (ver lib/admin-vendas).
  const filteredTransactions = filtrarBusca(transactions, txSearch);

  // Acompanhamento do dia: é a pergunta que a equipe faz ("saiu venda hoje?
  // de quem?"), e que o painel não respondia.
  const hoje = vendasDeHoje(transactions);
  const resumo = resumoDoDia(hoje);

  // Soma só venda confirmada: a lista passou a incluir Pix gerado e pedido não
  // pago, e somá-los aqui daria um total que nunca entrou no caixa.
  const txTotals = filteredTransactions.filter(ehVenda).reduce(
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

        {/* ─── Acompanhamento do dia ──────────────────────────────────────────
            A pergunta que a equipe faz quando entra aqui é "saiu venda hoje, de
            quem, de qual produto?". A tabela de transações não respondia: era
            uma lista das últimas 100, só com data (sem hora) e sem vendedor nem
            produto. Esta faixa responde de cara, e se atualiza sozinha. */}
        <Card className="bg-gradient-card border-border mb-8">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kolecta-gold opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-kolecta-gold" />
                </span>
                <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Vendas de hoje</h2>
                <span className="text-[11px] text-muted-foreground">atualiza sozinho</span>
              </div>
              {/* Venda confirmada e pedido não pago vivem em colunas separadas
                  de propósito: somar os dois no "bruto" prometeria dinheiro que
                  não entrou. */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Vendas</span>
                  <span className="font-heading text-xl font-bold">{resumo.vendas.quantidade}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Bruto</span>
                  <span className="font-heading text-xl font-bold">{formatBRL(resumo.vendas.bruto)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Comissão</span>
                  <span className="font-heading text-xl font-bold text-kolecta-gold">{formatBRL(resumo.vendas.comissao)}</span>
                </div>
                <div className="border-l border-border pl-5">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Modo Lance</span>
                  <span className="font-heading text-xl font-bold">{resumo.modoLance.quantidade}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Não pagos</span>
                  <span className="font-heading text-xl font-bold text-muted-foreground">{resumo.aguardando.quantidade}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
            ) : hoje.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhum pedido hoje ainda. Assim que alguém comprar ou arrematar, aparece aqui sozinho.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {hoje.map((tx) => {
                  const sc = statusConfig[tx.status] ?? { label: tx.status, variant: 'outline' as const };
                  const confirmada = ehVenda(tx);
                  const arremate = tx.origin === 'auction';
                  return (
                    <li
                      key={tx.id}
                      // Pedido que não virou venda entra apagado: aparece (é o
                      // que o acompanhamento pede) sem competir com o que é
                      // dinheiro de verdade.
                      className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${confirmada ? '' : 'opacity-60'}`}
                    >
                      <div className="w-14 shrink-0">
                        <span className="block font-heading text-sm font-bold">{horaDe(tx)}</span>
                        <span className="block text-[10px] text-muted-foreground">{tempoRelativo(tx)}</span>
                      </div>

                      <div className="min-w-[180px] flex-1">
                        {/* Produto e vendedor só aparecem quando o backend passar
                            a devolvê-los; até lá o traço deixa claro que falta o
                            dado, em vez de sumir a coluna. */}
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {tx.product ?? '—'}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" /> {tx.seller ?? '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {tx.buyer}
                          </span>
                          <span>{tx.orderId}</span>
                        </span>
                      </div>

                      {/* Origem e forma de pagamento: sem isso, um arremate de
                          leilão e um Pix comum ficam iguais na lista. */}
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={arremate ? 'default' : 'outline'}
                          className={`text-[10px] ${arremate ? '' : 'text-muted-foreground'}`}
                        >
                          {arremate && <Gavel className="mr-1 h-3 w-3" />}
                          {rotuloOrigem(tx)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {rotuloPagamento(tx)}
                        </Badge>
                      </div>

                      <div className="text-right">
                        <span className="block font-heading text-sm font-bold">{formatBRL(tx.gross)}</span>
                        <span className="block text-[10px] text-kolecta-gold">
                          {tx.commissionPct != null ? `comissão ${formatBRL(tx.commission)}` : 'comissão —'}
                        </span>
                      </div>

                      <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

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
                <Input placeholder="Buscar por pedido, produto, vendedor ou comprador..." value={txSearch} onChange={(e) => setTxSearch(e.target.value)} className="sm:max-w-md" />
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
                          <TableHead className="text-[11px] uppercase">Produto</TableHead>
                          <TableHead className="text-[11px] uppercase">Vendedor</TableHead>
                          <TableHead className="text-[11px] uppercase">Comprador</TableHead>
                          <TableHead className="text-[11px] uppercase">Origem</TableHead>
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
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {fmtDate(tx.date)}
                                <span className="block text-[10px] opacity-70">{horaDe(tx)}</span>
                              </TableCell>
                              <TableCell className="text-xs font-medium">{tx.orderId}</TableCell>
                              <TableCell className="text-xs max-w-[220px] truncate" title={tx.product ?? ''}>
                                {tx.product ?? '—'}
                              </TableCell>
                              <TableCell className="text-xs">{tx.seller ?? '—'}</TableCell>
                              <TableCell className="text-xs">{tx.buyer}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {rotuloOrigem(tx)}
                                <span className="block text-[10px] text-muted-foreground">{rotuloPagamento(tx)}</span>
                              </TableCell>
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
                          <TableCell colSpan={6} className="text-xs font-heading uppercase">Total (só vendas confirmadas)</TableCell>
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

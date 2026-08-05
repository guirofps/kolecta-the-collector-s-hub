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
  eventosDe, filtrarPeriodo, resumoEventos, PERIODOS, type Periodo,
  tempoRelativo, horaDe, filtrarBusca, rotuloOrigem, rotuloPagamento, ehVenda,
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
  // Status de LANCE (a linha do tempo mistura venda e lance).
  active: { label: 'Lance ativo', variant: 'secondary' },
  won: { label: 'Arrematou', variant: 'default' },
  outbid: { label: 'Superado', variant: 'outline' },
  lost: { label: 'Perdeu', variant: 'outline' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function SummaryCard({ title, value, icon: Icon, valueClass, hint }: {
  title: string; value: string; icon: React.ElementType; valueClass?: string; hint?: string;
}) {
  return (
    <Card className="bg-gradient-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`font-heading text-3xl font-extrabold italic ${valueClass ?? ''}`}>{value}</p>
        {/* A régua do número, embaixo dele: sem isto a receita parecia errada,
            porque contava só o pedido já finalizado e ignorava a venda paga que
            ainda estava a caminho. */}
        {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
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

  // Linha do tempo da plataforma: venda E lance, no mesmo lugar. Lance não é
  // pedido, então antes não aparecia em canto nenhum do painel.
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const eventos = filtrarPeriodo(eventosDe(transactions, data?.bids ?? []), periodo);
  const resumo = resumoEventos(eventos);

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
            <SummaryCard
              title="Receita da plataforma"
              value={formatBRL(summary?.revenue ?? 0)}
              icon={DollarSign}
              valueClass="text-kolecta-gold"
              hint={
                summary?.revenueSettled != null
                  ? `Comissão de toda venda paga. ${formatBRL(summary.revenueSettled)} já finalizado (entrega confirmada).`
                  : 'Comissão sobre as vendas pagas.'
              }
            />
            <SummaryCard
              title="Volume transacionado"
              value={formatBRL(summary?.volume ?? 0)}
              icon={ShoppingBag}
              hint="Só vendas pagas. Pix gerado e não pago fica de fora."
            />
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
                <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Atividade</h2>
                <span className="text-[11px] text-muted-foreground">atualiza sozinho</span>
                {/* Recorte por período: o painel só mostrava "as últimas 100",
                    sem responder "quanto saiu esta semana?". */}
                <div className="ml-2 flex items-center gap-1">
                  {PERIODOS.map((p) => (
                    <button
                      key={p.valor}
                      type="button"
                      onClick={() => setPeriodo(p.valor)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        periodo === p.valor
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      }`}
                    >
                      {p.rotulo}
                    </button>
                  ))}
                </div>
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
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Lances</span>
                  <span className="font-heading text-xl font-bold">{resumo.lances.quantidade}</span>
                  {resumo.lances.quantidade > 0 && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ({formatBRL(resumo.lances.valor)})
                    </span>
                  )}
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
            ) : eventos.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nada neste período ainda. Venda ou lance que acontecer aparece aqui sozinho.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {eventos.map((ev) => {
                  const sc = statusConfig[ev.status] ?? { label: ev.status, variant: 'outline' as const };
                  const eLance = ev.tipo === 'lance';
                  return (
                    <li
                      key={ev.id}
                      // O que não está garantido (pedido não pago, lance sem
                      // retenção no cartão) entra apagado: aparece, porque é o
                      // que o acompanhamento pede, sem competir com o que é
                      // dinheiro de verdade.
                      className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${ev.confirmado ? '' : 'opacity-60'}`}
                    >
                      <div className="w-14 shrink-0">
                        <span className="block font-heading text-sm font-bold">{horaDe(ev)}</span>
                        <span className="block text-[10px] text-muted-foreground">{tempoRelativo(ev)}</span>
                      </div>

                      <div className="min-w-[180px] flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {eLance
                            ? <Gavel className="h-3.5 w-3.5 shrink-0 text-primary" />
                            : <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                          {ev.produto ?? '—'}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" /> {ev.vendedor ?? '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {ev.pessoa}
                          </span>
                        </span>
                      </div>

                      {/* Venda ou lance, e como foi pago. Sem isso, um arremate
                          e um Pix comum ficam iguais na lista. */}
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={eLance ? 'default' : 'outline'}
                          className={`text-[10px] ${eLance ? '' : 'text-muted-foreground'}`}
                        >
                          {eLance ? <><Gavel className="mr-1 h-3 w-3" />Lance</> : rotuloOrigem({ origin: ev.origem })}
                        </Badge>
                        {!eLance && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {rotuloPagamento({ paymentInstrument: ev.pagamento })}
                          </Badge>
                        )}
                        {eLance && !ev.confirmado && (
                          <Badge variant="destructive" className="text-[10px]">sem retenção</Badge>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="block font-heading text-sm font-bold">{formatBRL(ev.valor)}</span>
                        <span className="block text-[10px] text-kolecta-gold">
                          {eLance
                            ? (ev.confirmado ? 'retido no cartão' : '—')
                            : (ev.comissao ? `comissão ${formatBRL(ev.comissao)}` : 'comissão —')}
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

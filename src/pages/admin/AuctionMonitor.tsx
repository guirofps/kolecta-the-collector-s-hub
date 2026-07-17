import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatBRL } from '@/lib/currency';
import { useAdminAuctionsMonitor } from '@/hooks/use-api';
import type { AdminAuctionItem } from '@/lib/api';
import { Gavel, TrendingUp, AlertCircle, RefreshCw, Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Countdown helpers ─── */
function getTimeLeft(endsAt: string | null) {
  if (!endsAt) return { h: 0, m: 0, s: 0, ended: true, totalMs: 0 };
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0, ended: true, totalMs: 0 };
  return {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
    ended: false,
    totalMs: diff,
  };
}
function pad(n: number) { return n.toString().padStart(2, '0'); }

function useCountdown(endsAt: string | null) {
  const [t, setT] = useState(() => getTimeLeft(endsAt));
  useEffect(() => {
    const iv = setInterval(() => setT(getTimeLeft(endsAt)), 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return t;
}

function LiveCountdown({ endsAt }: { endsAt: string | null }) {
  const t = useCountdown(endsAt);
  if (t.ended) return <span className="text-muted-foreground text-xs">Encerrado</span>;
  const urgent = t.totalMs <= 3600000;
  return (
    <span className={cn('font-heading text-xs font-bold tabular-nums', urgent ? 'text-[hsl(var(--kolecta-red))]' : 'text-foreground')}>
      {t.h > 0 && `${t.h}h `}{pad(t.m)}m {pad(t.s)}s
    </span>
  );
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function EmptyTab({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{msg}</p>
    </div>
  );
}

function SkeletonTable() {
  return <div className="space-y-2 mt-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
}

export default function AuctionMonitorPage() {
  const { data: auctions = [], isLoading, refetch, isFetching } = useAdminAuctionsMonitor();
  const [tab, setTab] = useState('active');

  const active = useMemo(
    () => auctions.filter((a) => a.status === 'active')
      .sort((x, y) => new Date(x.endsAt ?? 0).getTime() - new Date(y.endsAt ?? 0).getTime()),
    [auctions],
  );
  const endingSoon = useMemo(
    () => active.filter((a) => {
      const t = getTimeLeft(a.endsAt);
      return !t.ended && t.totalMs <= 86400000;
    }),
    [active],
  );
  const ended = useMemo(
    () => auctions.filter((a) => a.status === 'ended' || a.status === 'cancelled')
      .sort((x, y) => new Date(y.endsAt ?? 0).getTime() - new Date(x.endsAt ?? 0).getTime()),
    [auctions],
  );

  const totalVolume = active.reduce((s, a) => s + (a.currentBid ?? a.startingBid), 0);
  const totalBids = auctions.reduce((s, a) => s + a.totalBids, 0);
  const endingIn1h = active.filter((a) => {
    const t = getTimeLeft(a.endsAt);
    return !t.ended && t.totalMs <= 3600000;
  }).length;

  const summaryCards = [
    { label: 'Leilões ativos agora', value: String(active.length), icon: Gavel, color: 'text-[hsl(var(--kolecta-gold))]' },
    { label: 'Total de lances', value: String(totalBids), icon: TrendingUp, color: 'text-foreground' },
    { label: 'Volume ativo (lance atual)', value: formatBRL(totalVolume), icon: Gavel, color: 'text-[hsl(var(--kolecta-gold))]' },
    { label: 'Encerrando em 1h', value: String(endingIn1h), icon: AlertCircle, color: 'text-[hsl(var(--kolecta-red))]' },
  ];

  const renderTable = (list: AdminAuctionItem[], showWinner = false) => (
    <div className="mt-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead>{showWinner ? 'Lance final' : 'Lance atual'}</TableHead>
            <TableHead>Lances</TableHead>
            {showWinner ? <TableHead>Vencedor</TableHead> : <TableHead>Tempo restante</TableHead>}
            <TableHead>Encerramento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((a) => {
            const t = getTimeLeft(a.endsAt);
            const urgent = !showWinner && !t.ended && t.totalMs <= 3600000;
            return (
              <TableRow key={a.id} className={urgent ? 'bg-[hsl(var(--kolecta-red)/0.05)]' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <img src={a.productImage ?? '/placeholder.svg'} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    <span className="font-heading font-medium text-sm truncate max-w-[180px]">{a.productName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{a.sellerName}</TableCell>
                <TableCell className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">
                  {a.currentBid != null ? formatBRL(a.currentBid) : formatBRL(a.startingBid)}
                </TableCell>
                <TableCell><Badge variant="secondary">{a.totalBids}</Badge></TableCell>
                {showWinner ? (
                  <TableCell className="text-sm">
                    {a.status === 'cancelled'
                      ? <span className="text-muted-foreground">Cancelado</span>
                      : (a.winnerName ?? <span className="text-muted-foreground">Sem lances</span>)}
                  </TableCell>
                ) : (
                  <TableCell><LiveCountdown endsAt={a.endsAt} /></TableCell>
                )}
                <TableCell className="text-xs text-muted-foreground">{fmtDateTime(a.endsAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/anuncios/${a.listingId}`}><Eye className="h-3.5 w-3.5" /></Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-3xl font-bold">Monitoramento — Modo Lance</h1>
              <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {active.length} ativos
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4 mr-1', isFetching && 'animate-spin')} /> Atualizar
          </Button>
        </div>

        {/* Summary */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((c) => (
              <Card key={c.label} className="bg-gradient-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <c.icon className={`h-7 w-7 ${c.color}`} />
                  <div>
                    <p className={`font-heading text-2xl font-bold ${c.color}`}>{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="active">Ativos <Badge variant="secondary" className="ml-1.5 text-[10px]">{active.length}</Badge></TabsTrigger>
            <TabsTrigger value="ending">Encerrando em breve <Badge className="ml-1.5 text-[10px] bg-[hsl(var(--kolecta-red)/0.2)] text-[hsl(var(--kolecta-red))]">{endingSoon.length}</Badge></TabsTrigger>
            <TabsTrigger value="ended">Encerrados <Badge variant="secondary" className="ml-1.5 text-[10px]">{ended.length}</Badge></TabsTrigger>
            <TabsTrigger value="alerts">Suspeitos</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? <SkeletonTable /> : active.length === 0 ? <EmptyTab msg="Nenhum leilão ativo" /> : renderTable(active)}
          </TabsContent>

          <TabsContent value="ending">
            {isLoading ? <SkeletonTable /> : endingSoon.length === 0 ? <EmptyTab msg="Nenhum leilão encerrando nas próximas 24h" /> : renderTable(endingSoon)}
          </TabsContent>

          <TabsContent value="ended">
            {isLoading ? <SkeletonTable /> : ended.length === 0 ? <EmptyTab msg="Nenhum leilão encerrado" /> : renderTable(ended, true)}
          </TabsContent>

          {/* Suspeitos — detecção de fraude ainda não implementada */}
          <TabsContent value="alerts">
            <div className="flex flex-col items-center py-16 text-center gap-2">
              <Clock className="h-10 w-10 text-muted-foreground" />
              <p className="font-heading font-bold">Detecção de lances suspeitos — Em breve</p>
              <p className="text-sm text-muted-foreground max-w-md">
                A análise automática de padrões (mesmo IP, shill bidding, incrementos anômalos) ainda não está
                implementada. Será adicionada aqui quando o rastreamento de lances estiver disponível.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

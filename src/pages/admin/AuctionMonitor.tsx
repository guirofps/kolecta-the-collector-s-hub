import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/mock-data';
import {
  Gavel, TrendingUp, AlertCircle, RefreshCw, Timer, Eye, Bell, RotateCcw, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
interface AuctionBid {
  id: string;
  bidderName: string;
  amount: number;
  createdAt: string;
  ip?: string;
}

interface AdminAuction {
  id: string;
  productName: string;
  productImage: string;
  sellerName: string;
  sellerSlug: string;
  currentBid: number | null;
  totalBids: number;
  startedAt: string;
  endsAt: string;
  status: 'active' | 'pending_payment';
  winnerName?: string;
  paymentDeadline?: string;
  bids: AuctionBid[];
}

interface AuctionAlert {
  id: string;
  auctionId: string;
  productName: string;
  type: 'same_ip' | 'high_bid' | 'shill_bidding';
  description: string;
  severity: 'high' | 'medium';
  createdAt: string;
}

/* ─── Helpers ─── */
function futureDate(hours: number) { return new Date(Date.now() + hours * 3600000).toISOString(); }
function pastDate(hours: number) { return new Date(Date.now() - hours * 3600000).toISOString(); }

function getTimeLeft(endsAt: string) {
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

function useCountdown(endsAt: string) {
  const [t, setT] = useState(() => getTimeLeft(endsAt));
  useEffect(() => {
    const iv = setInterval(() => setT(getTimeLeft(endsAt)), 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return t;
}

function LiveCountdown({ endsAt }: { endsAt: string }) {
  const t = useCountdown(endsAt);
  if (t.ended) return <span className="text-muted-foreground text-xs">Encerrado</span>;
  const urgent = t.totalMs <= 3600000;
  return (
    <span className={cn('font-heading text-xs font-bold tabular-nums', urgent ? 'text-[hsl(var(--kolecta-red))]' : 'text-foreground')}>
      {t.h > 0 && `${t.h}h `}{pad(t.m)}m {pad(t.s)}s
    </span>
  );
}

/* ─── Mock Data ─── */
const mockAuctions: AdminAuction[] = [
  {
    id: 'aa-1', productName: 'Capacete Arai RX-7V Racing', productImage: '/placeholder.svg',
    sellerName: 'JDM Imports', sellerSlug: 'jdm-imports',
    currentBid: 1350, totalBids: 8, startedAt: pastDate(72), endsAt: futureDate(48), status: 'active',
    bids: [
      { id: 'ab1', bidderName: 'João S.', amount: 1350, createdAt: pastDate(1) },
      { id: 'ab2', bidderName: 'Maria L.', amount: 1300, createdAt: pastDate(3) },
    ],
  },
  {
    id: 'aa-2', productName: 'Jaqueta Alpinestars GP Plus', productImage: '/placeholder.svg',
    sellerName: 'Drift Garage', sellerSlug: 'drift-garage',
    currentBid: 780, totalBids: 5, startedAt: pastDate(96), endsAt: futureDate(18), status: 'active',
    bids: [
      { id: 'ab3', bidderName: 'Lucas F.', amount: 780, createdAt: pastDate(2) },
    ],
  },
  {
    id: 'aa-3', productName: 'Slider Procton Racing', productImage: '/placeholder.svg',
    sellerName: 'Touge Parts', sellerSlug: 'touge-parts',
    currentBid: 230, totalBids: 6, startedAt: pastDate(48), endsAt: futureDate(0.4), status: 'active',
    bids: [
      { id: 'ab4', bidderName: 'Marcos T.', amount: 230, createdAt: pastDate(0.5) },
      { id: 'ab5', bidderName: 'Diego R.', amount: 210, createdAt: pastDate(1) },
    ],
  },
  {
    id: 'aa-4', productName: 'Escapamento Akrapovic Titanium', productImage: '/placeholder.svg',
    sellerName: 'JDM Imports', sellerSlug: 'jdm-imports',
    currentBid: 4200, totalBids: 15, startedAt: pastDate(120), endsAt: futureDate(6), status: 'active',
    bids: [
      { id: 'ab6', bidderName: 'Felipe A.', amount: 4200, createdAt: pastDate(0.5) },
    ],
  },
  {
    id: 'aa-5', productName: 'Luva Dainese Carbon 3', productImage: '/placeholder.svg',
    sellerName: 'Drift Garage', sellerSlug: 'drift-garage',
    currentBid: 520, totalBids: 7, startedAt: pastDate(168), endsAt: pastDate(2), status: 'pending_payment',
    winnerName: 'Ricardo M.', paymentDeadline: futureDate(10),
    bids: [],
  },
  {
    id: 'aa-6', productName: 'Banco Esportivo Recaro', productImage: '/placeholder.svg',
    sellerName: 'Touge Parts', sellerSlug: 'touge-parts',
    currentBid: 1800, totalBids: 9, startedAt: pastDate(200), endsAt: pastDate(6), status: 'pending_payment',
    winnerName: 'Camila D.', paymentDeadline: futureDate(3),
    bids: [],
  },
];

const mockAlerts: AuctionAlert[] = [
  {
    id: 'al-1', auctionId: 'aa-1', productName: 'Capacete Arai RX-7V Racing',
    type: 'same_ip', description: 'Dois lances consecutivos de IPs idênticos (189.x.x.12) — possível conta duplicada.',
    severity: 'high', createdAt: pastDate(2),
  },
  {
    id: 'al-2', auctionId: 'aa-4', productName: 'Escapamento Akrapovic Titanium',
    type: 'shill_bidding', description: 'Padrão de incrementos regulares entre mesmos 2 licitantes detectado em 8 dos 15 lances.',
    severity: 'high', createdAt: pastDate(1),
  },
];

const alertTypeLabels: Record<string, string> = {
  same_ip: 'Múltiplos lances do mesmo IP',
  high_bid: 'Lance muito acima da média',
  shill_bidding: 'Padrão de shill bidding',
};

/* ─── Main Component ─── */
export default function AuctionMonitorPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState<AdminAuction[]>([]);
  const [alerts, setAlerts] = useState<AuctionAlert[]>([]);
  const [tab, setTab] = useState('active');
  const [interveneDialog, setInterveneDialog] = useState<AdminAuction | null>(null);
  const [interveneAction, setInterveneAction] = useState('close');
  const [interveneReason, setInterveneReason] = useState('');
  const [interveneExtra, setInterveneExtra] = useState('');
  const [interveneBidId, setInterveneBidId] = useState('');
  const [sortCol, setSortCol] = useState<string>('endsAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const t = setTimeout(() => { setAuctions(mockAuctions); setAlerts(mockAlerts); setLoading(false); }, 500);
    return () => clearTimeout(t);
  }, []);

  const active = useMemo(() => {
    const list = auctions.filter(a => a.status === 'active');
    list.sort((a, b) => {
      const av = sortCol === 'currentBid' ? (a.currentBid ?? 0) : sortCol === 'totalBids' ? a.totalBids : new Date(a.endsAt).getTime();
      const bv = sortCol === 'currentBid' ? (b.currentBid ?? 0) : sortCol === 'totalBids' ? b.totalBids : new Date(b.endsAt).getTime();
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [auctions, sortCol, sortDir]);

  const endingSoon = useMemo(() => active.filter(a => getTimeLeft(a.endsAt).totalMs <= 86400000 && !getTimeLeft(a.endsAt).ended), [active]);
  const pendingPayment = useMemo(() => auctions.filter(a => a.status === 'pending_payment'), [auctions]);

  const totalVolume = active.reduce((s, a) => s + (a.currentBid ?? 0), 0);
  const endingIn1h = active.filter(a => getTimeLeft(a.endsAt).totalMs <= 3600000 && !getTimeLeft(a.endsAt).ended).length;
  const totalBids24h = auctions.reduce((s, a) => s + a.totalBids, 0);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleIntervene = () => {
    if (!interveneReason.trim()) { toast({ title: 'Motivo obrigatório', variant: 'destructive' }); return; }
    const msgs: Record<string, string> = { close: 'Leilão encerrado', cancel: 'Leilão cancelado', remove_bid: 'Lance removido', extend: 'Prazo estendido' };
    toast({ title: msgs[interveneAction] || 'Intervenção realizada' });
    setInterveneDialog(null);
    setInterveneAction('close'); setInterveneReason(''); setInterveneExtra(''); setInterveneBidId('');
  };

  const summaryCards = [
    { label: 'Leilões ativos agora', value: active.length, icon: Gavel, color: 'text-[hsl(var(--kolecta-gold))]' },
    { label: 'Lances nas últimas 24h', value: totalBids24h, icon: TrendingUp, color: 'text-foreground' },
    { label: 'Volume financeiro ativo', value: formatBRL(totalVolume), icon: Gavel, color: 'text-[hsl(var(--kolecta-gold))]', isString: true },
    { label: 'Encerrando em 1h', value: endingIn1h, icon: AlertCircle, color: 'text-[hsl(var(--kolecta-red))]' },
  ];

  const renderAuctionTable = (list: AdminAuction[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Vendedor</TableHead>
          <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('currentBid')}>
            Lance atual {sortCol === 'currentBid' && (sortDir === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('totalBids')}>
            Lances {sortCol === 'totalBids' && (sortDir === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead>Encerramento</TableHead>
          <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('endsAt')}>
            Tempo restante {sortCol === 'endsAt' && (sortDir === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map(a => {
          const urgent = getTimeLeft(a.endsAt).totalMs <= 3600000 && !getTimeLeft(a.endsAt).ended;
          return (
            <TableRow key={a.id} className={urgent ? 'bg-[hsl(var(--kolecta-red)/0.05)]' : ''}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <img src={a.productImage} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  <span className="font-heading font-medium text-sm truncate max-w-[180px]">{a.productName}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm">{a.sellerName}</TableCell>
              <TableCell className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">{a.currentBid ? formatBRL(a.currentBid) : '—'}</TableCell>
              <TableCell><Badge variant="secondary">{a.totalBids}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(a.endsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
              <TableCell><LiveCountdown endsAt={a.endsAt} /></TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" asChild><Link to={`/admin/anuncios/${a.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setInterveneDialog(a); setInterveneAction('close'); }}>
                    Intervir
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-3xl font-bold">Monitoramento — Modo Lance</h1>
              {/* TODO: implementar polling a cada 30s via useInterval ou WebSocket */}
              <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 animate-pulse gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ao vivo — {active.length} ativos
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast({ title: 'Dados atualizados' })}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>

        {/* 2. Summary */}
        {/* API: GET /api/admin/auctions/monitor/summary */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map(c => (
              <Card key={c.label} className="bg-gradient-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <c.icon className={`h-7 w-7 ${c.color}`} />
                  <div>
                    <p className={`font-heading text-2xl font-bold ${c.color}`}>{c.isString ? c.value : c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 3. Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="active">Leilões ativos <Badge variant="secondary" className="ml-1.5 text-[10px]">{active.length}</Badge></TabsTrigger>
            <TabsTrigger value="ending">Encerrando em breve <Badge className="ml-1.5 text-[10px] bg-[hsl(var(--kolecta-red)/0.2)] text-[hsl(var(--kolecta-red))]">{endingSoon.length}</Badge></TabsTrigger>
            <TabsTrigger value="pending">Aguardando pagamento <Badge className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-600">{pendingPayment.length}</Badge></TabsTrigger>
            <TabsTrigger value="alerts">Suspeitos <Badge className="ml-1.5 text-[10px] bg-[hsl(var(--kolecta-red)/0.2)] text-[hsl(var(--kolecta-red))]">{alerts.length}</Badge></TabsTrigger>
          </TabsList>

          {/* Active */}
          <TabsContent value="active">
            {loading ? <SkeletonTable /> : active.length === 0 ? <EmptyTab msg="Nenhum leilão ativo" /> : (
              <div className="mt-4 overflow-x-auto">
                {/* API: GET /api/admin/auctions?status=active&sort= */}
                {renderAuctionTable(active)}
              </div>
            )}
          </TabsContent>

          {/* Ending soon */}
          <TabsContent value="ending">
            {loading ? <SkeletonTable /> : endingSoon.length === 0 ? <EmptyTab msg="Nenhum leilão encerrando nas próximas 24h" /> : (
              <div className="mt-4 overflow-x-auto">{renderAuctionTable(endingSoon)}</div>
            )}
          </TabsContent>

          {/* Pending payment */}
          <TabsContent value="pending">
            {loading ? <SkeletonTable /> : pendingPayment.length === 0 ? <EmptyTab msg="Nenhum leilão aguardando pagamento" /> : (
              <div className="mt-4 overflow-x-auto">
                {/* API: POST /api/admin/auctions/:id/notify-winner
                    POST /api/admin/auctions/:id/cancel-and-reopen */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Vencedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Tempo restante</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayment.map(a => {
                      const urgent = a.paymentDeadline ? getTimeLeft(a.paymentDeadline).totalMs <= 21600000 : false;
                      return (
                        <TableRow key={a.id} className={urgent ? 'bg-[hsl(var(--kolecta-red)/0.05)]' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img src={a.productImage} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                              <span className="font-heading font-medium text-sm">{a.productName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{a.winnerName}</TableCell>
                          <TableCell className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">{formatBRL(a.currentBid!)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.paymentDeadline ? new Date(a.paymentDeadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                          <TableCell>{a.paymentDeadline ? <LiveCountdown endsAt={a.paymentDeadline} /> : '—'}</TableCell>
                          <TableCell className="text-sm">{a.sellerName}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => toast({ title: 'Notificação enviada' })}>
                                <Bell className="h-3.5 w-3.5 mr-1" /> Notificar
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => toast({ title: 'Leilão reaberto' })}>
                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reabrir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Alerts */}
          <TabsContent value="alerts">
            {loading ? <SkeletonTable /> : alerts.length === 0 ? <EmptyTab msg="Nenhum alerta detectado" /> : (
              <div className="space-y-3 mt-4">
                {/* API: GET /api/admin/auctions/alerts
                    POST /api/admin/auctions/alerts/:id/dismiss */}
                {alerts.map(al => (
                  <Card key={al.id} className="bg-gradient-card border-[hsl(var(--kolecta-red)/0.2)]">
                    <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
                      <ShieldAlert className="h-8 w-8 text-[hsl(var(--kolecta-red))] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-bold text-sm">{al.productName}</span>
                          <Badge className="bg-[hsl(var(--kolecta-red)/0.15)] text-[hsl(var(--kolecta-red))] border-[hsl(var(--kolecta-red)/0.3)] text-[10px]">
                            {alertTypeLabels[al.type]}
                          </Badge>
                          <Badge className={al.severity === 'high' ? 'bg-[hsl(var(--kolecta-red)/0.15)] text-[hsl(var(--kolecta-red))]' : 'bg-amber-500/20 text-amber-600'}>
                            {al.severity === 'high' ? 'Alta' : 'Média'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{al.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(al.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex gap-2 shrink-0 self-start">
                        <Button size="sm" variant="outline-gold" asChild>
                          <Link to={`/admin/anuncios/${al.auctionId}`}>Investigar</Link>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAlerts(prev => prev.filter(a => a.id !== al.id))}>
                          Ignorar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Intervention Dialog */}
      {/* API: POST /api/admin/auctions/:id/intervene
          Body: { action, reason, targetBidId?, extraHours? } */}
      {interveneDialog && (
        <Dialog open onOpenChange={() => setInterveneDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Intervenção no leilão</DialogTitle>
              <DialogDescription className="sr-only">Formulário de intervenção administrativa</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm p-3 bg-muted rounded-md">
                <p className="font-heading font-bold">{interveneDialog.productName}</p>
                <p className="text-muted-foreground">Lance atual: {interveneDialog.currentBid ? formatBRL(interveneDialog.currentBid) : '—'} • {interveneDialog.totalBids} lances</p>
              </div>

              <RadioGroup value={interveneAction} onValueChange={setInterveneAction} className="space-y-2">
                <div className="flex items-center gap-2"><RadioGroupItem value="close" id="ia-close" /><Label htmlFor="ia-close">Encerrar leilão antecipadamente</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="cancel" id="ia-cancel" /><Label htmlFor="ia-cancel">Cancelar leilão e estornar lances</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="remove_bid" id="ia-bid" /><Label htmlFor="ia-bid">Remover lance suspeito</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="extend" id="ia-extend" /><Label htmlFor="ia-extend">Estender prazo</Label></div>
              </RadioGroup>

              {interveneAction === 'remove_bid' && interveneDialog.bids.length > 0 && (
                <Select value={interveneBidId} onValueChange={setInterveneBidId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o lance" /></SelectTrigger>
                  <SelectContent>
                    {interveneDialog.bids.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.bidderName} — {formatBRL(b.amount)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {interveneAction === 'extend' && (
                <div className="space-y-1.5">
                  <Label>Horas adicionais</Label>
                  <Input type="number" min={1} value={interveneExtra} onChange={e => setInterveneExtra(e.target.value)} placeholder="Ex: 24" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Motivo da intervenção</Label>
                <Textarea value={interveneReason} onChange={e => setInterveneReason(e.target.value)} placeholder="Obrigatório..." rows={3} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setInterveneDialog(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleIntervene}>Confirmar intervenção</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
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
  return <div className="space-y-2 mt-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
}

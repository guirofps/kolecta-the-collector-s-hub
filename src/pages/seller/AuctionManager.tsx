import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Clock, AlertCircle, Timer, Eye, X, RotateCcw } from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatBRL } from '@/lib/mock-data';

// ── Types ────────────────────────────────────────────────

type AuctionStatus = 'active' | 'pending_payment' | 'closed';
type ClosedResult = 'sold' | 'no_reserve' | 'no_bids' | 'cancelled';

interface AuctionBid {
  id: string;
  bidderName: string;
  amount: number;
  createdAt: string;
}

interface MockAuction {
  id: string;
  productName: string;
  productImage: string;
  status: AuctionStatus;
  startedAt: string;
  endsAt: string;
  startingBid: number;
  minIncrement: number;
  reservePrice?: number;
  currentBid: number | null;
  highestBidder: string | null;
  totalBids: number;
  bids: AuctionBid[];
  closedResult?: ClosedResult;
  closedAt?: string;
  finalValue?: number;
  orderId?: string;
  paymentDeadline?: string;
  winnerId?: string;
  winnerName?: string;
}

// ── Mock data ────────────────────────────────────────────

function futureDate(hours: number) {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}
function pastDate(hours: number) {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

const mockAuctions: MockAuction[] = [
  {
    id: 'auc-1',
    productName: 'Capacete Arai RX-7V Racing',
    productImage: '/placeholder.svg',
    status: 'active',
    startedAt: pastDate(72),
    endsAt: futureDate(48),
    startingBid: 800,
    minIncrement: 50,
    reservePrice: 1200,
    currentBid: 1350,
    highestBidder: 'João S.',
    totalBids: 8,
    bids: [
      { id: 'b1', bidderName: 'João S.', amount: 1350, createdAt: pastDate(1) },
      { id: 'b2', bidderName: 'Maria L.', amount: 1300, createdAt: pastDate(3) },
      { id: 'b3', bidderName: 'Pedro R.', amount: 1200, createdAt: pastDate(6) },
      { id: 'b4', bidderName: 'Ana C.', amount: 1100, createdAt: pastDate(12) },
      { id: 'b5', bidderName: 'João S.', amount: 1000, createdAt: pastDate(18) },
      { id: 'b6', bidderName: 'Carlos M.', amount: 950, createdAt: pastDate(24) },
      { id: 'b7', bidderName: 'Maria L.', amount: 900, createdAt: pastDate(36) },
      { id: 'b8', bidderName: 'Pedro R.', amount: 850, createdAt: pastDate(48) },
    ],
  },
  {
    id: 'auc-2',
    productName: 'Jaqueta Alpinestars GP Plus R V3',
    productImage: '/placeholder.svg',
    status: 'active',
    startedAt: pastDate(96),
    endsAt: futureDate(18),
    startingBid: 600,
    minIncrement: 30,
    reservePrice: 900,
    currentBid: 780,
    highestBidder: 'Lucas F.',
    totalBids: 5,
    bids: [
      { id: 'b9', bidderName: 'Lucas F.', amount: 780, createdAt: pastDate(2) },
      { id: 'b10', bidderName: 'Ana C.', amount: 720, createdAt: pastDate(8) },
      { id: 'b11', bidderName: 'Lucas F.', amount: 690, createdAt: pastDate(14) },
      { id: 'b12', bidderName: 'Renata P.', amount: 660, createdAt: pastDate(20) },
      { id: 'b13', bidderName: 'Ana C.', amount: 630, createdAt: pastDate(30) },
    ],
  },
  {
    id: 'auc-3',
    productName: 'Slider Dianteiro Procton Racing',
    productImage: '/placeholder.svg',
    status: 'active',
    startedAt: pastDate(48),
    endsAt: futureDate(0.4),
    startingBid: 150,
    minIncrement: 10,
    currentBid: 230,
    highestBidder: 'Marcos T.',
    totalBids: 6,
    bids: [
      { id: 'b14', bidderName: 'Marcos T.', amount: 230, createdAt: pastDate(0.5) },
      { id: 'b15', bidderName: 'Diego R.', amount: 210, createdAt: pastDate(1) },
      { id: 'b16', bidderName: 'Marcos T.', amount: 190, createdAt: pastDate(3) },
      { id: 'b17', bidderName: 'Fernanda S.', amount: 180, createdAt: pastDate(6) },
      { id: 'b18', bidderName: 'Diego R.', amount: 170, createdAt: pastDate(12) },
      { id: 'b19', bidderName: 'Fernanda S.', amount: 160, createdAt: pastDate(18) },
    ],
  },
  {
    id: 'auc-4',
    productName: 'Luva Dainese Carbon 3 Long',
    productImage: '/placeholder.svg',
    status: 'pending_payment',
    startedAt: pastDate(168),
    endsAt: pastDate(2),
    startingBid: 300,
    minIncrement: 20,
    reservePrice: 400,
    currentBid: 520,
    highestBidder: 'Ricardo M.',
    totalBids: 7,
    bids: [
      { id: 'b20', bidderName: 'Ricardo M.', amount: 520, createdAt: pastDate(4) },
      { id: 'b21', bidderName: 'Camila D.', amount: 480, createdAt: pastDate(8) },
    ],
    winnerName: 'Ricardo M.',
    paymentDeadline: futureDate(10),
    finalValue: 520,
  },
  {
    id: 'auc-5',
    productName: 'Escapamento Akrapovic Full System',
    productImage: '/placeholder.svg',
    status: 'closed',
    startedAt: pastDate(240),
    endsAt: pastDate(72),
    startingBid: 2000,
    minIncrement: 100,
    reservePrice: 3000,
    currentBid: 3800,
    highestBidder: 'Felipe A.',
    totalBids: 12,
    bids: [],
    closedResult: 'sold',
    closedAt: pastDate(72),
    finalValue: 3800,
    orderId: 'KL-000189',
  },
  {
    id: 'auc-6',
    productName: 'Banco Esportivo Shad Confort',
    productImage: '/placeholder.svg',
    status: 'closed',
    startedAt: pastDate(200),
    endsAt: pastDate(48),
    startingBid: 500,
    minIncrement: 25,
    currentBid: null,
    highestBidder: null,
    totalBids: 0,
    bids: [],
    closedResult: 'no_bids',
    closedAt: pastDate(48),
  },
];

// ── Helpers ──────────────────────────────────────────────

function getTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true, totalMs: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    ended: false,
    totalMs: diff,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function getElapsedPercent(startedAt: string, endsAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Countdown Hook ───────────────────────────────────────

function useCountdown(endsAt: string) {
  const [time, setTime] = useState(() => getTimeLeft(endsAt));
  useEffect(() => {
    const iv = setInterval(() => setTime(getTimeLeft(endsAt)), 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return time;
}

// ── Inline Countdown Component ───────────────────────────

function Countdown({ endsAt }: { endsAt: string }) {
  const t = useCountdown(endsAt);
  if (t.ended) return <span className="font-heading text-sm font-bold uppercase text-muted-foreground">Encerrado</span>;

  const isUrgent = t.totalMs <= 3600000;
  const isWarning = !isUrgent && t.totalMs <= 86400000;
  const colorCls = isUrgent
    ? 'text-[hsl(var(--kolecta-red))] animate-pulse'
    : isWarning
      ? 'text-[hsl(var(--kolecta-red))]'
      : 'text-foreground';

  return (
    <span className={`font-heading text-sm font-bold tabular-nums ${colorCls}`}>
      <Timer className={`inline h-3.5 w-3.5 mr-1 ${isUrgent ? 'animate-pulse' : ''}`} />
      {t.days > 0 && `${t.days}d `}{pad(t.hours)}:{pad(t.minutes)}:{pad(t.seconds)}
    </span>
  );
}

// ── Payment Countdown ────────────────────────────────────

function PaymentCountdown({ deadline }: { deadline: string }) {
  const t = useCountdown(deadline);
  if (t.ended) return <Badge variant="destructive">Pagamento não realizado</Badge>;
  const isUrgent = t.totalMs <= 43200000;
  return (
    <span className={`font-heading text-sm font-bold tabular-nums ${isUrgent ? 'text-[hsl(var(--kolecta-red))]' : 'text-muted-foreground'}`}>
      Pagar em {t.days > 0 ? `${t.days}d ` : ''}{pad(t.hours)}h {pad(t.minutes)}m
    </span>
  );
}

// ── Main Component ───────────────────────────────────────

export default function AuctionManager() {
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState<MockAuction[]>([]);
  const [tab, setTab] = useState('active');
  const [bidsDialog, setBidsDialog] = useState<MockAuction | null>(null);
  const [closeDialog, setCloseDialog] = useState<MockAuction | null>(null);
  const [closedPeriod, setClosedPeriod] = useState('all');

  useEffect(() => {
    const t = setTimeout(() => { setAuctions(mockAuctions); setLoading(false); }, 600);
    return () => clearTimeout(t);
  }, []);

  const active = useMemo(() => auctions.filter(a => a.status === 'active'), [auctions]);
  const ending24h = useMemo(() => active.filter(a => getTimeLeft(a.endsAt).totalMs <= 86400000 && !getTimeLeft(a.endsAt).ended), [active]);
  const pendingPayment = useMemo(() => auctions.filter(a => a.status === 'pending_payment'), [auctions]);
  const closed = useMemo(() => {
    let c = auctions.filter(a => a.status === 'closed');
    if (closedPeriod === '7d') c = c.filter(a => a.closedAt && Date.now() - new Date(a.closedAt).getTime() <= 7 * 86400000);
    if (closedPeriod === '30d') c = c.filter(a => a.closedAt && Date.now() - new Date(a.closedAt).getTime() <= 30 * 86400000);
    return c;
  }, [auctions, closedPeriod]);

  const summaryCards = [
    { label: 'Leilões ativos', value: active.length, icon: Gavel, color: 'text-[hsl(var(--kolecta-gold))]' },
    { label: 'Encerrando hoje', value: ending24h.length, icon: Clock, color: 'text-[hsl(var(--kolecta-red))]', pulse: ending24h.length > 0 },
    { label: 'Aguardando pagamento', value: pendingPayment.length, icon: AlertCircle, color: 'text-amber-500' },
  ];

  function handleClose(auc: MockAuction) {
    setAuctions(prev => prev.map(a => a.id === auc.id ? {
      ...a,
      status: 'closed' as AuctionStatus,
      closedAt: new Date().toISOString(),
      closedResult: a.totalBids > 0 ? 'sold' as ClosedResult : 'no_bids' as ClosedResult,
      finalValue: a.currentBid ?? undefined,
    } : a));
    setCloseDialog(null);
  }

  function handleReopen(auc: MockAuction) {
    setAuctions(prev => prev.map(a => a.id === auc.id ? {
      ...a,
      status: 'active' as AuctionStatus,
      endsAt: futureDate(48),
      currentBid: null,
      highestBidder: null,
      totalBids: 0,
      bids: [],
    } : a));
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold">Modo Lance</h1>
            <p className="text-muted-foreground">Gerencie seus leilões ativos e encerrados</p>
          </div>
          <Button variant="kolecta" asChild>
            <Link to="/painel-vendedor/anuncios/novo?mode=lance">Criar leilão</Link>
          </Button>
        </div>

        {/* 2. Summary cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {summaryCards.map(c => (
              <Card key={c.label} className="bg-gradient-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <c.icon className={`h-8 w-8 ${c.color} ${c.pulse ? 'animate-pulse' : ''}`} />
                  <div>
                    <p className={`font-heading text-3xl font-bold ${c.color}`}>{c.value}</p>
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 3. Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start flex-wrap">
            <TabsTrigger value="active" className="gap-1.5">
              Ativos <Badge variant="secondary" className="ml-1 text-[10px]">{active.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ending" className="gap-1.5">
              Encerrando em 24h <Badge className="ml-1 text-[10px] bg-[hsl(var(--kolecta-red))] text-white">{ending24h.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              Aguardando pagamento <Badge className="ml-1 text-[10px] bg-amber-500 text-white">{pendingPayment.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="closed">Encerrados</TabsTrigger>
          </TabsList>

          {/* TAB: Active */}
          <TabsContent value="active">
            {loading ? <SkeletonCards /> : active.length === 0 ? (
              <EmptyTab icon={Gavel} message="Nenhum leilão ativo" cta />
            ) : (
              <div className="space-y-4 mt-4">
                {/* API: GET /api/seller/auctions?status=active */}
                {active.map(a => <AuctionCard key={a.id} auction={a} onViewBids={setBidsDialog} onClose={setCloseDialog} />)}
              </div>
            )}
          </TabsContent>

          {/* TAB: Ending 24h */}
          <TabsContent value="ending">
            {loading ? <SkeletonCards /> : ending24h.length === 0 ? (
              <EmptyTab icon={Clock} message="Nenhum leilão encerrando nas próximas 24h" />
            ) : (
              <div className="space-y-4 mt-4">
                {ending24h.map(a => <AuctionCard key={a.id} auction={a} onViewBids={setBidsDialog} onClose={setCloseDialog} />)}
              </div>
            )}
          </TabsContent>

          {/* TAB: Pending payment */}
          <TabsContent value="pending">
            {loading ? <SkeletonCards /> : pendingPayment.length === 0 ? (
              <EmptyTab icon={AlertCircle} message="Nenhum leilão aguardando pagamento" />
            ) : (
              <div className="space-y-4 mt-4">
                {/* API: GET /api/seller/auctions?status=pending_payment */}
                {pendingPayment.map(a => (
                  <PendingPaymentCard key={a.id} auction={a} onReopen={handleReopen} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: Closed */}
          <TabsContent value="closed">
            <div className="flex justify-end mt-4 mb-3">
              <Select value={closedPeriod} onValueChange={setClosedPeriod}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? <SkeletonCards /> : closed.length === 0 ? (
              <EmptyTab icon={Gavel} message="Nenhum leilão encerrado neste período" />
            ) : (
              <div className="space-y-4">
                {/* API: GET /api/seller/auctions?status=closed&period= */}
                {closed.map(a => <ClosedAuctionCard key={a.id} auction={a} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Bids Dialog */}
        {bidsDialog && (
          <Dialog open onOpenChange={() => setBidsDialog(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading">Lances — {bidsDialog.productName}</DialogTitle>
                <DialogDescription className="sr-only">Histórico de lances do leilão</DialogDescription>
              </DialogHeader>
              {/* API: GET /api/auctions/:id/bids */}
              <div className="flex items-center gap-4 mb-4">
                <span className="font-heading text-xl font-bold text-[hsl(var(--kolecta-gold))]">
                  {bidsDialog.currentBid ? formatBRL(bidsDialog.currentBid) : '—'}
                </span>
                <Badge variant="secondary">{bidsDialog.totalBids} lances</Badge>
                <Countdown endsAt={bidsDialog.endsAt} />
              </div>
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Licitante</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...bidsDialog.bids].sort((a, b) => b.amount - a.amount).map((bid, i) => (
                      <TableRow key={bid.id}>
                        <TableCell className="font-heading font-bold">{i + 1}</TableCell>
                        <TableCell>
                          {bid.bidderName}
                          {i === 0 && <Badge className="ml-2 text-[10px] bg-[hsl(var(--kolecta-gold))] text-[hsl(var(--kolecta-carbon))]">Maior lance</Badge>}
                        </TableCell>
                        <TableCell className={`text-right font-heading font-bold ${i === 0 ? 'text-[hsl(var(--kolecta-gold))]' : ''}`}>
                          {formatBRL(bid.amount)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{formatDateTime(bid.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Close Dialog */}
        {closeDialog && (
          <Dialog open onOpenChange={() => setCloseDialog(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading">Encerrar leilão</DialogTitle>
                <DialogDescription className="sr-only">Confirmação de encerramento</DialogDescription>
              </DialogHeader>
              {/* PATCH /api/seller/auctions/:id/close */}
              {closeDialog.totalBids > 0 ? (
                <p className="text-[hsl(var(--kolecta-red))] text-sm">
                  Ao encerrar agora o maior lance vence imediatamente. O lance atual é de{' '}
                  <strong>{formatBRL(closeDialog.currentBid!)}</strong> por <strong>{closeDialog.highestBidder}</strong>.
                </p>
              ) : (
                <p className="text-[hsl(var(--kolecta-red))] text-sm">
                  Nenhum lance registrado, o leilão será cancelado.
                </p>
              )}
              <DialogFooter className="gap-2 mt-4">
                <Button variant="ghost" onClick={() => setCloseDialog(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={() => handleClose(closeDialog)}>Encerrar leilão</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SellerLayout>
  );
}

// ── AuctionCard ──────────────────────────────────────────

function AuctionCard({
  auction: a,
  onViewBids,
  onClose,
}: {
  auction: MockAuction;
  onViewBids: (a: MockAuction) => void;
  onClose: (a: MockAuction) => void;
}) {
  const elapsed = getElapsedPercent(a.startedAt, a.endsAt);
  const reserveMet = a.reservePrice && a.currentBid ? a.currentBid >= a.reservePrice : null;

  return (
    <Card className="bg-gradient-card">
      <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
        <img src={a.productImage} alt={a.productName} className="w-20 h-20 rounded object-cover shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-lg font-bold truncate">{a.productName}</h3>
            <Countdown endsAt={a.endsAt} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {a.currentBid ? (
              <>
                <span className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">{formatBRL(a.currentBid)}</span>
                <span className="text-muted-foreground">por {a.highestBidder}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Sem lances ainda</span>
            )}
            <Badge variant="secondary">{a.totalBids} lances</Badge>
            {reserveMet !== null && (
              reserveMet
                ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Reserva atingida</Badge>
                : <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Reserva não atingida</Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Mín. inicial: {formatBRL(a.startingBid)}</span>
            <span>Incremento: {formatBRL(a.minIncrement)}</span>
          </div>

          <Progress value={elapsed} className="h-1.5 [&>div]:bg-[hsl(var(--kolecta-gold))]" />

          <Separator className="line-tech" />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline-gold" onClick={() => onViewBids(a)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Ver lances
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onClose(a)}>
              <X className="h-3.5 w-3.5 mr-1" /> Encerrar agora
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/painel-vendedor/anuncios/${a.id}/editar`}>Editar</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── PendingPaymentCard ───────────────────────────────────

function PendingPaymentCard({ auction: a, onReopen }: { auction: MockAuction; onReopen: (a: MockAuction) => void }) {
  const expired = a.paymentDeadline ? new Date(a.paymentDeadline).getTime() <= Date.now() : false;
  /* API: GET /api/seller/auctions?status=pending_payment
     POST /api/seller/auctions/:id/reopen */

  return (
    <Card className="bg-gradient-card">
      <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
        <img src={a.productImage} alt={a.productName} className="w-20 h-20 rounded object-cover shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="font-heading text-lg font-bold truncate">{a.productName}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Vencedor: {a.winnerName}</span>
            <span className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">{formatBRL(a.finalValue!)}</span>
          </div>
          <div>
            {expired ? (
              <div className="flex items-center gap-3">
                <Badge variant="destructive">Pagamento não realizado</Badge>
                <Button size="sm" variant="ghost" onClick={() => onReopen(a)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reabrir leilão
                </Button>
              </div>
            ) : (
              a.paymentDeadline && <PaymentCountdown deadline={a.paymentDeadline} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── ClosedAuctionCard ────────────────────────────────────

function ClosedAuctionCard({ auction: a }: { auction: MockAuction }) {
  const resultBadge: Record<string, { label: string; cls: string }> = {
    sold: { label: 'Vendido', cls: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
    no_reserve: { label: 'Reserva não atingida', cls: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
    no_bids: { label: 'Sem lances', cls: 'bg-muted text-muted-foreground' },
    cancelled: { label: 'Cancelado', cls: 'bg-destructive/20 text-destructive' },
  };
  const r = resultBadge[a.closedResult ?? 'no_bids'];

  return (
    <Card className="bg-gradient-card">
      <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
        <img src={a.productImage} alt={a.productName} className="w-20 h-20 rounded object-cover shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="font-heading text-lg font-bold truncate">{a.productName}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Badge className={r.cls}>{r.label}</Badge>
            {a.closedAt && <span className="text-xs text-muted-foreground">Encerrado em {formatDateTime(a.closedAt)}</span>}
          </div>
          {a.closedResult === 'sold' && a.finalValue && (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">{formatBRL(a.finalValue)}</span>
              {a.orderId && (
                <Link to={`/painel-vendedor/pedidos/${a.orderId}`} className="text-[hsl(var(--kolecta-gold))] hover:underline text-xs">
                  Pedido #{a.orderId}
                </Link>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty state ──────────────────────────────────────────

function EmptyTab({ icon: Icon, message, cta }: { icon: React.ElementType; message: string; cta?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {cta && (
        <Button variant="kolecta" asChild>
          <Link to="/painel-vendedor/anuncios/novo?mode=lance">Criar leilão</Link>
        </Button>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="space-y-4 mt-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-lg" />)}
    </div>
  );
}

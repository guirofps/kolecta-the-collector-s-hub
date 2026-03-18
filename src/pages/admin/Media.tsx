import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/mock-data';
import {
  DollarSign, Star, Megaphone, Eye, TrendingUp, TrendingDown,
  Upload, ExternalLink, X, Medal, Image as ImageIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

// ── Mock Data ──────────────────────────────────────────────

const mockMediaSummary = {
  revenue: 18450, revenueDelta: 22.3,
  activeHighlights: 14,
  activeCampaigns: 2,
  totalImpressions: 287400,
};

interface Highlight {
  id: string; product: string; productId: string; seller: string;
  plan: 'Bronze' | 'Prata' | 'Ouro'; start: string; end: string;
  impressions: number; clicks: number; value: number;
  status: 'active' | 'expired' | 'cancelled';
}

const mockHighlightsAdmin: Highlight[] = [
  { id: 'h1', product: 'Hot Wheels T-Hunt 2024', productId: 'KL-A-0042', seller: 'JDM Store', plan: 'Ouro', start: '2025-03-01', end: '2025-03-31', impressions: 42300, clicks: 2115, value: 297, status: 'active' },
  { id: 'h2', product: 'Funko Pop Goku SSJ4', productId: 'KL-A-0038', seller: 'Funko Brasil', plan: 'Prata', start: '2025-03-05', end: '2025-03-20', impressions: 18700, clicks: 748, value: 75, status: 'active' },
  { id: 'h3', product: 'Carta Charizard 1st Ed', productId: 'KL-A-0035', seller: 'Card Master', plan: 'Ouro', start: '2025-03-10', end: '2025-04-10', impressions: 31200, clicks: 1872, value: 297, status: 'active' },
  { id: 'h4', product: 'Miniatura Ferrari 250 GTO', productId: 'KL-A-0030', seller: 'Vintage Toys', plan: 'Bronze', start: '2025-02-01', end: '2025-02-28', impressions: 8400, clicks: 252, value: 75, status: 'expired' },
  { id: 'h5', product: 'Action Figure Naruto', productId: 'KL-A-0025', seller: 'Retro Games', plan: 'Prata', start: '2025-02-15', end: '2025-03-15', impressions: 15600, clicks: 468, value: 150, status: 'expired' },
  { id: 'h6', product: 'Capacete Arai GP', productId: 'KL-A-0020', seller: 'JDM Store', plan: 'Ouro', start: '2025-01-10', end: '2025-01-20', impressions: 5200, clicks: 156, value: 99, status: 'cancelled' },
];

interface BannerPosition {
  id: string; name: string; dimensions: string; width: number; height: number;
  currentBanner: { seller: string; url: string; expiresAt: string } | null;
}

const mockBanners: BannerPosition[] = [
  { id: 'bp1', name: 'Banner homepage topo', dimensions: '1200×300px', width: 1200, height: 300, currentBanner: { seller: 'JDM Store', url: '#', expiresAt: '2025-04-15' } },
  { id: 'bp2', name: 'Banner homepage meio', dimensions: '1200×300px', width: 1200, height: 300, currentBanner: { seller: 'Card Master', url: '#', expiresAt: '2025-03-30' } },
  { id: 'bp3', name: 'Banner sidebar categorias', dimensions: '300×600px', width: 300, height: 600, currentBanner: null },
  { id: 'bp4', name: 'Banner página de produto', dimensions: '728×90px', width: 728, height: 90, currentBanner: null },
];

interface Campaign {
  id: string; name: string; description: string; period: string;
  type: 'discount' | 'free_shipping' | 'free_highlight' | 'special_event';
  sellersCount: number; status: 'active' | 'scheduled' | 'ended';
  orders: number; revenue: number;
}

const mockCampaigns: Campaign[] = [
  { id: 'cp1', name: 'Mês do Colecionador', description: 'Comissão reduzida para todas as categorias durante março', period: '01/03 → 31/03/2025', type: 'discount', sellersCount: 45, status: 'active', orders: 234, revenue: 48700 },
  { id: 'cp2', name: 'Frete Grátis Páscoa', description: 'Frete grátis em compras acima de R$100 em Funko Pop', period: '10/04 → 25/04/2025', type: 'free_shipping', sellersCount: 12, status: 'scheduled', orders: 0, revenue: 0 },
  { id: 'cp3', name: 'Black Friday Kolecta', description: 'Destaque gratuito Prata para os top 20 vendedores', period: '20/11 → 30/11/2024', type: 'free_highlight', sellersCount: 20, status: 'ended', orders: 890, revenue: 187500 },
];

const mockMediaReport = [
  { month: 'Set', bronze: 1200, prata: 2800, ouro: 5400 },
  { month: 'Out', bronze: 1500, prata: 3200, ouro: 6100 },
  { month: 'Nov', bronze: 2100, prata: 4500, ouro: 9800 },
  { month: 'Dez', bronze: 1800, prata: 3800, ouro: 7200 },
  { month: 'Jan', bronze: 1400, prata: 3100, ouro: 6500 },
  { month: 'Fev', bronze: 1900, prata: 4200, ouro: 8900 },
];

const mockImpressionsClicks = [
  { week: 'S1', impressions: 42000, clicks: 2100 },
  { week: 'S2', impressions: 38000, clicks: 1900 },
  { week: 'S3', impressions: 51000, clicks: 2550 },
  { week: 'S4', impressions: 47000, clicks: 2350 },
  { week: 'S5', impressions: 55000, clicks: 2750 },
  { week: 'S6', impressions: 54400, clicks: 2720 },
];

const mockTopSellers = [
  { rank: 1, seller: 'JDM Store', invested: 4850, activeHighlights: 3, impressions: 78500, clicks: 3925, ctr: 5.0 },
  { rank: 2, seller: 'Card Master', invested: 3200, activeHighlights: 2, impressions: 52000, clicks: 2340, ctr: 4.5 },
  { rank: 3, seller: 'Funko Brasil', invested: 2100, activeHighlights: 1, impressions: 31000, clicks: 1240, ctr: 4.0 },
  { rank: 4, seller: 'Vintage Toys', invested: 1500, activeHighlights: 1, impressions: 18000, clicks: 630, ctr: 3.5 },
  { rank: 5, seller: 'Retro Games', invested: 900, activeHighlights: 0, impressions: 12000, clicks: 360, ctr: 3.0 },
];

// ── Helpers ────────────────────────────────────────────────

const highlightStatusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: 'Ativo', cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
  expired: { label: 'Expirado', cls: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelado', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const planColors: Record<string, string> = { Bronze: 'bg-amber-700/10 text-amber-700 border-amber-700/20', Prata: 'bg-blue-500/10 text-blue-500 border-blue-500/20', Ouro: 'bg-[hsl(var(--kolecta-gold))]/10 text-kolecta-gold border-[hsl(var(--kolecta-gold))]/20' };

const campaignTypeConfig: Record<string, { label: string; cls: string }> = {
  discount: { label: 'Desconto em comissão', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  free_shipping: { label: 'Frete grátis patrocinado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  free_highlight: { label: 'Destaque gratuito', cls: 'bg-[hsl(var(--kolecta-gold))]/10 text-kolecta-gold border-[hsl(var(--kolecta-gold))]/20' },
  special_event: { label: 'Evento especial', cls: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

const campaignStatusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: 'Ativa', cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
  scheduled: { label: 'Agendada', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  ended: { label: 'Encerrada', cls: 'bg-muted text-muted-foreground border-border' },
};

const medalColors = ['text-kolecta-gold', 'text-muted-foreground', 'text-amber-700'];

const tooltipStyle = {
  contentStyle: { background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(48, 100%, 50%, 0.3)', borderRadius: 8, fontSize: 12 },
};

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
            {isPositive ? '+' : ''}{delta}% vs mês anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────

export default function AdminMedia() {
  const { toast } = useToast();

  // Highlights filters
  const [hlSearch, setHlSearch] = useState('');
  const [hlStatus, setHlStatus] = useState('all');
  const [hlPlan, setHlPlan] = useState('all');

  // Banner dialog
  const [bannerDialog, setBannerDialog] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<BannerPosition | null>(null);
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerActive, setBannerActive] = useState(true);

  // Campaign dialog
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '', type: 'discount', startDate: '', endDate: '', notify: true, discountPct: '', maxShipping: '', plan: 'Prata', maxParticipants: '', rules: '' });

  const filteredHighlights = useMemo(() => {
    return mockHighlightsAdmin.filter(h => {
      const matchSearch = !hlSearch || h.product.toLowerCase().includes(hlSearch.toLowerCase()) || h.seller.toLowerCase().includes(hlSearch.toLowerCase());
      const matchStatus = hlStatus === 'all' || h.status === hlStatus;
      const matchPlan = hlPlan === 'all' || h.plan === hlPlan;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [hlSearch, hlStatus, hlPlan]);

  const hlTotals = useMemo(() => filteredHighlights.reduce((acc, h) => ({
    impressions: acc.impressions + h.impressions,
    clicks: acc.clicks + h.clicks,
    revenue: acc.revenue + h.value,
  }), { impressions: 0, clicks: 0, revenue: 0 }), [filteredHighlights]);

  const openBannerDialog = (pos: BannerPosition) => {
    setSelectedPosition(pos);
    setBannerUrl('');
    setBannerActive(true);
    setBannerDialog(true);
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.startDate || !newCampaign.endDate) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    toast({ title: 'Campanha criada com sucesso' });
    setCampaignDialog(false);
    setNewCampaign({ name: '', description: '', type: 'discount', startDate: '', endDate: '', notify: true, discountPct: '', maxShipping: '', plan: 'Prata', maxParticipants: '', rules: '' });
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Mídia & Campanhas</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie destaques, banners e campanhas promocionais</p>
          </div>
          <Button className="glow-primary" onClick={() => setCampaignDialog(true)}>
            <Megaphone className="h-4 w-4 mr-2" /> Nova campanha
          </Button>
        </div>

        {/* Summary Cards */}
        {/* API: GET /api/admin/media/summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="Receita de mídia (mês)" value={formatBRL(mockMediaSummary.revenue)} delta={mockMediaSummary.revenueDelta} icon={DollarSign} valueClass="text-kolecta-gold" />
          <SummaryCard title="Destaques ativos" value={String(mockMediaSummary.activeHighlights)} icon={Star} />
          <SummaryCard title="Campanhas ativas" value={String(mockMediaSummary.activeCampaigns)} icon={Megaphone} />
          <SummaryCard title="Impressões totais (mês)" value={mockMediaSummary.totalImpressions.toLocaleString('pt-BR')} icon={Eye} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="highlights">
          <TabsList className="mb-4">
            <TabsTrigger value="highlights">Destaques</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="report">Relatório</TabsTrigger>
          </TabsList>

          {/* ── TAB DESTAQUES ──────────────────────────── */}
          <TabsContent value="highlights">
            <Card className="bg-gradient-card border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input placeholder="Buscar produto ou vendedor..." value={hlSearch} onChange={e => setHlSearch(e.target.value)} className="sm:max-w-xs" />
                  <Select value={hlStatus} onValueChange={setHlStatus}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="expired">Expirados</SelectItem>
                      <SelectItem value="cancelled">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={hlPlan} onValueChange={setHlPlan}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Bronze">Bronze</SelectItem>
                      <SelectItem value="Prata">Prata</SelectItem>
                      <SelectItem value="Ouro">Ouro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              {/* API: GET /api/admin/media/highlights?status=&plan=&period=&search=&page=
                  DELETE /api/admin/media/highlights/:id */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase">Produto</TableHead>
                        <TableHead className="text-[11px] uppercase">Vendedor</TableHead>
                        <TableHead className="text-[11px] uppercase">Plano</TableHead>
                        <TableHead className="text-[11px] uppercase">Início</TableHead>
                        <TableHead className="text-[11px] uppercase">Término</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Impressões</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Cliques</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">CTR (%)</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Valor pago</TableHead>
                        <TableHead className="text-[11px] uppercase">Status</TableHead>
                        <TableHead className="text-[11px] uppercase">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHighlights.map(h => {
                        const sc = highlightStatusConfig[h.status];
                        const ctr = h.impressions > 0 ? ((h.clicks / h.impressions) * 100).toFixed(2) : '0.00';
                        return (
                          <TableRow key={h.id}>
                            <TableCell className="text-xs font-medium max-w-[180px] truncate">{h.product}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{h.seller}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] ${planColors[h.plan]}`}>{h.plan}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{h.start}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{h.end}</TableCell>
                            <TableCell className="text-xs text-right">{h.impressions.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-xs text-right">{h.clicks.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-xs text-right font-medium">{ctr}%</TableCell>
                            <TableCell className="text-xs text-right font-medium">{formatBRL(h.value)}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] ${sc.cls}`}>{sc.label}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {h.status === 'active' && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                                  <a href={`/admin/anuncios/${h.productId}`}><ExternalLink className="h-3 w-3" /></a>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={5} className="text-xs font-heading uppercase">Total</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold">{hlTotals.impressions.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold">{hlTotals.clicks.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold">
                          {hlTotals.impressions > 0 ? ((hlTotals.clicks / hlTotals.impressions) * 100).toFixed(2) : '0.00'}%
                        </TableCell>
                        <TableCell className="text-xs text-right font-heading font-bold text-kolecta-gold">{formatBRL(hlTotals.revenue)}</TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB BANNERS ────────────────────────────── */}
          <TabsContent value="banners">
            {/* API: GET /api/admin/media/banners
                POST /api/admin/media/banners/:position
                DELETE /api/admin/media/banners/:position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockBanners.map(pos => (
                <Card key={pos.id} className="bg-gradient-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-heading text-sm uppercase">{pos.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{pos.dimensions}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Preview area */}
                    <div
                      className="rounded-md border border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden"
                      style={{ aspectRatio: `${pos.width}/${pos.height}`, maxHeight: 200 }}
                    >
                      {pos.currentBanner ? (
                        <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                          <div className="text-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Banner ativo</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Posição vazia</p>
                        </div>
                      )}
                    </div>

                    {pos.currentBanner ? (
                      <div className="space-y-1">
                        <p className="text-xs"><span className="text-muted-foreground">Vendedor:</span> {pos.currentBanner.seller}</p>
                        <p className="text-xs"><span className="text-muted-foreground">Expira em:</span> {pos.currentBanner.expiresAt}</p>
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <Button size="sm" className="text-xs flex-1" onClick={() => openBannerDialog(pos)}>
                        {pos.currentBanner ? 'Trocar banner' : 'Adicionar banner'}
                      </Button>
                      {pos.currentBanner && (
                        <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">Remover</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── TAB CAMPANHAS ──────────────────────────── */}
          <TabsContent value="campaigns">
            {/* API: POST /api/admin/media/campaigns
                PUT /api/admin/media/campaigns/:id
                POST /api/admin/media/campaigns/:id/end */}
            <div className="space-y-4">
              {mockCampaigns.map(cp => {
                const tc = campaignTypeConfig[cp.type];
                const sc = campaignStatusConfig[cp.status];
                return (
                  <Card key={cp.id} className="bg-gradient-card border-border">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-heading text-lg font-bold">{cp.name}</h3>
                            <Badge variant="outline" className={`text-[10px] ${tc.cls}`}>{tc.label}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${sc.cls}`}>{sc.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{cp.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span>Período: {cp.period}</span>
                            <span>{cp.sellersCount} vendedores</span>
                            {cp.orders > 0 && <span className="font-medium text-foreground">{cp.orders} pedidos</span>}
                            {cp.revenue > 0 && <span className="font-heading font-bold text-kolecta-gold">{formatBRL(cp.revenue)}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="ghost" size="sm" className="text-xs">Editar</Button>
                          {cp.status === 'active' && (
                            <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">Encerrar</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── TAB RELATÓRIO ──────────────────────────── */}
          <TabsContent value="report">
            {/* API: GET /api/admin/media/report?period= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Revenue by month */}
              <Card className="bg-gradient-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Receita de Mídia por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={mockMediaReport}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 10%, 88%)" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(225, 8%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(225, 8%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                      <Legend />
                      <Bar dataKey="bronze" stackId="a" fill="hsl(225, 8%, 55%)" name="Bronze" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="prata" stackId="a" fill="hsl(200, 70%, 50%)" name="Prata" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="ouro" stackId="a" fill="hsl(48, 100%, 50%)" name="Ouro" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Impressions vs Clicks */}
              <Card className="bg-gradient-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Impressões vs Cliques por Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={mockImpressionsClicks}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 10%, 88%)" />
                      <XAxis dataKey="week" tick={{ fill: 'hsl(225, 8%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(225, 8%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => v.toLocaleString('pt-BR')} />
                      <Legend />
                      <Line type="monotone" dataKey="impressions" stroke="hsl(48, 100%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="Impressões" />
                      <Line type="monotone" dataKey="clicks" stroke="hsl(200, 70%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="Cliques" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top sellers */}
            <Card className="bg-gradient-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Top Vendedores por Investimento em Mídia</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase w-16">#</TableHead>
                        <TableHead className="text-[11px] uppercase">Vendedor</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Total investido</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Destaques ativos</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Impressões</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">Cliques</TableHead>
                        <TableHead className="text-[11px] uppercase text-right">CTR médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockTopSellers.map(s => (
                        <TableRow key={s.rank}>
                          <TableCell className="text-xs">
                            {s.rank <= 3 ? (
                              <div className="flex items-center gap-1">
                                <Medal className={`h-4 w-4 ${medalColors[s.rank - 1]}`} />
                                <span className="font-heading font-bold">{s.rank}</span>
                              </div>
                            ) : (
                              <span className="font-heading text-muted-foreground pl-1">{s.rank}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{s.seller}</TableCell>
                          <TableCell className="text-xs text-right font-heading font-bold text-kolecta-gold">{formatBRL(s.invested)}</TableCell>
                          <TableCell className="text-xs text-right">{s.activeHighlights}</TableCell>
                          <TableCell className="text-xs text-right">{s.impressions.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-xs text-right">{s.clicks.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{s.ctr.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Dialog: Upload Banner ───────────────────── */}
        <Dialog open={bannerDialog} onOpenChange={setBannerDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Upload de Banner</DialogTitle>
              <DialogDescription>
                {selectedPosition?.name}
              </DialogDescription>
            </DialogHeader>
            {/* API: POST /api/uploads para a imagem
                depois POST /api/admin/media/banners/:position
                Body: { imageUrl, destinationUrl, sellerId?, expiresAt, active } */}
            <div className="space-y-4">
              <Badge variant="outline" className="text-xs">Dimensões: {selectedPosition?.dimensions}</Badge>

              <div className="rounded-md border border-dashed border-border flex items-center justify-center p-8 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Clique para selecionar ou arraste a imagem</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Mínimo: {selectedPosition?.dimensions}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Link de destino (URL)</Label>
                <Input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} className="h-9" placeholder="https://..." />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Vendedor associado (opcional)</Label>
                <Select>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jdm">JDM Store</SelectItem>
                    <SelectItem value="card">Card Master</SelectItem>
                    <SelectItem value="funko">Funko Brasil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Data de expiração</Label>
                <Input type="date" className="h-9" />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={bannerActive} onCheckedChange={setBannerActive} id="banner-active" />
                <Label htmlFor="banner-active" className="text-xs">Ativo imediatamente</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setBannerDialog(false)}>Cancelar</Button>
              <Button className="glow-primary" onClick={() => { toast({ title: 'Banner publicado com sucesso' }); setBannerDialog(false); }}>Publicar banner</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Nova Campanha ───────────────────── */}
        <Dialog open={campaignDialog} onOpenChange={setCampaignDialog}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">Nova Campanha</DialogTitle>
              <DialogDescription>Crie uma nova campanha promocional para a plataforma.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da campanha</Label>
                <Input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição interna</Label>
                <Textarea value={newCampaign.description} onChange={e => setNewCampaign(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de campanha</Label>
                <Select value={newCampaign.type} onValueChange={v => setNewCampaign(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Desconto em comissão</SelectItem>
                    <SelectItem value="free_shipping">Frete grátis patrocinado</SelectItem>
                    <SelectItem value="free_highlight">Destaque gratuito</SelectItem>
                    <SelectItem value="special_event">Evento especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data início</Label>
                  <Input type="date" value={newCampaign.startDate} onChange={e => setNewCampaign(p => ({ ...p, startDate: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data fim</Label>
                  <Input type="date" value={newCampaign.endDate} onChange={e => setNewCampaign(p => ({ ...p, endDate: e.target.value }))} className="h-9" />
                </div>
              </div>

              <Separator />

              {/* Conditional fields by type */}
              {newCampaign.type === 'discount' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Percentual de desconto na comissão (%)</Label>
                    <Input type="number" value={newCampaign.discountPct} onChange={e => setNewCampaign(p => ({ ...p, discountPct: e.target.value }))} className="h-9 w-32" min={0} max={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aplicação</Label>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os vendedores</SelectItem>
                        <SelectItem value="specific">Vendedores específicos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {newCampaign.type === 'free_shipping' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor máximo subsidiado (R$)</Label>
                    <Input type="number" value={newCampaign.maxShipping} onChange={e => setNewCampaign(p => ({ ...p, maxShipping: e.target.value }))} className="h-9 w-32" min={0} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Categorias incluídas</Label>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="funko">Funko Pop</SelectItem>
                        <SelectItem value="cards">Cards Colecionáveis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {newCampaign.type === 'free_highlight' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plano equivalente</Label>
                    <Select value={newCampaign.plan} onValueChange={v => setNewCampaign(p => ({ ...p, plan: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bronze">Bronze</SelectItem>
                        <SelectItem value="Prata">Prata</SelectItem>
                        <SelectItem value="Ouro">Ouro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Máximo de participantes</Label>
                    <Input type="number" value={newCampaign.maxParticipants} onChange={e => setNewCampaign(p => ({ ...p, maxParticipants: e.target.value }))} className="h-9 w-32" min={1} />
                  </div>
                </div>
              )}

              {newCampaign.type === 'special_event' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Regras do evento</Label>
                    <Textarea value={newCampaign.rules} onChange={e => setNewCampaign(p => ({ ...p, rules: e.target.value }))} rows={3} placeholder="Descreva as regras e condições..." />
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-2">
                <Switch checked={newCampaign.notify} onCheckedChange={v => setNewCampaign(p => ({ ...p, notify: v }))} id="notify-sellers" />
                <Label htmlFor="notify-sellers" className="text-xs">Notificar vendedores elegíveis por email</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCampaignDialog(false)}>Cancelar</Button>
              <Button className="glow-primary" onClick={handleCreateCampaign}>Criar campanha</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

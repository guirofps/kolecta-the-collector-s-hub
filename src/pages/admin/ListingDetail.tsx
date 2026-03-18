import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ArrowLeft, ShieldCheck, Eye, Heart, MousePointerClick, Star, Package, Clock,
  CheckCircle2, XCircle, Pause, Play, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
type ListingStatus = 'in_review' | 'active' | 'paused' | 'rejected' | 'sold';

interface ModerationEvent {
  id: string;
  date: string;
  admin: string;
  action: string;
  reason: string;
}

interface SellerInfo {
  name: string;
  slug: string;
  initials: string;
  verified: boolean;
  totalListings: number;
  totalSales: number;
  rating: number;
}

interface AdminListing {
  id: string;
  title: string;
  status: ListingStatus;
  category: string;
  subcategory: string;
  condition: string;
  description: string;
  brand: string;
  year: string;
  origin: string;
  serialNumber: string;
  weight: string;
  dimensions: string;
  carriers: string[];
  pickupAvailable: boolean;
  images: string[];
  seller: SellerInfo;
  type: 'direct' | 'auction';
  price?: number;
  startingBid?: number;
  currentBid?: number;
  auctionEnds?: string;
  acceptOffers: boolean;
  views: number;
  favorites: number;
  buyClicks: number;
  createdAt: string;
  updatedAt: string;
  moderationHistory: ModerationEvent[];
}

/* ─── Mock ─── */
const mockListing: AdminListing = {
  id: 'KL-A-0042',
  title: 'Capacete Arai RX-7V Racing Carbon',
  status: 'in_review',
  category: 'Capacetes',
  subcategory: 'Integrais',
  condition: 'Novo',
  description: 'Capacete Arai RX-7V edição Racing Carbon. Modelo top de linha com certificação SNELL e ECE 22.06. Casco em fibra de carbono, ventilação VAS, interior removível e lavável. Inclui viseira escura extra e bag de transporte original. Tamanho M (57-58cm).',
  brand: 'Arai',
  year: '2024',
  origin: 'Japão',
  serialNumber: 'ARAI-RX7V-2024-00891',
  weight: '1.45 kg',
  dimensions: '35 × 28 × 28 cm',
  carriers: ['Correios SEDEX', 'Correios PAC', 'Jadlog'],
  pickupAvailable: false,
  images: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
  seller: {
    name: 'JDM Imports', slug: 'jdm-imports', initials: 'JI',
    verified: true, totalListings: 34, totalSales: 128, rating: 4.8,
  },
  type: 'direct',
  price: 4890,
  acceptOffers: true,
  views: 342,
  favorites: 28,
  buyClicks: 15,
  createdAt: '2025-03-15T10:00:00',
  updatedAt: '2025-03-17T08:30:00',
  moderationHistory: [
    { id: 'mh-1', date: '2025-03-15T10:05:00', admin: 'Sistema', action: 'Anúncio criado', reason: 'Enviado para análise automática' },
    { id: 'mh-2', date: '2025-03-16T14:00:00', admin: 'Admin Carlos', action: 'Solicitação de ajuste', reason: 'Foto 3 possui marca d\'água de terceiro. Solicitado reenvio.' },
  ],
};

const moderationReasons = [
  'Produto proibido', 'Fotos inadequadas', 'Descrição enganosa', 'Preço abusivo', 'Outro',
];

const statusConfig: Record<ListingStatus, { label: string; cls: string }> = {
  in_review: { label: 'Em análise', cls: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  active: { label: 'Ativo', cls: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
  paused: { label: 'Pausado', cls: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
  rejected: { label: 'Rejeitado', cls: 'bg-destructive/20 text-destructive' },
  sold: { label: 'Vendido', cls: 'bg-muted text-muted-foreground' },
};

/* ─── Component ─── */
export default function AdminListingDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<AdminListing | null>(null);
  const [mainImage, setMainImage] = useState(0);
  const [reason, setReason] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [sellerMessage, setSellerMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ action: string; title: string; desc: string; variant: 'default' | 'destructive' } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setListing({ ...mockListing, id: id || mockListing.id }); setLoading(false); }, 500);
    return () => clearTimeout(t);
  }, [id]);

  const doAction = (action: string, newStatus: ListingStatus) => {
    if ((action === 'reject' || action === 'remove') && !reason) {
      toast({ title: 'Selecione um motivo', variant: 'destructive' }); return;
    }
    setListing(prev => prev ? { ...prev, status: newStatus } : prev);
    const msgs: Record<string, string> = { approve: 'Anúncio aprovado', reject: 'Anúncio rejeitado', pause: 'Anúncio pausado', reactivate: 'Anúncio reativado', remove: 'Anúncio removido' };
    toast({ title: msgs[action] || 'Ação realizada' });
    setConfirmDialog(null);
    setReason(''); setInternalNote(''); setSellerMessage('');
  };

  const openConfirm = (action: string) => {
    const configs: Record<string, { title: string; desc: string; variant: 'default' | 'destructive' }> = {
      approve: { title: 'Aprovar anúncio', desc: 'O anúncio será publicado e ficará visível para todos os compradores.', variant: 'default' },
      reject: { title: 'Rejeitar anúncio', desc: 'O vendedor será notificado e poderá corrigir e reenviar.', variant: 'destructive' },
      pause: { title: 'Pausar anúncio', desc: 'O anúncio será ocultado temporariamente. O vendedor será notificado.', variant: 'destructive' },
      reactivate: { title: 'Reativar anúncio', desc: 'O anúncio voltará a ficar visível para compradores.', variant: 'default' },
      remove: { title: 'Remover permanentemente', desc: 'Esta ação é irreversível. O anúncio será excluído e o vendedor notificado.', variant: 'destructive' },
    };
    setConfirmDialog({ action, ...configs[action] });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4"><Skeleton className="h-80" /><Skeleton className="h-40" /></div>
            <div className="lg:col-span-4 space-y-4"><Skeleton className="h-40" /><Skeleton className="h-32" /></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!listing) return null;
  const sc = statusConfig[listing.status];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/admin/anuncios"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-3xl font-bold">Anúncio #{listing.id}</h1>
              <Badge className={sc.cls}>{sc.label}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {listing.status === 'in_review' && (
              <>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openConfirm('approve')}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => openConfirm('reject')}>
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </>
            )}
            {listing.status === 'active' && (
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => openConfirm('pause')}>
                <Pause className="h-4 w-4 mr-1" /> Pausar
              </Button>
            )}
            {listing.status === 'paused' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openConfirm('reactivate')}>
                <Play className="h-4 w-4 mr-1" /> Reativar
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => openConfirm('remove')}>
              <Trash2 className="h-4 w-4 mr-1" /> Remover
            </Button>
          </div>
        </div>

        {/* 2. Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-8 space-y-6">
            {/* Gallery */}
            <Card className="bg-gradient-card">
              <CardContent className="p-4 space-y-3">
                <div className="relative bg-muted rounded-lg flex items-center justify-center min-h-[300px]">
                  <img src={listing.images[mainImage]} alt={listing.title} className="max-h-[360px] rounded object-contain" />
                  {mainImage === 0 && <Badge className="absolute top-2 left-2 bg-[hsl(var(--kolecta-gold))] text-[hsl(var(--kolecta-carbon))]">Capa</Badge>}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {listing.images.map((img, i) => (
                    <button key={i} onClick={() => setMainImage(i)}
                      className={cn('w-16 h-16 rounded border-2 shrink-0 overflow-hidden transition-colors', i === mainImage ? 'border-[hsl(var(--kolecta-gold))]' : 'border-transparent hover:border-border')}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-2xl">{listing.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{listing.category}</span> <span>›</span> <span>{listing.subcategory}</span>
                </div>
                <Badge variant="secondary">{listing.condition}</Badge>
                <p className="text-sm leading-relaxed">{listing.description}</p>
                <Separator className="line-tech" />
                <Table>
                  <TableBody>
                    {[['Marca', listing.brand], ['Ano', listing.year], ['Origem', listing.origin], ['Nº de série', listing.serialNumber]].filter(([, v]) => v).map(([k, v]) => (
                      <TableRow key={k}><TableCell className="text-muted-foreground font-medium w-36">{k}</TableCell><TableCell>{v}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Logistics */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading">Logística</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-6 text-sm"><span className="text-muted-foreground">Peso:</span> {listing.weight}<span className="text-muted-foreground ml-4">Dimensões:</span> {listing.dimensions}</div>
                <div className="flex flex-wrap gap-1.5">{listing.carriers.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}</div>
                <p className="text-sm"><span className="text-muted-foreground">Retirada:</span> {listing.pickupAvailable ? 'Sim' : 'Não'}</p>
              </CardContent>
            </Card>

            {/* Moderation History */}
            {/* API: GET /api/admin/listings/:id/moderation-history */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading">Histórico de moderação</CardTitle></CardHeader>
              <CardContent>
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
                  {listing.moderationHistory.map((ev) => (
                    <div key={ev.id} className="relative">
                      <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-[hsl(var(--kolecta-gold))] bg-card" />
                      <div className="text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-bold">{ev.action}</span>
                          <span className="text-xs text-muted-foreground">por {ev.admin}</span>
                          <span className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{ev.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-4 space-y-6">
            {/* Seller */}
            <Card className="bg-gradient-card lg:sticky lg:top-24">
              <CardHeader><CardTitle className="font-heading text-base">Vendedor</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-muted font-heading">{listing.seller.initials}</AvatarFallback></Avatar>
                  <div>
                    <Link to={`/vendedor/${listing.seller.slug}`} className="font-heading font-bold hover:text-[hsl(var(--kolecta-gold))] transition-colors">{listing.seller.name}</Link>
                    {listing.seller.verified && <Badge className="ml-2 bg-emerald-500/20 text-emerald-600 text-[10px]"><ShieldCheck className="h-3 w-3 mr-0.5" /> Verificado</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="font-heading font-bold">{listing.seller.totalListings}</p><p className="text-[10px] text-muted-foreground">Anúncios</p></div>
                  <div><p className="font-heading font-bold">{listing.seller.totalSales}</p><p className="text-[10px] text-muted-foreground">Vendas</p></div>
                  <div className="flex flex-col items-center"><p className="font-heading font-bold flex items-center gap-0.5"><Star className="h-3 w-3 text-[hsl(var(--kolecta-gold))]" />{listing.seller.rating}</p><p className="text-[10px] text-muted-foreground">Avaliação</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-base">Precificação</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Tipo:</span> {listing.type === 'direct' ? 'Preço fixo' : 'Modo Lance'}</p>
                {listing.type === 'direct' && listing.price && (
                  <p className="font-heading text-2xl font-bold text-[hsl(var(--kolecta-gold))]">{formatBRL(listing.price)}</p>
                )}
                {listing.type === 'auction' && (
                  <>
                    {listing.startingBid && <p><span className="text-muted-foreground">Lance mínimo:</span> {formatBRL(listing.startingBid)}</p>}
                    {listing.currentBid && <p className="font-heading text-xl font-bold text-[hsl(var(--kolecta-gold))]">Atual: {formatBRL(listing.currentBid)}</p>}
                    {listing.auctionEnds && <p><span className="text-muted-foreground">Encerra:</span> {new Date(listing.auctionEnds).toLocaleDateString('pt-BR')}</p>}
                  </>
                )}
                <p><span className="text-muted-foreground">Aceita propostas:</span> {listing.acceptOffers ? 'Sim' : 'Não'}</p>
              </CardContent>
            </Card>

            {/* Metrics */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-base">Métricas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3 text-sm"><Eye className="h-4 w-4 text-muted-foreground" /> {listing.views} visualizações</div>
                <div className="flex items-center gap-3 text-sm"><Heart className="h-4 w-4 text-muted-foreground" /> {listing.favorites} favoritos</div>
                <div className="flex items-center gap-3 text-sm"><MousePointerClick className="h-4 w-4 text-muted-foreground" /> {listing.buyClicks} cliques em comprar</div>
                <Separator />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Criado: {new Date(listing.createdAt).toLocaleDateString('pt-BR')}</p>
                  <p>Atualizado: {new Date(listing.updatedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Moderation actions */}
            {/* API: POST /api/admin/listings/:id/moderate
                Body: { action, reason, internalNote, sellerMessage } */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-base">Ações de moderação</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue placeholder="Selecione um motivo" /></SelectTrigger>
                    <SelectContent>{moderationReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações internas</Label>
                  <Textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Visível apenas para admins..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mensagem ao vendedor</Label>
                  <Textarea value={sellerMessage} onChange={e => setSellerMessage(e.target.value)} placeholder="Enviada por email ao vendedor..." rows={2} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <Dialog open onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-heading">{confirmDialog.title}</DialogTitle>
              <DialogDescription>{confirmDialog.desc}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-4">
              <Button variant="ghost" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
              <Button
                variant={confirmDialog.variant === 'destructive' ? 'destructive' : 'kolecta'}
                onClick={() => {
                  const map: Record<string, ListingStatus> = { approve: 'active', reject: 'rejected', pause: 'paused', reactivate: 'active', remove: 'rejected' };
                  doAction(confirmDialog.action, map[confirmDialog.action]);
                }}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import EmptyState from '@/components/EmptyState';
import ProductDescription from '@/components/ProductDescription';
import { formatBRL } from '@/lib/currency';
import { conditionLabel } from '@/lib/conditions';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableRow,
} from '@/components/ui/table';
import { useListing, useUpdateListingStatus, useCategories } from '@/hooks/use-api';
import type { Listing } from '@/lib/api';
import {
  ArrowLeft, CheckCircle2, XCircle, Pause, Play, Trash2, Package,
} from 'lucide-react';

/* ─── Status ─── */
type ListingStatus = 'in_review' | 'active' | 'paused' | 'rejected' | 'sold';

const statusConfig: Record<ListingStatus, { label: string; cls: string }> = {
  in_review: { label: 'Em análise', cls: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  active: { label: 'Ativo', cls: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
  paused: { label: 'Pausado', cls: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
  rejected: { label: 'Rejeitado', cls: 'bg-destructive/20 text-destructive' },
  sold: { label: 'Vendido', cls: 'bg-muted text-muted-foreground' },
};

// Mapeia o status do backend para o status exibido no painel.
const apiToStatus: Record<string, ListingStatus> = {
  draft: 'in_review',
  pending_review: 'in_review',
  active: 'active',
  paused: 'paused',
  cancelled: 'rejected',
  rejected: 'rejected',
  sold: 'sold',
};

// Ação de moderação → status enviado ao backend.
//
// ATENÇÃO: reprovar grava `rejected`, igual à fila de aprovação. Antes esta
// tela mandava `cancelled` e a fila mandava `rejected`, dois nomes para a mesma
// coisa. O efeito colateral era real: o placar do Fundador só exclui `rejected`,
// então anúncio reprovado por aqui continuava contando para os 5 da candidatura.
// `remove` segue como `cancelled` de propósito: é retirar do ar, não reprovar.
const actionToApiStatus: Record<string, string> = {
  approve: 'active',
  reject: 'rejected',
  pause: 'paused',
  reactivate: 'active',
  remove: 'cancelled',
};


function parseImages(raw: string | null): string[] {
  if (!raw) return ['/placeholder.svg'];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['/placeholder.svg'];
  } catch {
    return raw.startsWith('http') ? [raw] : ['/placeholder.svg'];
  }
}

function initialsOf(name?: string | null): string {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/* ─── Component ─── */
export default function AdminListingDetail() {
  const { id } = useParams();
  const { data: listing, isLoading, isError } = useListing(id);
  const { data: categories } = useCategories();
  const updateStatus = useUpdateListingStatus();

  const [mainImage, setMainImage] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    action: string; title: string; desc: string; variant: 'default' | 'destructive';
  } | null>(null);

  const openConfirm = (action: string) => {
    const configs: Record<string, { title: string; desc: string; variant: 'default' | 'destructive' }> = {
      approve: { title: 'Aprovar anúncio', desc: 'O anúncio será publicado e ficará visível para todos os compradores.', variant: 'default' },
      reject: { title: 'Rejeitar anúncio', desc: 'O anúncio será removido do marketplace. O vendedor poderá corrigir e reenviar.', variant: 'destructive' },
      pause: { title: 'Pausar anúncio', desc: 'O anúncio será ocultado temporariamente dos compradores.', variant: 'destructive' },
      reactivate: { title: 'Reativar anúncio', desc: 'O anúncio voltará a ficar visível para compradores.', variant: 'default' },
      remove: { title: 'Remover anúncio', desc: 'O anúncio será cancelado e deixará de aparecer no marketplace.', variant: 'destructive' },
    };
    setConfirmDialog({ action, ...configs[action] });
  };

  async function confirmAction() {
    if (!confirmDialog || !listing) return;
    const status = actionToApiStatus[confirmDialog.action];
    await updateStatus.mutateAsync({ id: listing.id, status });
    setConfirmDialog(null);
  }

  if (isLoading) {
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

  if (isError || !listing) {
    return (
      <AdminLayout>
        <div className="p-6 py-16">
          <EmptyState
            icon={Package}
            title="Anúncio não encontrado"
            action={
              <Button variant="kolecta" asChild>
                <Link to="/admin/anuncios">Voltar aos anúncios</Link>
              </Button>
            }
          />
        </div>
      </AdminLayout>
    );
  }

  const status = apiToStatus[listing.status] ?? 'in_review';
  const sc = statusConfig[status];
  const images = parseImages(listing.images);
  const categoryName = categories?.find((c) => c.id === listing.categoryId)?.name ?? listing.categoryId ?? '—';

  const attributes: [string, string | null][] = [
    ['Marca', listing.brand],
    ['Linha', listing.line],
    ['Escala', listing.scale],
    ['Ano', listing.year],
    ['Edição', listing.edition],
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/admin/anuncios"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-3xl font-bold">Anúncio #{listing.id.slice(-6).toUpperCase()}</h1>
              <Badge className={sc.cls}>{sc.label}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === 'in_review' && (
              <>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={updateStatus.isPending} onClick={() => openConfirm('approve')}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                </Button>
                <Button size="sm" variant="destructive" disabled={updateStatus.isPending} onClick={() => openConfirm('reject')}>
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </>
            )}
            {status === 'active' && (
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={updateStatus.isPending} onClick={() => openConfirm('pause')}>
                <Pause className="h-4 w-4 mr-1" /> Pausar
              </Button>
            )}
            {status === 'paused' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={updateStatus.isPending} onClick={() => openConfirm('reactivate')}>
                <Play className="h-4 w-4 mr-1" /> Reativar
              </Button>
            )}
            {status !== 'rejected' && status !== 'sold' && (
              <Button size="sm" variant="ghost" className="text-destructive" disabled={updateStatus.isPending} onClick={() => openConfirm('remove')}>
                <Trash2 className="h-4 w-4 mr-1" /> Remover
              </Button>
            )}
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
                  <img src={images[mainImage]} alt={listing.title} className="max-h-[360px] rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button key={i} onClick={() => setMainImage(i)}
                        className={`w-16 h-16 rounded border-2 shrink-0 overflow-hidden transition-colors ${i === mainImage ? 'border-[hsl(var(--kolecta-gold))]' : 'border-transparent hover:border-border'}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-2xl">{listing.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{categoryName}</span>
                </div>
                {/* Rótulo legível, não o código do banco: aqui saía
                    "novo-lacrado" em vez de "Novo na embalagem". */}
                <Badge variant="secondary">{conditionLabel(listing.condition)}</Badge>
                <ProductDescription texto={listing.description} />
                {attributes.some(([, v]) => v) && (
                  <>
                    <Separator className="line-tech" />
                    <Table>
                      <TableBody>
                        {attributes.filter(([, v]) => v).map(([k, v]) => (
                          <TableRow key={k}><TableCell className="text-muted-foreground font-medium w-36">{k}</TableCell><TableCell>{v}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-4 space-y-6">
            {/* Seller */}
            <Card className="bg-gradient-card lg:sticky lg:top-24">
              <CardHeader><CardTitle className="font-heading text-base">Vendedor</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-muted font-heading">{initialsOf(listing.sellerName)}</AvatarFallback></Avatar>
                  <div>
                    <Link to={`/vendedor/${listing.sellerId}`} className="font-heading font-bold hover:text-[hsl(var(--kolecta-gold))] transition-colors">{listing.sellerName ?? 'Vendedor'}</Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-base">Precificação</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Tipo:</span> {listing.type === 'direct' ? 'Preço fixo' : 'Modo Lance'}</p>
                {listing.priceInCents != null && (
                  <p className="font-heading text-2xl font-bold text-[hsl(var(--kolecta-gold))]">{formatBRL((listing.priceInCents ?? 0) / 100)}</p>
                )}
              </CardContent>
            </Card>

            {/* Detalhes */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-base">Detalhes</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>Criado: {new Date(listing.createdAt).toLocaleDateString('pt-BR')}</p>
                <p>Atualizado: {new Date(listing.updatedAt).toLocaleDateString('pt-BR')}</p>
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
                disabled={updateStatus.isPending}
                onClick={confirmAction}
              >
                {updateStatus.isPending ? 'Processando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}

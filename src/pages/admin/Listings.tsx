import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Eye, AlertCircle, Clock, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdminListings, useUpdateListingStatus } from '@/hooks/use-api';
import type { Listing } from '@/lib/api';

const conditionLabels: Record<string, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  excellent: 'Excelente',
  good: 'Bom',
  fair: 'Regular',
  poor: 'Usado',
};

const rejectReasons = [
  'Fotos insuficientes ou de baixa qualidade',
  'Título ou descrição inadequados',
  'Preço fora dos padrões de mercado',
  'Produto não se enquadra nas categorias permitidas',
  'Suspeita de falsificação ou item não autêntico',
  'Informações incompletas ou contraditórias',
  'Outro motivo',
];

function parseImages(images: string | null): string[] {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function AdminListings() {
  const { data: listings = [], isLoading, isError } = useAdminListings('draft');
  const updateStatus = useUpdateListingStatus();

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const handleApprove = (id: string) => {
    updateStatus.mutate(
      { id, status: 'active' },
      { onSuccess: () => setDetailOpen(false) },
    );
  };

  const openReject = (listing: Listing) => {
    setSelectedListing(listing);
    setRejectDialogOpen(true);
    setRejectReason('');
    setRejectNotes('');
  };

  const handleReject = () => {
    if (selectedListing) {
      updateStatus.mutate(
        { id: selectedListing.id, status: 'rejected' },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setDetailOpen(false);
          },
        },
      );
    }
  };

  const openDetail = (listing: Listing) => {
    setSelectedListing(listing);
    setDetailOpen(true);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'agora';
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold uppercase mb-2">Erro ao carregar</h2>
          <p className="text-sm text-muted-foreground">Não foi possível buscar os anúncios pendentes.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">Fila de Aprovação</h1>
            <p className="text-sm text-muted-foreground mt-1">{listings.length} anúncios aguardando revisão</p>
          </div>
          <Badge className="bg-accent/10 text-accent text-sm px-3 py-1">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            {listings.length} pendentes
          </Badge>
        </div>

        {/* Listing queue */}
        <AnimatePresence>
          <div className="space-y-3">
            {listings.map((listing, i) => {
              const imgs = parseImages(listing.images);
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <Card className="bg-card border-border hover:border-primary/20 transition-colors">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-4">
                        {/* Image */}
                        <div className="w-20 h-20 rounded-md overflow-hidden bg-secondary shrink-0">
                          {imgs[0] ? (
                            <img src={imgs[0]} alt={listing.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium truncate">{listing.title}</h3>
                            <Badge variant="outline" className="text-[10px] border-border shrink-0">
                              {listing.type === 'auction' ? 'Modo Lance' : 'Venda Direta'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                            <span>{conditionLabels[listing.condition] || listing.condition}</span>
                            <span>·</span>
                            <span className="font-medium">
                              {listing.priceInCents ? formatBRL(listing.priceInCents) : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>Vendedor: <span className="text-foreground">{listing.sellerName || listing.sellerId}</span></span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo(listing.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(listing)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-accent/30 text-accent hover:bg-accent/10"
                            onClick={() => openReject(listing)}
                            disabled={updateStatus.isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reprovar
                          </Button>
                          <Button
                            variant="kolecta"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleApprove(listing.id)}
                            disabled={updateStatus.isPending}
                          >
                            {updateStatus.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>

        {listings.length === 0 && (
          <div className="text-center py-20">
            <Check className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-bold uppercase mb-2">Tudo revisado!</h2>
            <p className="text-sm text-muted-foreground">Não há anúncios pendentes de aprovação.</p>
          </div>
        )}

        {/* Detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold uppercase">Detalhe do Anúncio</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Revise todas as informações antes de aprovar ou reprovar.
              </DialogDescription>
            </DialogHeader>
            {selectedListing && (() => {
              const imgs = parseImages(selectedListing.images);
              return (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-32 h-32 rounded-md overflow-hidden bg-secondary shrink-0">
                      {imgs[0] ? (
                        <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-base font-bold mb-1">{selectedListing.title}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{selectedListing.type === 'auction' ? 'Modo Lance' : 'Venda Direta'}</Badge>
                        <Badge variant="outline" className="text-xs">{conditionLabels[selectedListing.condition] || selectedListing.condition}</Badge>
                        {selectedListing.brand && <Badge variant="outline" className="text-xs">{selectedListing.brand}</Badge>}
                        {selectedListing.scale && <Badge variant="outline" className="text-xs">Escala {selectedListing.scale}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedListing.description || 'Sem descrição'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {selectedListing.brand && <div><span className="text-muted-foreground">Marca:</span> <span className="text-foreground">{selectedListing.brand}</span></div>}
                    {selectedListing.line && <div><span className="text-muted-foreground">Linha:</span> <span className="text-foreground">{selectedListing.line}</span></div>}
                    {selectedListing.scale && <div><span className="text-muted-foreground">Escala:</span> <span className="text-foreground">{selectedListing.scale}</span></div>}
                    {selectedListing.year && <div><span className="text-muted-foreground">Ano:</span> <span className="text-foreground">{selectedListing.year}</span></div>}
                    {selectedListing.edition && <div><span className="text-muted-foreground">Edição:</span> <span className="text-foreground">{selectedListing.edition}</span></div>}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border">
                    <div>
                      <span className="text-xs text-muted-foreground">Vendedor</span>
                      <div className="text-sm font-medium">{selectedListing.sellerName || selectedListing.sellerId}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Preço</span>
                      <div className="font-heading text-lg font-bold text-primary">
                        {selectedListing.priceInCents ? formatBRL(selectedListing.priceInCents) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Image gallery */}
                  {imgs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {imgs.map((url, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-md overflow-hidden bg-secondary shrink-0">
                          <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            <DialogFooter>
              <Button
                variant="outline"
                className="border-accent/30 text-accent hover:bg-accent/10"
                onClick={() => selectedListing && openReject(selectedListing)}
                disabled={updateStatus.isPending}
              >
                <X className="h-4 w-4" /> Reprovar
              </Button>
              <Button
                variant="kolecta"
                onClick={() => selectedListing && handleApprove(selectedListing.id)}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aprovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold uppercase text-accent">Reprovar Anúncio</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Selecione o motivo da reprovação.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                {rejectReasons.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setRejectReason(reason)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      rejectReason === reason
                        ? 'bg-accent/10 text-accent border border-accent/30'
                        : 'bg-secondary/30 text-muted-foreground hover:text-foreground border border-transparent'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Observações adicionais (opcional)..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="accent"
                onClick={handleReject}
                disabled={!rejectReason || updateStatus.isPending}
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Confirmar Reprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

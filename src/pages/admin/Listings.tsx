import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Eye, ChevronDown, AlertCircle, Clock } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { mockProducts, formatBRL, conditionLabel } from '@/lib/mock-data';
import type { Product } from '@/lib/mock-data';

// Simulate pending listings by cloning some products
const pendingListings: (Product & { submittedAt: string })[] = [
  { ...mockProducts[0], id: 'pending-1', status: 'em_analise', submittedAt: '2026-02-23T08:30:00Z' },
  { ...mockProducts[3], id: 'pending-2', status: 'em_analise', submittedAt: '2026-02-23T07:15:00Z' },
  { ...mockProducts[6], id: 'pending-3', status: 'em_analise', submittedAt: '2026-02-22T22:00:00Z' },
  { ...mockProducts[9], id: 'pending-4', status: 'em_analise', submittedAt: '2026-02-22T18:45:00Z' },
  { ...mockProducts[1], id: 'pending-5', status: 'em_analise', title: 'Tomica LV Neo – Mazda RX-7 FC3S', submittedAt: '2026-02-22T14:00:00Z' },
  { ...mockProducts[4], id: 'pending-6', status: 'em_analise', title: 'Kyosho 1:18 Toyota Supra MK4 – TRD 3000GT', submittedAt: '2026-02-22T11:00:00Z' },
  { ...mockProducts[7], id: 'pending-7', status: 'em_analise', submittedAt: '2026-02-22T09:30:00Z' },
  { ...mockProducts[10], id: 'pending-8', status: 'em_analise', submittedAt: '2026-02-21T20:00:00Z' },
  { ...mockProducts[11], id: 'pending-9', status: 'em_analise', submittedAt: '2026-02-21T16:00:00Z' },
  { ...mockProducts[2], id: 'pending-10', status: 'em_analise', title: 'Majorette WRC – Hyundai i20 N Rally1', submittedAt: '2026-02-21T12:00:00Z' },
  { ...mockProducts[5], id: 'pending-11', status: 'em_analise', submittedAt: '2026-02-21T08:00:00Z' },
  { ...mockProducts[8], id: 'pending-12', status: 'em_analise', submittedAt: '2026-02-20T22:00:00Z' },
];

const rejectReasons = [
  'Fotos insuficientes ou de baixa qualidade',
  'Título ou descrição inadequados',
  'Preço fora dos padrões de mercado',
  'Produto não se enquadra nas categorias permitidas',
  'Suspeita de falsificação ou item não autêntico',
  'Informações incompletas ou contraditórias',
  'Outro motivo',
];

export default function AdminListings() {
  const [listings, setListings] = useState(pendingListings);
  const [selectedListing, setSelectedListing] = useState<typeof pendingListings[0] | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const handleApprove = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    setDetailOpen(false);
  };

  const openReject = (listing: typeof pendingListings[0]) => {
    setSelectedListing(listing);
    setRejectDialogOpen(true);
    setRejectReason('');
    setRejectNotes('');
  };

  const handleReject = () => {
    if (selectedListing) {
      setListings((prev) => prev.filter((l) => l.id !== selectedListing.id));
    }
    setRejectDialogOpen(false);
    setDetailOpen(false);
  };

  const openDetail = (listing: typeof pendingListings[0]) => {
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
            {listings.map((listing, i) => (
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
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium truncate">{listing.title}</h3>
                          <Badge variant="outline" className="text-[10px] border-border shrink-0">
                            {listing.type === 'auction' ? 'Leilão' : 'Venda Direta'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                          <span>{listing.category}</span>
                          <span>·</span>
                          <span>{conditionLabel(listing.condition)}</span>
                          <span>·</span>
                          <span className="font-medium">
                            {listing.type === 'auction'
                              ? `Lance: ${formatBRL(listing.startingBid || 0)}`
                              : formatBRL(listing.price || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>Vendedor: <span className="text-foreground">{listing.seller.name}</span></span>
                          {listing.seller.verified && <Badge className="text-[9px] bg-primary/10 text-primary">Verificado</Badge>}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(listing.submittedAt)}
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
                        >
                          <X className="h-3.5 w-3.5" />
                          Reprovar
                        </Button>
                        <Button
                          variant="kolecta"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleApprove(listing.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
            {selectedListing && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-32 h-32 rounded-md overflow-hidden bg-secondary shrink-0">
                    <img src={selectedListing.images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-base font-bold mb-1">{selectedListing.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{selectedListing.type === 'auction' ? 'Leilão' : 'Venda Direta'}</Badge>
                      <Badge variant="outline" className="text-xs">{conditionLabel(selectedListing.condition)}</Badge>
                      <Badge variant="outline" className="text-xs">{selectedListing.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedListing.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(selectedListing.details).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key}:</span>{' '}
                      <span className="text-foreground">{val}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground">Vendedor</span>
                    <div className="text-sm font-medium">{selectedListing.seller.name}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Preço/Lance</span>
                    <div className="font-heading text-lg font-bold text-primary">
                      {formatBRL(selectedListing.price || selectedListing.startingBid || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" className="border-accent/30 text-accent hover:bg-accent/10" onClick={() => selectedListing && openReject(selectedListing)}>
                <X className="h-4 w-4" /> Reprovar
              </Button>
              <Button variant="kolecta" onClick={() => selectedListing && handleApprove(selectedListing.id)}>
                <Check className="h-4 w-4" /> Aprovar
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
              <Button variant="accent" onClick={handleReject} disabled={!rejectReason}>
                <X className="h-4 w-4" /> Confirmar Reprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Eye, AlertCircle, Clock, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdminListings, useUpdateListingStatus, useCategories } from '@/hooks/use-api';
import type { Listing } from '@/lib/api';
import { formatBRL } from '@/lib/currency';
// Fonte única dos rótulos. A lista local daqui estava com o vocabulário antigo
// (mint, near_mint...) e não batia com o que o wizard salva (`novo-lacrado`),
// então a fila mostrava o código cru em todo anúncio.
import { conditionLabel } from '@/lib/conditions';

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

/** Centavos para BRL, tolerando null/undefined sem virar NaN na tela. */
function brl(cents: number | null | undefined): string | null {
  return typeof cents === 'number' ? formatBRL(cents / 100) : null;
}

/** O valor de referência do anúncio: preço na venda direta, lance inicial no leilão. */
function valorPrincipal(l: Listing): string | null {
  return l.type === 'auction' ? brl(l.startingBidInCents) : brl(l.priceInCents);
}

/** Uma linha de dado no painel de revisão. `alerta` pinta de vermelho o que falta. */
function Dado({ rotulo, valor, alerta }: { rotulo: string; valor: React.ReactNode; alerta?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground shrink-0">{rotulo}</span>
      <span className={`text-xs text-right ${alerta ? 'text-destructive font-medium' : 'text-foreground'}`}>
        {valor}
      </span>
    </div>
  );
}

/** Peso e dimensões: frete errado sai caro, então a falta precisa aparecer. */
function resumoFrete(l: Listing): { texto: string; faltando: boolean } {
  const temPeso = typeof l.weightGrams === 'number' && l.weightGrams > 0;
  const dims = [l.widthCm, l.heightCm, l.lengthCm];
  const temDims = dims.every((d) => typeof d === 'number' && d > 0);
  if (!temPeso && !temDims) return { texto: 'Não informado', faltando: true };
  const peso = temPeso ? `${l.weightGrams} g` : 'sem peso';
  const medida = temDims ? `${l.widthCm} x ${l.heightCm} x ${l.lengthCm} cm` : 'sem dimensões';
  return { texto: `${peso}, ${medida}`, faltando: !temPeso || !temDims };
}


export default function AdminListings() {
  const { data: listings = [], isLoading, isError } = useAdminListings('draft', 500);
  const { data: categorias = [] } = useCategories();
  const updateStatus = useUpdateListingStatus();

  // Categoria errada é o erro mais comum de anúncio, então o nome dela precisa
  // estar na revisão. A API do anúncio devolve só o id.
  const nomeCategoria = (id: string | null) =>
    categorias.find((c) => c.id === id)?.name ?? null;

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  // Qual anúncio está sendo moderado agora. Sem isso, `updateStatus.isPending`
  // é global e uma única aprovação punha spinner e travava o botão das 176
  // linhas ao mesmo tempo, parecendo que a tela inteira congelou.
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const ocupado = (id: string) => emAndamento === id;

  const handleApprove = (id: string) => {
    setEmAndamento(id);
    updateStatus.mutate(
      { id, status: 'active' },
      {
        onSuccess: () => setDetailOpen(false),
        onSettled: () => setEmAndamento(null),
      },
    );
  };

  const openReject = (listing: Listing) => {
    setSelectedListing(listing);
    setRejectDialogOpen(true);
    setRejectReason('');
    setRejectNotes('');
  };

  const handleReject = () => {
    if (!selectedListing) return;
    // O motivo escolhido e a observação seguem para o backend: é o que o
    // vendedor lê para corrigir, e o que preenche o e-mail de anúncio
    // rejeitado. Antes tudo isso era coletado na tela e descartado.
    const motivo = [rejectReason, rejectNotes.trim()].filter(Boolean).join('. ');
    setEmAndamento(selectedListing.id);
    updateStatus.mutate(
      { id: selectedListing.id, status: 'rejected', reason: motivo },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setDetailOpen(false);
        },
        onSettled: () => setEmAndamento(null),
      },
    );
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
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-1">
                            <span>{conditionLabel(listing.condition)}</span>
                            <span>·</span>
                            {/* Em leilão o valor de referência é o lance inicial;
                                `priceInCents` vem vazio e mostrava só um traço. */}
                            {valorPrincipal(listing) ? (
                              <span className="font-medium text-foreground">
                                {listing.type === 'auction' && 'Inicial '}
                                {valorPrincipal(listing)}
                              </span>
                            ) : (
                              <span className="font-medium text-destructive">Sem valor</span>
                            )}
                            <span>·</span>
                            <span>{nomeCategoria(listing.categoryId) ?? 'Sem categoria'}</span>
                            <span>·</span>
                            <span className={imgs.length < 3 ? 'text-destructive' : undefined}>
                              {imgs.length} {imgs.length === 1 ? 'foto' : 'fotos'}
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
                            disabled={ocupado(listing.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reprovar
                          </Button>
                          <Button
                            variant="kolecta"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleApprove(listing.id)}
                            disabled={ocupado(listing.id)}
                          >
                            {ocupado(listing.id) ? (
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
                        <Badge variant="outline" className="text-xs">{conditionLabel(selectedListing.condition)}</Badge>
                        {selectedListing.brand && <Badge variant="outline" className="text-xs">{selectedListing.brand}</Badge>}
                        {selectedListing.scale && <Badge variant="outline" className="text-xs">Escala {selectedListing.scale}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedListing.description || 'Sem descrição'}</p>
                    </div>
                  </div>

                  {/* Ficha completa: é aqui que se pega inconsistência antes de
                      aprovar, então nada de esconder campo vazio. O que falta
                      aparece em vermelho em vez de simplesmente não existir. */}
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <div className="rounded-md border border-border bg-secondary/20 p-3">
                      <p className="mb-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Item</p>
                      <Dado rotulo="Categoria" valor={nomeCategoria(selectedListing.categoryId) ?? 'Sem categoria'} alerta={!selectedListing.categoryId} />
                      <Dado rotulo="Condição" valor={conditionLabel(selectedListing.condition) || 'Não informada'} alerta={!selectedListing.condition} />
                      <Dado rotulo="Marca" valor={selectedListing.brand || 'Não informada'} alerta={!selectedListing.brand} />
                      <Dado rotulo="Linha" valor={selectedListing.line || 'Não informada'} />
                      <Dado rotulo="Escala" valor={selectedListing.scale || 'Não informada'} />
                      <Dado rotulo="Ano" valor={selectedListing.year || 'Não informado'} />
                      <Dado rotulo="Edição" valor={selectedListing.edition || 'Não informada'} />
                      <Dado rotulo="Fotos" valor={`${imgs.length} de 8`} alerta={imgs.length < 3} />
                    </div>

                    <div className="rounded-md border border-border bg-secondary/20 p-3">
                      <p className="mb-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
                        {selectedListing.type === 'auction' ? 'Modo Lance' : 'Venda direta'}
                      </p>

                      {selectedListing.type === 'auction' ? (
                        // A fila (/api/admin/listings) ainda não devolve a config
                        // do leilão, que vive na tabela `auctions`. Sem esses
                        // valores não dá para revisar reserva nem incremento,
                        // então avisamos em vez de mostrar um traço mudo.
                        typeof selectedListing.startingBidInCents === 'number' ? (
                          <>
                            <Dado rotulo="Lance inicial" valor={brl(selectedListing.startingBidInCents)} />
                            <Dado rotulo="Incremento mínimo" valor={brl(selectedListing.minIncrementInCents) ?? 'Não definido'} alerta={selectedListing.minIncrementInCents == null} />
                            <Dado rotulo="Preço de reserva" valor={brl(selectedListing.reservePriceInCents) ?? 'Sem reserva'} />
                            <Dado rotulo="Duração" valor={selectedListing.durationHours ? `${Math.round(selectedListing.durationHours / 24)} dias` : 'Não definida'} alerta={!selectedListing.durationHours} />
                            <Dado rotulo="Anti-sniper" valor={selectedListing.antiSniper ? 'Ligado' : 'Desligado'} />
                          </>
                        ) : (
                          <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 p-2">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                            <p className="text-[11px] leading-relaxed text-destructive">
                              O backend ainda não envia a configuração do leilão nesta tela
                              (lance inicial, incremento, reserva e duração). Confira esses
                              valores no anúncio antes de aprovar.
                            </p>
                          </div>
                        )
                      ) : (
                        <Dado
                          rotulo="Preço"
                          valor={brl(selectedListing.priceInCents) ?? 'Sem preço'}
                          alerta={selectedListing.priceInCents == null}
                        />
                      )}

                      <div className="my-2 border-t border-border" />
                      <p className="mb-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Envio</p>
                      {(() => {
                        const frete = resumoFrete(selectedListing);
                        return <Dado rotulo="Peso e medidas" valor={frete.texto} alerta={frete.faltando} />;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border">
                    <div>
                      <span className="text-xs text-muted-foreground">Vendedor</span>
                      <div className="text-sm font-medium">{selectedListing.sellerName || selectedListing.sellerId}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {selectedListing.type === 'auction' ? 'Lance inicial' : 'Preço'}
                      </span>
                      <div className="font-heading text-lg font-bold text-primary">
                        {valorPrincipal(selectedListing) ?? (
                          <span className="text-destructive">Sem valor</span>
                        )}
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

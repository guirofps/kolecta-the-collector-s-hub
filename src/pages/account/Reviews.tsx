import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Star, Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
interface ReviewProduct {
  id: string;
  title: string;
  image: string;
  seller: { name: string; slug: string };
}

interface PendingReview {
  orderId: string;
  product: ReviewProduct;
  deliveredAt: string;
}

interface CompletedReview {
  id: string;
  product: ReviewProduct;
  sellerRating: number;
  sellerComment: string;
  productRating: number;
  productComment: string;
  photos: string[];
  reviewedAt: string;
  sellerReviewed: boolean;
}

/* ─── Mock Data ─── */
const mockPendingReviews: PendingReview[] = [
  {
    orderId: 'KL-000123',
    product: {
      id: 'p1',
      title: 'Volante Nardi Classic 330mm',
      image: '/placeholder.svg',
      seller: { name: 'JDM Imports', slug: 'jdm-imports' },
    },
    deliveredAt: '2025-03-10',
  },
  {
    orderId: 'KL-000125',
    product: {
      id: 'p4',
      title: 'Shift Knob Tomei Duracon',
      image: '/placeholder.svg',
      seller: { name: 'Drift Garage', slug: 'drift-garage' },
    },
    deliveredAt: '2025-03-12',
  },
];

const mockCompletedReviews: CompletedReview[] = [
  {
    id: 'rev-1',
    product: {
      id: 'p2',
      title: 'Coilovers Tein Flex Z - S14',
      image: '/placeholder.svg',
      seller: { name: 'Touge Parts', slug: 'touge-parts' },
    },
    sellerRating: 5,
    sellerComment: 'Vendedor excelente! Embalou super bem e enviou rápido.',
    productRating: 5,
    productComment: 'Produto em perfeito estado, como descrito no anúncio.',
    photos: ['/placeholder.svg', '/placeholder.svg'],
    reviewedAt: '2025-03-05',
    sellerReviewed: true,
  },
  {
    id: 'rev-2',
    product: {
      id: 'p3',
      title: 'Adesivo Recaro Racing - Par',
      image: '/placeholder.svg',
      seller: { name: 'JDM Imports', slug: 'jdm-imports' },
    },
    sellerRating: 4,
    sellerComment: 'Bom atendimento, demorou um pouco para responder.',
    productRating: 4,
    productComment: '',
    photos: [],
    reviewedAt: '2025-02-28',
    sellerReviewed: false,
  },
  {
    id: 'rev-3',
    product: {
      id: 'p5',
      title: 'Turbo Timer HKS Type-0',
      image: '/placeholder.svg',
      seller: { name: 'Drift Garage', slug: 'drift-garage' },
    },
    sellerRating: 3,
    sellerComment: 'Produto veio com embalagem amassada mas o item estava ok.',
    productRating: 4,
    productComment: 'Funciona bem, instalação simples.',
    photos: ['/placeholder.svg'],
    reviewedAt: '2025-02-20',
    sellerReviewed: true,
  },
];

/* ─── Star Selector ─── */
function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className="p-0.5 transition-transform hover:scale-110"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              (hover || value) >= i
                ? 'fill-kolecta-gold text-kolecta-gold'
                : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}

/* ─── Star Display ─── */
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i <= rating
              ? 'fill-kolecta-gold text-kolecta-gold'
              : 'text-muted-foreground'
          )}
        />
      ))}
    </div>
  );
}

/* ─── Review Dialog ─── */
function ReviewDialog({
  open,
  onOpenChange,
  product,
  initialData,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: ReviewProduct;
  initialData?: { sellerRating: number; sellerComment: string; productRating: number; productComment: string; photos: string[] };
  onSubmit: (data: { sellerRating: number; sellerComment: string; productRating: number; productComment: string; photos: string[] }) => void;
}) {
  const [sellerRating, setSellerRating] = useState(initialData?.sellerRating ?? 0);
  const [sellerComment, setSellerComment] = useState(initialData?.sellerComment ?? '');
  const [productRating, setProductRating] = useState(initialData?.productRating ?? 0);
  const [productComment, setProductComment] = useState(initialData?.productComment ?? '');
  const [photos, setPhotos] = useState<string[]>(initialData?.photos ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).slice(0, 3 - photos.length).map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 3));
    e.target.value = '';
  };

  const canSubmit = sellerRating > 0 && productRating > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold uppercase">
            {initialData ? 'Editar avaliação' : 'Avaliar compra'}
          </DialogTitle>
        </DialogHeader>

        {/* Product info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm line-clamp-1">{product.title}</p>
            <p className="text-xs text-muted-foreground">{product.seller.name}</p>
          </div>
        </div>

        <Separator />

        {/* Seller rating */}
        <div className="space-y-2 mt-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide">Avaliação do vendedor</p>
          <StarSelector value={sellerRating} onChange={setSellerRating} />
          <div className="relative">
            <Textarea
              placeholder="Conte sua experiência com o vendedor..."
              value={sellerComment}
              onChange={(e) => setSellerComment(e.target.value.slice(0, 500))}
              className="resize-none min-h-[80px]"
              maxLength={500}
            />
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {sellerComment.length}/500
            </span>
          </div>
        </div>

        <Separator />

        {/* Product rating */}
        <div className="space-y-2 mt-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide">Avaliação do produto</p>
          <StarSelector value={productRating} onChange={setProductRating} />
          <div className="relative">
            <Textarea
              placeholder="Descreva o produto recebido..."
              value={productComment}
              onChange={(e) => setProductComment(e.target.value.slice(0, 500))}
              className="resize-none min-h-[80px]"
              maxLength={500}
            />
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {productComment.length}/500
            </span>
          </div>
        </div>

        <Separator />

        {/* Photos */}
        {/* Fotos enviadas via POST /api/uploads antes de submeter */}
        <div className="space-y-2 mt-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide">Fotos (opcional)</p>
          <div className="flex gap-2 flex-wrap">
            {photos.map((photo, i) => (
              <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden bg-muted">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                type="button"
                className="w-20 h-20 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-kolecta-gold hover:text-kolecta-gold transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px]">Adicionar</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* API: POST /api/reviews
            Body: { orderId, sellerRating, sellerComment, productRating,
            productComment, photos[] } */}

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="kolecta"
            className="glow-primary"
            disabled={!canSubmit}
            onClick={() => {
              onSubmit({ sellerRating, sellerComment, productRating, productComment, photos });
              onOpenChange(false);
            }}
          >
            Enviar avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Lightbox ─── */
function Lightbox({
  photos,
  index,
  onClose,
}: {
  photos: string[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-2xl p-2">
        <div className="relative aspect-square bg-muted rounded-md overflow-hidden">
          <img src={photos[current]} alt="" className="w-full h-full object-contain" />
        </div>
        {photos.length > 1 && (
          <div className="flex justify-center gap-2 mt-2">
            {photos.map((p, i) => (
              <button
                key={i}
                className={cn(
                  'w-12 h-12 rounded-md overflow-hidden border-2 transition-colors',
                  i === current ? 'border-kolecta-gold' : 'border-transparent'
                )}
                onClick={() => setCurrent(i)}
              >
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ─── */
export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [completedReviews, setCompletedReviews] = useState<CompletedReview[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<PendingReview | null>(null);
  const [selectedCompleted, setSelectedCompleted] = useState<CompletedReview | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

  // Simulate loading
  useState(() => {
    setTimeout(() => {
      setPendingReviews(mockPendingReviews);
      setCompletedReviews(mockCompletedReviews);
      setLoading(false);
    }, 600);
  });

  const handleNewReview = (data: { sellerRating: number; sellerComment: string; productRating: number; productComment: string; photos: string[] }) => {
    if (!selectedPending) return;
    const newCompleted: CompletedReview = {
      id: `rev-${Date.now()}`,
      product: selectedPending.product,
      ...data,
      reviewedAt: new Date().toISOString().split('T')[0],
      sellerReviewed: false,
    };
    setCompletedReviews((prev) => [newCompleted, ...prev]);
    setPendingReviews((prev) => prev.filter((p) => p.orderId !== selectedPending.orderId));
    setSelectedPending(null);
  };

  const handleEditReview = (data: { sellerRating: number; sellerComment: string; productRating: number; productComment: string; photos: string[] }) => {
    if (!selectedCompleted) return;
    setCompletedReviews((prev) =>
      prev.map((r) => (r.id === selectedCompleted.id ? { ...r, ...data } : r))
    );
    setSelectedCompleted(null);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-wide">Avaliações</h1>
          <p className="text-muted-foreground text-sm mt-1">Avalie suas compras e veja o histórico</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="pending" className="font-heading uppercase tracking-wider text-xs gap-1.5">
              Pendentes
              {pendingReviews.length > 0 && (
                <Badge className="bg-kolecta-gold text-kolecta-gold-foreground text-[10px] h-5 min-w-5 px-1.5">
                  {pendingReviews.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="font-heading uppercase tracking-wider text-xs">
              Realizadas
            </TabsTrigger>
          </TabsList>

          {/* API: GET /api/reviews/pending
              Retorna pedidos entregues sem avaliação do comprador */}

          <TabsContent value="pending" className="mt-6">
            {loading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : pendingReviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Nenhuma compra aguardando avaliação"
              />
            ) : (
              <div className="space-y-3">
                {pendingReviews.map((item) => (
                  <Card key={item.orderId} className="bg-gradient-card border-border p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                        <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold line-clamp-1">{item.product.title}</p>
                        <Link
                          to={`/vendedor/${item.product.seller.slug}`}
                          className="text-sm text-muted-foreground hover:text-kolecta-gold transition-colors"
                        >
                          {item.product.seller.name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          Entregue em {new Date(item.deliveredAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Button
                        variant="kolecta"
                        className="glow-primary shrink-0"
                        onClick={() => {
                          setSelectedPending(item);
                          setReviewDialogOpen(true);
                        }}
                      >
                        Avaliar agora
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* API: GET /api/reviews/completed
              PUT /api/reviews/:id — editar avaliação existente */}

          <TabsContent value="completed" className="mt-6">
            {loading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : completedReviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Você ainda não fez nenhuma avaliação"
              />
            ) : (
              <div className="space-y-4">
                {completedReviews.map((review) => (
                  <Card key={review.id} className="bg-gradient-card border-border p-4 space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                        <img src={review.product.image} alt={review.product.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-heading font-bold line-clamp-1">{review.product.title}</p>
                            <Link
                              to={`/vendedor/${review.product.seller.slug}`}
                              className="text-sm text-muted-foreground hover:text-kolecta-gold transition-colors"
                            >
                              {review.product.seller.name}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-1">
                              Avaliado em {new Date(review.reviewedAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {review.sellerReviewed && (
                              <Badge className="bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/20 text-[10px]">
                                Avaliação recebida
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCompleted(review);
                                setEditDialogOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                          </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1">Vendedor</p>
                            <StarDisplay rating={review.sellerRating} />
                            {review.sellerComment && (
                              <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{review.sellerComment}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1">Produto</p>
                            <StarDisplay rating={review.productRating} />
                            {review.productComment && (
                              <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{review.productComment}</p>
                            )}
                          </div>
                        </div>

                        {review.photos.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {review.photos.map((photo, i) => (
                              <button
                                key={i}
                                className="w-14 h-14 rounded-md overflow-hidden bg-muted border border-border hover:border-kolecta-gold transition-colors"
                                onClick={() => setLightbox({ photos: review.photos, index: i })}
                              >
                                <img src={photo} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New review dialog */}
      {selectedPending && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={(v) => {
            setReviewDialogOpen(v);
            if (!v) setSelectedPending(null);
          }}
          product={selectedPending.product}
          onSubmit={handleNewReview}
        />
      )}

      {/* Edit review dialog */}
      {selectedCompleted && (
        <ReviewDialog
          open={editDialogOpen}
          onOpenChange={(v) => {
            setEditDialogOpen(v);
            if (!v) setSelectedCompleted(null);
          }}
          product={selectedCompleted.product}
          initialData={{
            sellerRating: selectedCompleted.sellerRating,
            sellerComment: selectedCompleted.sellerComment,
            productRating: selectedCompleted.productRating,
            productComment: selectedCompleted.productComment,
            photos: selectedCompleted.photos,
          }}
          onSubmit={handleEditReview}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </Layout>
  );
}

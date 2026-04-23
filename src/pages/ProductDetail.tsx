import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import {
  Heart, ShieldCheck, Star, Gavel, ShoppingCart, Flag,
  ChevronRight, ArrowLeft, MessageSquare, CreditCard,
  AlertTriangle, Loader2, Package,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { cn } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import VerificationBadge from '@/components/VerificationBadge';
import ReportListingDialog from '@/components/ReportListingDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { mockProducts, conditionLabel, formatBRL } from '@/lib/mock-data';
import type { ProductCondition } from '@/lib/mock-data';
import type { Listing } from '@/lib/api';
import { useListing } from '@/hooks/use-api';
import { trackEvent } from '@/lib/analytics';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return ['/placeholder.svg'];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['/placeholder.svg'];
  } catch {
    // Se for uma URL direta (não JSON)
    return raw.startsWith('http') ? [raw] : ['/placeholder.svg'];
  }
}

function buildDetails(listing: Listing): Record<string, string> {
  const details: Record<string, string> = {};
  if (listing.brand) details['Marca'] = listing.brand;
  if (listing.line) details['Linha'] = listing.line;
  if (listing.scale) details['Escala'] = listing.scale;
  if (listing.year) details['Ano'] = listing.year;
  if (listing.edition) details['Edição'] = listing.edition;
  return details;
}

// ── Adapter: Listing → CartItem Product shape ─────────────────────────────────
// Converte o Listing real do backend para o shape que o CartContext espera

function listingToCartProduct(listing: Listing) {
  return {
    id: listing.id,                               // ← ID real, UUID do Turso
    title: listing.title,
    slug: listing.id,                             // slug não existe no DB atual
    images: parseImages(listing.images),
    category: '',
    categorySlug: listing.categoryId ?? '',
    condition: (listing.condition as ProductCondition) ?? 'novo',
    type: listing.type,
    price: listing.priceInCents != null ? listing.priceInCents / 100 : undefined,
    seller: {
      id: listing.sellerId,
      name: listing.sellerName ?? 'Vendedor Kolecta',
      slug: listing.sellerId,
      avatar: '/placeholder.svg',
      verified: false,
      rating: 0,
      totalSales: 0,
      location: '',
      since: '',
    },
    description: listing.description ?? '',
    details: buildDetails(listing),
    featured: false,
    tags: [],
    status: listing.status as any,
    createdAt: listing.createdAt,
  };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProductDetailSkeleton() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem, openCart } = useCart();

  // ── Dados reais do backend ───────────────────────────────────────────────
  const { data: listing, isLoading, isError } = useListing(id);

  const [isFavorite, setIsFavorite] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reported, setReported] = useState(() => {
    if (!id) return false;
    return localStorage.getItem(`report_${id}`) === 'true';
  });

  // Track view quando o listing carregar
  useEffect(() => {
    if (listing) trackEvent('view_product', { id: listing.id, type: listing.type });
  }, [listing]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) return <ProductDetailSkeleton />;

  // ── Erro / Não encontrado ────────────────────────────────────────────────
  if (isError || !listing) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-muted-foreground uppercase">
            Anúncio não encontrado
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Este anúncio pode ter sido removido ou não está mais disponível.
          </p>
          <Button variant="outline-gold" className="mt-6" asChild>
            <Link to="/busca">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à busca
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // ── Dados derivados ──────────────────────────────────────────────────────
  const images = parseImages(listing.images);
  const details = buildDetails(listing);
  const cartProduct = listingToCartProduct(listing);
  const priceInBRL = listing.priceInCents != null ? listing.priceInCents / 100 : null;
  const isAvailable = listing.status === 'active';

  // Produtos similares: fallback para mock (sem listagem real por categoria ainda)
  const similar = mockProducts.slice(0, 4);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/busca" className="hover:text-foreground transition-colors">Busca</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[200px]">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Imagem principal */}
          <div className="aspect-square rounded-lg overflow-hidden bg-kolecta-dark border border-border">
            <img
              src={images[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
            />
          </div>

          {/* Info */}
          <div>
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-secondary text-secondary-foreground text-[10px] font-heading uppercase tracking-wider">
                {conditionLabel(listing.condition as ProductCondition)}
              </Badge>
              {listing.type === 'auction' && (
                <Badge className="bg-accent text-accent-foreground text-[10px] font-heading uppercase tracking-wider">
                  Modo Lance
                </Badge>
              )}
              {!isAvailable && (
                <Badge variant="destructive" className="text-[10px] font-heading uppercase tracking-wider">
                  {listing.status === 'sold' ? 'Vendido' : 'Indisponível'}
                </Badge>
              )}
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold italic uppercase leading-tight mb-4">
              {listing.title}
            </h1>

            {/* Preço / Ação */}
            <div className="p-5 rounded-lg border border-border bg-card mb-6">
              {listing.type === 'direct' ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Preço</span>
                    <div className="font-heading text-4xl font-extrabold text-foreground mt-1">
                      {priceInBRL != null ? formatBRL(priceInBRL) : 'A consultar'}
                    </div>
                  </div>

                  {!isAvailable && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>Este anúncio não está mais disponível para compra.</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="kolecta"
                      size="lg"
                      className="flex-1 text-base"
                      disabled={!isAvailable}
                      onClick={() => {
                        trackEvent('buy_now_click', { productId: listing.id });
                        addItem(cartProduct, 1);
                        openCart();
                      }}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Comprar Agora
                    </Button>

                    <Button
                      variant="ghost-light"
                      size="lg"
                      onClick={() => {
                        setIsFavorite(prev => !prev);
                        trackEvent(
                          isFavorite ? 'remove_from_favorites' : 'add_to_favorites',
                          { productId: listing.id },
                        );
                      }}
                    >
                      <Heart className={cn('h-5 w-5', isFavorite && 'fill-kolecta-red text-kolecta-red')} />
                    </Button>
                  </div>
                </div>
              ) : (
                // Leilão — placeholder para MVP (leilões ainda não têm endpoint real)
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Lance inicial</span>
                    <div className="font-heading text-4xl font-extrabold text-accent mt-1">
                      {priceInBRL != null ? formatBRL(priceInBRL) : 'A definir'}
                    </div>
                  </div>
                  <div className="rounded-md bg-accent/5 border border-accent/20 p-3 text-xs text-accent flex items-start gap-2">
                    <Gavel className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>Sistema de lances em desenvolvimento. Em breve.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Seller (com fallback para MVP) */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card mb-6">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-heading font-bold uppercase">
                {(listing.sellerName || 'V')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 p-1">
                  <span className="text-sm font-medium text-foreground truncate">{listing.sellerName ?? 'Vendedor Kolecta'}</span>
                  <VerificationBadge verified={true} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  Transação protegida pelo Kolecta
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>

            {/* Denúncia */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {reported ? (
                <span className="flex items-center gap-1 cursor-not-allowed">
                  <Flag className="h-3 w-3" /> Denunciado
                </span>
              ) : (
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => {
                    trackEvent('report_listing', { productId: listing.id });
                    setReportDialogOpen(true);
                  }}
                >
                  <Flag className="h-3 w-3" /> Denunciar
                </button>
              )}
            </div>

            <ReportListingDialog
              listingId={listing.id}
              listingTitle={listing.title}
              sellerId={listing.sellerId}
              open={reportDialogOpen}
              onOpenChange={setReportDialogOpen}
              onReported={() => setReported(true)}
            />
          </div>
        </div>

        {/* Tabs — Descrição + Detalhes */}
        <div className="mt-10">
          <Tabs defaultValue="description">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="description" className="font-heading uppercase tracking-wider text-xs">
                Descrição
              </TabsTrigger>
              <TabsTrigger value="details" className="font-heading uppercase tracking-wider text-xs">
                Detalhes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-4">
              <div className="p-6 rounded-lg border border-border bg-card">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {listing.description ?? 'Sem descrição disponível.'}
                </p>
              </div>
            </TabsContent>
            <TabsContent value="details" className="mt-4">
              <div className="p-6 rounded-lg border border-border bg-card">
                {Object.keys(details).length > 0 ? (
                  <dl className="grid grid-cols-2 gap-3">
                    {Object.entries(details).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">{key}</dt>
                        <dd className="text-sm text-foreground mt-0.5">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem detalhes técnicos disponíveis.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Similares — mock por enquanto */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="font-heading text-xl font-extrabold italic uppercase mb-6">
              Explore Mais
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

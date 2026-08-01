import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Star, MessageSquare, Heart, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FounderBadgeFor } from '@/components/FounderBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { onlyPublic } from '@/lib/listing-visibility';

// F32: parse defensivo — `images` pode vir como JSON de array, URL crua ou nulo.
// Nunca lança (JSON.parse solto derrubava a página do vendedor).
function safeParseImages(raw: string | null | undefined): string[] {
  if (!raw) return ['/placeholder.svg'];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['/placeholder.svg'];
  } catch {
    return raw.startsWith('http') ? [raw] : ['/placeholder.svg'];
  }
}

function CategoryIcon({ slug, size = 32 }: { slug: string; size?: number }) {
  const fill = '#FFD700';
  switch (slug) {
    case 'miniaturas-diecast':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="5" y="9" width="22" height="14" rx="5" fill={fill} />
          <rect x="9" y="12" width="14" height="8" rx="2.5" fill="#0f0f0f" opacity="0.3" />
          <rect x="1" y="10" width="5" height="5" rx="2" fill={fill} />
          <rect x="1" y="17" width="5" height="5" rx="2" fill={fill} />
          <rect x="26" y="10" width="5" height="5" rx="2" fill={fill} />
          <rect x="26" y="17" width="5" height="5" rx="2" fill={fill} />
        </svg>
      );
    case 'cards-colecionaveis':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="6" y="3" width="20" height="26" rx="3" fill={fill} />
          <polygon points="16,9 17.8,14 23,14 18.9,17 20.5,22 16,19 11.5,22 13.1,17 9,14 14.2,14" fill="#0f0f0f" opacity="0.3" />
        </svg>
      );
    case 'action-figures':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M8 13 L6 29 L16 24 L26 29 L24 13 Z" fill={fill} opacity="0.55" />
          <circle cx="16" cy="8" r="5" fill={fill} />
          <rect x="11" y="13" width="10" height="10" rx="2" fill={fill} />
          <rect x="11" y="23" width="4" height="7" rx="2" fill={fill} />
          <rect x="17" y="23" width="4" height="7" rx="2" fill={fill} />
          <rect x="3" y="13" width="8" height="3" rx="1.5" fill={fill} />
          <rect x="21" y="13" width="8" height="3" rx="1.5" fill={fill} />
        </svg>
      );
    case 'funko-pop':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="11" r="9" fill={fill} />
          <rect x="10" y="19" width="12" height="11" rx="3" fill={fill} />
          <circle cx="13" cy="11" r="1.5" fill="#0f0f0f" opacity="0.4" />
          <circle cx="19" cy="11" r="1.5" fill="#0f0f0f" opacity="0.4" />
        </svg>
      );
    case 'mangas-hqs':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 4 L4 7 L4 28 L16 25 Z" fill={fill} />
          <path d="M16 4 L28 7 L28 28 L16 25 Z" fill={fill} opacity="0.65" />
          <line x1="7" y1="12" x2="15" y2="11" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="7" y1="15" x2="15" y2="14" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="7" y1="18" x2="15" y2="17" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="11" x2="25" y2="12" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="14" x2="25" y2="15" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="17" x2="25" y2="18" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
        </svg>
      );
    default:
      return <span style={{ fontSize: size * 0.75 }}>📦</span>;
  }
}

// ─── Components ──────────────────────────────────────────

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${iconClass} ${s <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="bg-gradient-card">
      <CardContent className="p-4 text-center">
        <p className="font-heading text-xl font-bold text-primary">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <Skeleton className="h-24 w-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <LoadingSkeleton count={6} />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function SellerProfilePage() {
  const { slug } = useParams<{ slug: string }>(); // slug here represents the user ID
  const id = slug as string;

  const [following, setFollowing] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  
  // Listing filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Queries
  const { data: categories } = useCategories();
  const { data: seller, isLoading: loadingProfile } = useQuery({
    queryKey: ['sellerProfile', id],
    queryFn: () => api.sellers.getProfile(id),
    enabled: !!id,
  });

  const { data: listingsResponse, isLoading: loadingListings } = useQuery({
    queryKey: ['sellerListings', id, categoryFilter],
    // Sem teto: traz TODOS os anúncios do vendedor, página a página. Era 50, e
    // loja grande escondia o resto (RODA RARA tem 75 no ar), então o vendedor
    // via menos anúncio no próprio perfil do que aprovou. Agora não há limite.
    queryFn: () => api.sellers.getAllListings(id, {
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    }),
    enabled: !!id,
  });

  const { data: reviewsResponse, isLoading: loadingReviews } = useQuery({
    queryKey: ['sellerReviews', id],
    queryFn: () => api.sellers.getReviews(id, { limit: 50 }),
    enabled: !!id,
  });

  if (loadingProfile || !seller) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <ProfileSkeleton />
        </div>
      </Layout>
    );
  }

  // Só anúncio aprovado vai à vitrine. A API devolve qualquer status, e sem
  // este filtro o perfil exibia item ainda em moderação: de fora parecia que o
  // anúncio tinha sido aprovado sozinho, quando só estava aparecendo cedo.
  // `getAllListings` devolve o array direto (já juntou as páginas), não { data }.
  // O que o público vê, antes da busca e da ordenação. O contador da aba sai
  // daqui e não de `totalActiveListings`: aquele conta `status='active'` no
  // banco, sem saber de leilão pausado ou encerrado, e a aba anunciava "14"
  // sobre uma grade de 1 card. Contando a mesma lista que a grade renderiza,
  // os dois não têm como divergir.
  const publicProducts = onlyPublic(listingsResponse ?? []);

  let filteredProducts = publicProducts;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter((p) => p.title.toLowerCase().includes(q));
  }
  if (sortBy === 'price-asc') filteredProducts.sort((a, b) => (a.priceInCents || 0) - (b.priceInCents || 0));
  if (sortBy === 'price-desc') filteredProducts.sort((a, b) => (b.priceInCents || 0) - (a.priceInCents || 0));

  const reviews = reviewsResponse?.data || [];
  const initials = seller.name ? seller.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'V';
  const description = seller.bio || 'Vendedor na plataforma Kolecta.';
  const memberSince = new Date(seller.createdAt).getFullYear();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Avatar className="h-24 w-24 border-2 border-primary shrink-0">
            {seller.avatarUrl && <AvatarImage src={seller.avatarUrl} alt={seller.name || 'Vendedor'} />}
            <AvatarFallback className="bg-primary/10 text-primary font-heading text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-heading text-3xl font-extrabold italic uppercase">{seller.name || 'Vendedor Kolecta'}</h1>
              {/* O selo aparecia na página do anúncio mas não aqui, que é a
                  vitrine da loja: quem clicava no nome do vendedor para ver
                  quem ele é perdia justamente a informação. */}
              <FounderBadgeFor userId={slug} />
              {seller.isVerified && (
                <Badge className="bg-primary/10 text-primary border-primary/30">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                {seller.averageRating} ({seller.totalReviews} avaliações)
              </span>
              <span>•</span>
              <span>{seller.totalSales} vendas</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Brasil
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3">Membro desde {memberSince}</p>

            {/* Description */}
            <p className={`text-sm text-muted-foreground ${!showFullDesc ? 'line-clamp-3' : ''}`}>
              {description}
            </p>
            {description.length > 150 && (
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-xs text-primary hover:underline mt-1"
              >
                {showFullDesc ? 'Ver menos' : 'Ver mais'}
              </button>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="kolecta" size="sm" asChild>
                {/* For messaging, passing the id as a query param so the message component picks it up */}
                <Link to={`/conta/mensagens?seller=${seller.id}`}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  Enviar mensagem
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFollowing(!following)}
                className={following ? 'text-primary' : ''}
              >
                <Heart className={`h-3.5 w-3.5 ${following ? 'fill-primary' : ''}`} />
                {following ? 'Seguindo' : 'Seguir loja'}
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Stats ─── */}
        {/* B4/D8: "Tempo médio de envio" e "Taxa de resposta" eram valores fixos
            no código (1-2 dias / 98%). Removidos até haver métrica real. */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Vendas concluídas" value={seller.totalSales} />
          <StatCard label="Avaliação média" value={`${seller.averageRating}★`} />
        </div>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings">
              Anúncios
              {/* Enquanto carrega não há contagem confiável, e um "0" piscando
                  parece loja vazia. O número entra junto com os cards. */}
              {!loadingListings && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {publicProducts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviews">
              Avaliações
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {seller.totalReviews}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="about">Sobre</TabsTrigger>
          </TabsList>

          {/* ── Listings Tab ── */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos anúncios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="price-asc">Menor preço</SelectItem>
                  <SelectItem value="price-desc">Maior preço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingListings ? (
              <LoadingSkeleton count={6} />
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  // Mapeia o Listing para o Product esperado pelo ProductCard (gambiarra do frontend MVP)
                  const mappedProduct = {
                    ...product,
                    slug: product.id,
                    price: product.priceInCents ? product.priceInCents / 100 : undefined,
                    categorySlug: product.categoryId ?? '',
                    // F32: JSON.parse sem proteção derrubava a página inteira quando
                    // `images` não era JSON válido (ex.: uma URL crua).
                    images: safeParseImages(product.images),
                    // F32: sem id/slug o card apontava para "/vendedor/undefined".
                    seller: { name: seller.name, slug: slug, id: slug, verified: !!seller.isVerified },
                  } as unknown as import('@/lib/mock-data').Product;
                  return <ProductCard key={product.id} product={mappedProduct} />;
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum anúncio encontrado</p>
              </div>
            )}
          </TabsContent>

          {/* ── Reviews Tab ── */}
          <TabsContent value="reviews" className="space-y-6">
            <Card className="bg-gradient-card">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                  <div className="text-center">
                    <p className="font-heading text-5xl font-bold text-primary">{seller.averageRating}</p>
                    <StarDisplay rating={Math.round(seller.averageRating)} size="md" />
                    <p className="text-xs text-muted-foreground mt-1">{seller.totalReviews} avaliações</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loadingReviews ? (
              <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const authorInitials = review.author.name ? review.author.name.split(' ').map((w: string) => w[0]).join('') : 'U';
                  return (
                    <Card key={review.id} className="bg-gradient-card">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-heading">
                              {authorInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-heading font-semibold text-sm">{review.author.name || 'Usuário'}</span>
                              <StarDisplay rating={review.rating} />
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-foreground/80 mb-1.5">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma avaliação recebida ainda.</p>
              </div>
            )}
          </TabsContent>

          {/* ── About Tab ── */}
          <TabsContent value="about" className="space-y-6">
            <Card className="bg-gradient-card">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-heading text-lg font-bold mb-2">Sobre a loja</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-heading text-lg font-bold mb-3">Políticas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-heading font-semibold mb-1">Prazo de envio</p>
                      <p className="text-muted-foreground">1 a 2 dias úteis após confirmação do pagamento</p>
                    </div>
                    <div>
                      <p className="font-heading font-semibold mb-1">Política de troca</p>
                      <p className="text-muted-foreground">Aceita devolução em até 7 dias se item diferente do anunciado</p>
                    </div>
                    <div>
                      <p className="font-heading font-semibold mb-1">Pagamento</p>
                      <p className="text-muted-foreground">PIX e cartão de crédito via plataforma</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-heading text-lg font-bold mb-2">Categorias</h3>
                  <div className="flex flex-wrap gap-2">
                    {(categories ?? []).slice(0, 4).map((c) => (
                      <Badge key={c.id} variant="secondary" className="flex items-center gap-1">
                        <CategoryIcon slug={c.slug} size={14} />
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

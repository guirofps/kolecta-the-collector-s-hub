import { useState } from 'react';
import { CategoryIcon } from '@/components/CategoryIcon';
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
import { onlyPublicNaLoja } from '@/lib/listing-visibility';
import { toProduct } from '@/lib/home-sections';
import { ESCALAS_MINIATURA, normalizarEscala } from '@/lib/marcas';

// O parse defensivo de `images` (F32) agora vem de `parseImages`, dentro de
// `toProduct`: mesmo comportamento — JSON de array, URL crua ou nulo, sem nunca
// lançar. Havia uma cópia local idêntica aqui.

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
  const [scaleFilter, setScaleFilter] = useState('all');
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

  // O que a loja mostra, antes da busca e da ordenação.
  //
  // Só anúncio aprovado entra: a API devolve qualquer status, e sem filtro o
  // perfil exibia item ainda em moderação — de fora parecia que o anúncio tinha
  // sido aprovado sozinho. A loja é mais larga que a vitrine num ponto: mostra
  // também o leilão pausado, com selo (ver `onlyPublicNaLoja`).
  //
  // O contador da aba sai daqui, e não de `totalActiveListings` — aquele conta
  // `status='active'` no banco, sem saber de leilão pausado ou encerrado, e a
  // aba anunciava "14" sobre uma grade de 1 card. Sendo a mesma lista que a
  // grade renderiza, os dois não têm como divergir.
  //
  // `getAllListings` devolve o array direto (já juntou as páginas), não { data }.
  const publicProducts = onlyPublicNaLoja(listingsResponse ?? []);

  // Escalas realmente presentes na loja (miniatura), normalizadas para não
  // duplicar "1/64" e "1:64". Só assim o filtro de escala aparece quando faz
  // sentido — vendedor só de cards não vê filtro de escala.
  const escalasPresentes = ESCALAS_MINIATURA.filter((e) =>
    publicProducts.some((p) => normalizarEscala(p.scale) === e),
  );

  let filteredProducts = publicProducts;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter((p) => p.title.toLowerCase().includes(q));
  }
  if (scaleFilter !== 'all') {
    filteredProducts = filteredProducts.filter((p) => normalizarEscala(p.scale) === scaleFilter);
  }
  // Cópia antes de ordenar por preço: `.sort` muta, e sem a cópia a ordenação
  // do vendedor (posição, que vem do backend) seria embaralhada no próprio cache.
  filteredProducts = [...filteredProducts];
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
              {/* Escala só aparece quando a loja tem miniatura com escala. Quem
                  vende de várias escalas junto (o pedido do vendedor) deixa o
                  comprador achar a que quer sem sair da loja. */}
              {escalasPresentes.length > 0 && (
                <Select value={scaleFilter} onValueChange={setScaleFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Escala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas escalas</SelectItem>
                    {escalasPresentes.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                  // `toProduct` é o mesmo conversor da home e da categoria.
                  //
                  // Aqui havia um mapeamento próprio que não convertia os campos
                  // do leilão: `startingBidInCents` nunca virava `startingBid`,
                  // então o card caía no `|| 0` e anunciava "R$ 0,00". Passava
                  // despercebido porque leilão nenhum chegava a aparecer nesta
                  // tela — o endpoint não mandava os dados do leilão.
                  const mapped = {
                    ...toProduct(product),
                    // O perfil sabe o nome e o selo da loja; o conversor genérico não.
                    // F32: sem id/slug o card apontava para "/vendedor/undefined".
                    seller: { name: seller.name, slug: slug, id: slug, verified: !!seller.isVerified },
                  } as unknown as import('@/lib/mock-data').Product;
                  return <ProductCard key={product.id} product={mapped} />;
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

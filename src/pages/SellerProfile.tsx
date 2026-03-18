import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Star, MessageSquare, Heart, Search } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Product, mockSellers, mockProducts, mockCategories } from '@/lib/mock-data';

// ─── Mock Data ───────────────────────────────────────────

interface SellerReview {
  id: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  date: string;
  comment: string;
  productTitle: string;
  productId: string;
}

const mockSellerReviews: SellerReview[] = [
  { id: 'sr1', buyerName: 'João S.', buyerAvatar: '', rating: 5, date: '2026-03-10', comment: 'Vendedor excelente! Envio rápido e produto exatamente como descrito. Super recomendo!', productTitle: 'Hot Wheels RLC Nissan Skyline GT-R R34', productId: 'p1' },
  { id: 'sr2', buyerName: 'Maria L.', buyerAvatar: '', rating: 4, date: '2026-03-05', comment: 'Produto em ótimo estado, chegou bem embalado. Demorou um pouco pra enviar mas tudo certo.', productTitle: 'Kyosho Nissan Silvia S15', productId: 'p5' },
  { id: 'sr3', buyerName: 'Carlos R.', buyerAvatar: '', rating: 5, date: '2026-02-28', comment: 'Peça rara que eu procurava há meses. Vendedor atencioso e honesto na descrição.', productTitle: 'Inno64 Honda Civic EF9 Kanjo', productId: 'p11' },
  { id: 'sr4', buyerName: 'Ana P.', buyerAvatar: '', rating: 3, date: '2026-02-20', comment: 'Produto OK mas a embalagem poderia ser melhor. Chegou com a caixa levemente amassada.', productTitle: 'Tomica Limited Vintage Neo AE86', productId: 'p2' },
];

const ratingDistribution = [
  { stars: 5, count: 210 },
  { stars: 4, count: 85 },
  { stars: 3, count: 30 },
  { stars: 2, count: 12 },
  { stars: 1, count: 5 },
];

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

function StatCard({ label, value }: { label: string; value: string }) {
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
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  {/* API: GET /api/sellers/:slug
      Retorna: { seller: Seller, stats: SellerStats } */}
  const seller = mockSellers.find((s) => s.slug === slug) || mockSellers[0];
  const sellerProducts = mockProducts.filter((p) => p.seller.id === seller.id);

  const totalReviews = ratingDistribution.reduce((sum, r) => sum + r.count, 0);
  const maxCount = Math.max(...ratingDistribution.map((r) => r.count));

  const description =
    'Loja especializada em miniaturas JDM e colecionáveis premium. Trabalhamos com as melhores marcas do mercado como Hot Wheels, Tomica, Mini GT, Inno64 e Kyosho. Todos os nossos produtos passam por inspeção rigorosa de qualidade antes do envio. Embalamos com carinho e cuidado para garantir que sua peça chegue perfeita.';

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filtering & sorting
  let filteredProducts = sellerProducts;
  if (categoryFilter !== 'all') {
    filteredProducts = filteredProducts.filter((p) => p.categorySlug === categoryFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter((p) => p.title.toLowerCase().includes(q));
  }
  if (sortBy === 'price-asc') filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  if (sortBy === 'price-desc') filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));

  const initials = seller.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <ProfileSkeleton />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Avatar className="h-24 w-24 border-2 border-primary shrink-0">
            <AvatarImage src={seller.avatar !== '/placeholder.svg' ? seller.avatar : undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-heading text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-heading text-3xl font-extrabold italic uppercase">{seller.name}</h1>
              {seller.verified && (
                <Badge className="bg-primary/10 text-primary border-primary/30">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                {seller.rating} ({totalReviews} avaliações)
              </span>
              <span>•</span>
              <span>{seller.totalSales} vendas</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {seller.location}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3">Membro desde {seller.since}</p>

            {/* Description */}
            <p className={`text-sm text-muted-foreground ${!showFullDesc ? 'line-clamp-3' : ''}`}>
              {description}
            </p>
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="text-xs text-primary hover:underline mt-1"
            >
              {showFullDesc ? 'Ver menos' : 'Ver mais'}
            </button>

            <div className="flex gap-2 mt-4">
              <Button variant="kolecta" size="sm" asChild>
                <Link to={`/conta/mensagens?seller=${seller.slug}`}>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Vendas concluídas" value={String(seller.totalSales)} />
          <StatCard label="Avaliação média" value={`${seller.rating}★`} />
          <StatCard label="Tempo médio de envio" value="1-2 dias" />
          <StatCard label="Taxa de resposta" value="98%" />
        </div>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings">
              Anúncios
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {sellerProducts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="reviews">
              Avaliações
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {totalReviews}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="about">Sobre</TabsTrigger>
          </TabsList>

          {/* ── Listings Tab ── */}
          <TabsContent value="listings" className="space-y-4">
            {/* API: GET /api/sellers/:slug/listings?category=&sort=&search=&page= */}
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
                  {mockCategories.map((c) => (
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

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
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
            {/* API: GET /api/sellers/:slug/reviews?page= */}

            {/* Rating summary */}
            <Card className="bg-gradient-card">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="text-center">
                    <p className="font-heading text-5xl font-bold text-primary">{seller.rating}</p>
                    <StarDisplay rating={Math.round(seller.rating)} size="md" />
                    <p className="text-xs text-muted-foreground mt-1">{totalReviews} avaliações</p>
                  </div>
                  <div className="flex-1 space-y-1.5 w-full">
                    {ratingDistribution.map((r) => {
                      const pct = maxCount > 0 ? (r.count / maxCount) * 100 : 0;
                      return (
                        <div key={r.stars} className="flex items-center gap-2 text-sm">
                          <span className="w-8 text-right text-muted-foreground">{r.stars}★</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-10 text-xs text-muted-foreground">{r.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review list */}
            <div className="space-y-4">
              {mockSellerReviews.map((review) => (
                <Card key={review.id} className="bg-gradient-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-heading">
                          {review.buyerName.split(' ').map((w) => w[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-heading font-semibold text-sm">{review.buyerName}</span>
                          <StarDisplay rating={review.rating} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 mb-1.5">{review.comment}</p>
                        <Link
                          to={`/produto/${review.productId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {review.productTitle}
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                      <p className="text-muted-foreground">PIX, cartão de crédito e boleto via plataforma</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-heading text-lg font-bold mb-2">Categorias</h3>
                  <div className="flex flex-wrap gap-2">
                    {mockCategories.slice(0, 4).map((c) => (
                      <Badge key={c.id} variant="secondary">
                        {c.icon} {c.name}
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

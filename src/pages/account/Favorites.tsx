import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useCart } from '@/contexts/CartContext';
import { Product, mockProducts, mockSellers, formatBRL, conditionLabel } from '@/lib/mock-data';

// ─── Mock Favorites ──────────────────────────────────────

interface FavoriteItem {
  product: Product;
  savedAt: string;
  available: boolean;
}

const unavailableProduct: Product = {
  id: 'p-unavail',
  title: 'Tomica Premium – Honda NSX Type R (Esgotado)',
  slug: 'tomica-nsx-type-r',
  images: ['/placeholder.svg'],
  category: 'Carrinhos & Miniaturas',
  categorySlug: 'carrinhos-miniaturas',
  condition: 'lacrado',
  type: 'direct',
  price: 320,
  seller: mockSellers[1],
  description: 'Produto esgotado.',
  details: { Marca: 'Tomica', Escala: '1:64' },
  featured: false,
  tags: ['NSX', 'Honda'],
  status: 'vendido',
  createdAt: '2026-01-05T10:00:00Z',
};

const mockFavorites: FavoriteItem[] = [
  { product: mockProducts[1], savedAt: '2026-03-15T10:00:00Z', available: true },  // p2 direct - Carrinhos
  { product: mockProducts[6], savedAt: '2026-03-14T08:00:00Z', available: true },  // p7 direct - Funko Pop
  { product: mockProducts[0], savedAt: '2026-03-13T12:00:00Z', available: true },  // p1 auction - Carrinhos
  { product: mockProducts[4], savedAt: '2026-03-12T09:00:00Z', available: true },  // p5 direct - Carrinhos
  { product: unavailableProduct, savedAt: '2026-03-10T14:00:00Z', available: false },
  { product: mockProducts[7], savedAt: '2026-03-08T16:00:00Z', available: true },  // p8 direct - Carrinhos
];

{/* API: GET /api/favorites — lista favoritos do usuário
    DELETE /api/favorites/:productId — remove dos favoritos
    Ordenação via query param: ?sort=price_asc|price_desc|recent|name */}

// ─── Component ───────────────────────────────────────────

type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'name';

export default function FavoritesPage() {
  const { addItem } = useCart();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('recent');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [removeTarget, setRemoveTarget] = useState<FavoriteItem | null>(null);

  // Simulate loading
  useEffect(() => {
    const t = setTimeout(() => {
      setFavorites(mockFavorites);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Unique categories from favorites
  const categories = useMemo(() => {
    const cats = Array.from(new Set(favorites.map(f => f.product.category)));
    return cats;
  }, [favorites]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = categoryFilter === 'all'
      ? [...favorites]
      : favorites.filter(f => f.product.category === categoryFilter);

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => (a.product.price ?? a.product.currentBid ?? 0) - (b.product.price ?? b.product.currentBid ?? 0));
        break;
      case 'price_desc':
        list.sort((a, b) => (b.product.price ?? b.product.currentBid ?? 0) - (a.product.price ?? a.product.currentBid ?? 0));
        break;
      case 'name':
        list.sort((a, b) => a.product.title.localeCompare(b.product.title));
        break;
      default: // recent
        list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }
    return list;
  }, [favorites, categoryFilter, sort]);

  function handleRemove() {
    if (!removeTarget) return;
    setFavorites(prev => prev.filter(f => f.product.id !== removeTarget.product.id));
    setRemoveTarget(null);
  }

  return (
    <Layout>
      <div className="container max-w-6xl py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-foreground">
              Favoritos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {favorites.length} {favorites.length === 1 ? 'item salvo' : 'itens salvos'}
            </p>
          </div>

          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="price_asc">Menor preço</SelectItem>
              <SelectItem value="price_desc">Maior preço</SelectItem>
              <SelectItem value="name">Nome A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Category pills */}
        {!loading && favorites.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-heading font-bold uppercase tracking-wider border transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-kolecta-gold/10 border-kolecta-gold text-kolecta-gold'
                  : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-heading font-bold uppercase tracking-wider border transition-colors ${
                  categoryFilter === cat
                    ? 'bg-kolecta-gold/10 border-kolecta-gold text-kolecta-gold'
                    : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSkeleton variant="card" count={6} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />}

        {/* Empty states */}
        {!loading && favorites.length === 0 && (
          <EmptyState
            icon={Heart}
            title="Você ainda não salvou nenhum item"
            description="Explore os produtos e salve os seus favoritos."
            action={
              <Button variant="kolecta" asChild>
                <Link to="/">Explorar produtos</Link>
              </Button>
            }
          />
        )}

        {!loading && favorites.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon={Heart}
            title="Nenhum favorito nessa categoria"
            action={
              <Button variant="ghost" onClick={() => setCategoryFilter('all')}>
                Ver todos os favoritos
              </Button>
            }
          />
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(fav => {
              const { product, available } = fav;
              const isAuction = product.type === 'auction';

              return (
                <Card key={product.id} className="relative overflow-hidden bg-gradient-card border-border group">
                  {/* Unavailable overlay */}
                  {!available && (
                    <div className="absolute inset-0 z-10 bg-background/60 flex items-center justify-center">
                      <Badge className="bg-muted text-muted-foreground text-sm">Indisponível</Badge>
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-kolecta-dark">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Category badge */}
                    <Badge className="absolute top-2 left-2 bg-background/70 backdrop-blur-sm text-foreground text-[10px] font-heading uppercase tracking-wider">
                      {product.category}
                    </Badge>

                    {/* Remove favorite button */}
                    <button
                      onClick={() => setRemoveTarget(fav)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm text-kolecta-red hover:bg-background/80 transition-all"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <Link to={`/produto/${product.id}`}>
                      <h3 className="font-heading text-sm font-bold text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                    </Link>

                    <Link
                      to={`/vendedor/${product.seller.slug}`}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors block"
                    >
                      {product.seller.name}
                    </Link>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-heading uppercase">
                        {conditionLabel(product.condition)}
                      </Badge>
                      {isAuction && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] font-heading uppercase">
                          Modo Lance
                        </Badge>
                      )}
                    </div>

                    <div>
                      {isAuction ? (
                        <div className="flex items-baseline gap-2">
                          <span className="font-heading text-lg font-bold text-kolecta-gold">
                            {formatBRL(product.currentBid || product.startingBid || 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            lance atual
                          </span>
                        </div>
                      ) : (
                        <span className="font-heading text-lg font-bold text-kolecta-gold">
                          {formatBRL(product.price || 0)}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="kolecta"
                        size="sm"
                        className="flex-1 text-xs glow-primary"
                        disabled={!available}
                        asChild={available}
                      >
                        {available ? (
                          <Link to={`/produto/${product.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            Ver produto
                          </Link>
                        ) : (
                          <span>
                            <Eye className="h-3.5 w-3.5" />
                            Ver produto
                          </span>
                        )}
                      </Button>

                      {!isAuction && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={!available}
                          onClick={() => available && addItem(product)}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Remover dos favoritos?</DialogTitle>
            <DialogDescription>
              {removeTarget && (
                <>O item <strong>{removeTarget.product.title}</strong> será removido dos seus favoritos.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemove}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

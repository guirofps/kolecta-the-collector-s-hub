import { useMemo, useState } from 'react';
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
import { useFavorites } from '@/hooks/use-api';
import type { Favorite } from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'name';

// ── Component ─────────────────────────────────────────────

export default function FavoritesPage() {
  const { addItem } = useCart();
  const { query, removeMutation } = useFavorites();
  const { data: favorites = [], isLoading } = query;

  const [sort, setSort] = useState<SortOption>('recent');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [removeTarget, setRemoveTarget] = useState<Favorite | null>(null);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(favorites.map(f => f.listing?.title?.split(' ')[0] ?? 'Outros')));
    return cats;
  }, [favorites]);

  const filtered = useMemo(() => {
    const list = [...favorites];

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => (a.listing?.priceInCents ?? 0) - (b.listing?.priceInCents ?? 0));
        break;
      case 'price_desc':
        list.sort((a, b) => (b.listing?.priceInCents ?? 0) - (a.listing?.priceInCents ?? 0));
        break;
      case 'name':
        list.sort((a, b) => (a.listing?.title ?? '').localeCompare(b.listing?.title ?? ''));
        break;
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [favorites, sort]);

  function handleRemove() {
    if (!removeTarget) return;
    removeMutation.mutate(removeTarget.listingId);
    setRemoveTarget(null);
  }

  function parseImages(raw: string | null | undefined): string[] {
    if (!raw) return ['/placeholder.svg'];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['/placeholder.svg'];
    } catch {
      return raw.startsWith('http') ? [raw] : ['/placeholder.svg'];
    }
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

        {/* Loading */}
        {isLoading && <LoadingSkeleton variant="card" count={6} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />}

        {/* Empty states */}
        {!isLoading && favorites.length === 0 && (
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

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(fav => {
              const listing = fav.listing;
              if (!listing) return null;
              const available = listing.status === 'aprovado';
              const isAuction = listing.type === 'auction';
              const images = parseImages(listing.images);

              return (
                <Card key={fav.id} className="relative overflow-hidden bg-gradient-card border-border group">
                  {/* Unavailable overlay */}
                  {!available && (
                    <div className="absolute inset-0 z-10 bg-background/60 flex items-center justify-center">
                      <Badge className="bg-muted text-muted-foreground text-sm">Indisponível</Badge>
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-kolecta-dark">
                    <img
                      src={images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

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
                    <Link to={`/produto/${listing.id}`}>
                      <h3 className="font-heading text-sm font-bold text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors">
                        {listing.title}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-heading uppercase">
                        {listing.condition}
                      </Badge>
                      {isAuction && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] font-heading uppercase">
                          Modo Lance
                        </Badge>
                      )}
                    </div>

                    <div>
                      <span className="font-heading text-lg font-bold text-kolecta-gold">
                        {formatBRL(listing.priceInCents)}
                      </span>
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
                          <Link to={`/produto/${listing.id}`}>
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
              {removeTarget?.listing && (
                <>O item <strong>{removeTarget.listing.title}</strong> será removido dos seus favoritos.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removeMutation.isPending}>
              {removeMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

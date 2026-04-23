import { Link } from 'react-router-dom';
import { Heart, Gavel, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AuctionCountdown from '@/components/AuctionCountdown';
import { Product, formatBRL, conditionLabel } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';
import { useFavorites } from '@/hooks/use-api';
import { useAuth } from '@clerk/clerk-react';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className = '' }: ProductCardProps) {
  const isAuction = product.type === 'auction';
  const { isSignedIn } = useAuth();
  const { query: favoritesQuery, toggleMutation } = useFavorites();
  
  const isFavorited = favoritesQuery.data?.some(f => f.listingId === product.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) return; // Poderia abrir modal de login aqui
    toggleMutation.mutate(product.id);
    trackEvent('add_to_favorites', { id: product.id });
  };

  return (
    <div className={`group relative rounded-lg border border-border bg-card overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${className}`}>
      {/* Image */}
      <Link
        to={`/produto/${product.id}`}
        onClick={() => trackEvent('view_product', { id: product.id })}
        className="block relative aspect-square overflow-hidden bg-kolecta-dark"
      >
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {product.featured && (
            <Badge className="bg-primary text-primary-foreground text-[10px] font-heading font-bold uppercase tracking-wider">
              Destaque
            </Badge>
          )}
          {isAuction && (
            <Badge className="bg-accent text-accent-foreground text-[10px] font-heading font-bold uppercase tracking-wider animate-pulse-glow">
              Modo Lance
            </Badge>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-all lg:opacity-0 lg:group-hover:opacity-100 ${
            isFavorited 
              ? 'bg-primary text-primary-foreground opacity-100' 
              : 'bg-background/60 text-foreground/60 hover:text-primary hover:bg-background/80'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
      </Link>

      {/* Info */}
      <div className="p-3">
        {/* Condition + Category */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
            {conditionLabel(product.condition)}
          </span>
          {product.seller.verified && (
            <ShieldCheck className="h-3 w-3 text-primary" />
          )}
        </div>

        {/* Title */}
        <Link to={`/produto/${product.id}`}>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Price / Bid */}
        <div className="mt-2">
          {isAuction ? (
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-heading font-bold text-accent">
                  {formatBRL(product.currentBid || product.startingBid || 0)}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {product.bidsCount} lances
                </span>
              </div>
              {product.auctionEndsAt && (
                <AuctionCountdown endsAt={product.auctionEndsAt} compact />
              )}
            </div>
          ) : (
            <span className="text-lg font-heading font-bold text-foreground">
              {formatBRL(product.price || 0)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3">
          {isAuction ? (
            <Button variant="accent" size="sm" className="w-full text-xs" asChild>
              <Link to={`/produto/${product.id}`}>
                <Gavel className="h-3.5 w-3.5" />
                Dar Lance
              </Link>
            </Button>
          ) : (
            <Button variant="kolecta" size="sm" className="w-full text-xs" asChild>
              <Link to={`/produto/${product.id}`}>
                Comprar
              </Link>
            </Button>
          )}
        </div>

        {/* Seller */}
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <Link
            to={`/vendedor/${product.seller.slug}`}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate block"
          >
            {product.seller.name}
          </Link>
        </div>
      </div>
    </div>
  );
}

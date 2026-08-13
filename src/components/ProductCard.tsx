import { Link } from 'react-router-dom';
import { Heart, Gavel, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AuctionCountdown from '@/components/AuctionCountdown';
import { FounderBadgeFor } from '@/components/FounderBadge';
import { Product, formatBRL, conditionLabel } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';
import { useFavorites } from '@/hooks/use-api';
// Auth pelo contexto do app, não pelo Clerk direto (convenção do CLAUDE.md).
// O `useAuth` do Clerk lança erro fora do ClerkProvider, e como o card aparece
// em toda vitrine, ele derrubava a categoria inteira no ambiente sem chave.
import { useAuth } from '@/contexts/AuthContext';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className = '' }: ProductCardProps) {
  const isAuction = product.type === 'auction';
  // Leilão é disputado em /modo-lance/:auctionId. Mandar para /produto/:id era
  // um beco: a página do anúncio não mostra lance nem tem como dar um. Anúncio
  // de leilão sem `auctionId` (backend antigo) continua caindo no produto.
  const href = isAuction && product.auctionId
    ? `/modo-lance/${product.auctionId}`
    : `/produto/${product.id}`;
  const { isAuthenticated } = useAuth();
  const { query: favoritesQuery, toggleMutation } = useFavorites();
  
  const isFavorited = favoritesQuery.data?.some(f => f.listingId === product.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return; // Poderia abrir modal de login aqui
    toggleMutation.mutate(product.id);
    trackEvent('add_to_favorites', { id: product.id });
  };

  return (
    // `h-full flex flex-col` faz o card ocupar toda a altura da célula do grid.
    // Sem isso, cada card fica com a altura do próprio conteúdo e a linha vira
    // um serrote: título de 2 linhas empurra preço e botão para baixo.
    <div className={`group relative flex h-full flex-col rounded-lg border border-border bg-card overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${className}`}>
      {/* Image */}
      <Link
        to={href}
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
          {/* Pausado troca o selo em vez de somar outro: "Modo Lance" pulsando
              ao lado de "Pausado" convida para um lance que será recusado. */}
          {isAuction && (
            product.auctionPaused ? (
              <Badge variant="secondary" className="text-[10px] font-heading font-bold uppercase tracking-wider">
                Leilão pausado
              </Badge>
            ) : (
              <Badge className="bg-accent text-accent-foreground text-[10px] font-heading font-bold uppercase tracking-wider animate-pulse-glow">
                Modo Lance
              </Badge>
            )
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

      {/* Info — `flex-1` para o miolo esticar e o rodapé colar embaixo */}
      <div className="flex flex-1 flex-col p-3">
        {/* Condition + Category */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
            {conditionLabel(product.condition)}
          </span>
          {product.seller.verified && (
            <ShieldCheck className="h-3 w-3 text-primary" />
          )}
        </div>

        {/* Title — altura de 2 linhas SEMPRE reservada (min-h), mesmo quando o
            título cabe em uma. É o que mantém o preço na mesma linha em todos
            os cards da vitrine. */}
        <Link to={href}>
          <h3 className="min-h-[2.4rem] text-sm font-medium text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors">
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
              {/* O `auctionEndsAt` de um leilão pausado é a sentinela de 2099:
                  a contagem marcaria dezenas de milhares de dias. Troca pelo
                  motivo, que é o que a pessoa precisa saber. */}
              {product.auctionPaused ? (
                <p className="text-[10px] text-muted-foreground">
                  Sem lances no momento — volta com o tempo que faltava.
                </p>
              ) : (
                product.auctionEndsAt && (
                  <AuctionCountdown endsAt={product.auctionEndsAt} compact />
                )
              )}
            </div>
          ) : (
            <span className="text-lg font-heading font-bold text-foreground">
              {formatBRL(product.price || 0)}
            </span>
          )}
        </div>

        {/* Actions — `mt-auto` empurra para o rodapé, então os botões ficam na
            mesma altura mesmo quando o card ao lado tem contagem de lances. */}
        <div className="mt-auto pt-3">
          {isAuction ? (
            <Button variant="accent" size="sm" className="w-full text-xs" asChild>
              <Link to={href}>
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
        {/* Nome do vendedor com o selo de Fundador ao lado, como no modelo da
            página de captação. O selo é uma consulta leve (0,3s) e o cache é por
            usuário: numa vitrine, os mesmos vendedores se repetem em vários
            cards e a consulta acontece uma vez só por vendedor. */}
        {/* `min-h` porque o selo de Fundador é mais alto que o nome sozinho: sem
            isso o rodapé mede 33px em quem tem selo e 28px em quem não tem, e
            numa prateleira lado a lado esses 5px aparecem como card torto. */}
        <div className="mt-2.5 flex min-h-[33px] items-center gap-1.5 border-t border-border pt-2.5">
          <Link
            to={product.seller.storeSlug ? `/${product.seller.storeSlug}` : `/vendedor/${product.seller.slug}`}
            className="min-w-0 truncate text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {product.seller.name}
          </Link>
          <FounderBadgeFor userId={product.seller.id} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

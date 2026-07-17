import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/EmptyState';
import { useMyBids } from '@/hooks/use-api';
import { MyBid } from '@/lib/api';
import { formatBRL } from '@/lib/currency';
import { Gavel, TrendingUp, TrendingDown, Clock, XCircle } from 'lucide-react';

type BidStatus = 'leading' | 'outbid' | 'won_pending' | 'lost';

const statusConfig: Record<BidStatus, { label: string; icon: React.ElementType; color: string }> = {
  leading:     { label: 'Liderando',            icon: TrendingUp,   color: 'text-primary bg-primary/10 border-primary/20' },
  outbid:      { label: 'Você foi superado',     icon: TrendingDown, color: 'text-accent bg-accent/10 border-accent/20' },
  won_pending: { label: 'Aguardando pagamento',  icon: Clock,        color: 'text-primary bg-primary/10 border-primary/20' },
  lost:        { label: 'Perdido',               icon: XCircle,      color: 'text-muted-foreground bg-secondary border-border' },
};


function getImages(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function getBidStatus(bid: MyBid): BidStatus {
  // `findMyBids` retorna apenas o MAIOR lance do usuário por leilão, então
  // se ele bate o lance atual do leilão, este usuário é quem lidera/venceu.
  const isTopBid = bid.currentBidInCents === bid.amountInCents;
  if (bid.auctionStatus === 'active') {
    return isTopBid ? 'leading' : 'outbid';
  }
  if (bid.auctionStatus === 'ended') {
    return isTopBid ? 'won_pending' : 'lost';
  }
  return 'lost';
}

export default function MyBidsPage() {
  const { data: bids = [], isLoading } = useMyBids();
  const [filter, setFilter] = useState<BidStatus | 'all'>('all');

  const enriched = bids.map(b => ({ ...b, bidStatus: getBidStatus(b) }));
  const filtered = filter === 'all' ? enriched : enriched.filter(b => b.bidStatus === filter);

  const counts = {
    leading:     enriched.filter(b => b.bidStatus === 'leading').length,
    outbid:      enriched.filter(b => b.bidStatus === 'outbid').length,
    won_pending: enriched.filter(b => b.bidStatus === 'won_pending').length,
    lost:        enriched.filter(b => b.bidStatus === 'lost').length,
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Gavel className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Meus Lances</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Carregando...' : `${bids.length} leilão${bids.length !== 1 ? 'ões' : ''} com lance`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 'all' as const,         label: 'Todos' },
            { value: 'leading' as const,     label: `Liderando (${counts.leading})` },
            { value: 'outbid' as const,      label: `Superados (${counts.outbid})` },
            { value: 'won_pending' as const, label: `Aguardando (${counts.won_pending})` },
            { value: 'lost' as const,        label: `Perdidos (${counts.lost})` },
          ].map((f) => (
            <Badge
              key={f.value}
              className={`cursor-pointer text-xs ${filter === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Gavel} title="Nenhum lance encontrado" description="Explore o Modo Lance para dar seus primeiros lances." />
        ) : (
          <div className="space-y-3">
            {filtered.map((bid) => {
              const cfg = statusConfig[bid.bidStatus];
              const StatusIcon = cfg.icon;
              const thumb = getImages(bid.images)[0] ?? '/placeholder.svg';
              const currentBid = bid.currentBidInCents ?? bid.amountInCents;

              return (
                <div key={bid.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <Link to={`/modo-lance/${bid.auctionId}`} className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden bg-secondary">
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/modo-lance/${bid.auctionId}`}>
                        <h3 className="text-sm font-medium line-clamp-2 sm:line-clamp-1 hover:text-primary transition-colors">{bid.title}</h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                        <span>Seu lance: <span className="text-foreground font-medium">{formatBRL(bid.amountInCents / 100)}</span></span>
                        <span className="hidden sm:inline">·</span>
                        <span>Maior: <span className="text-foreground font-medium">{formatBRL(currentBid / 100)}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 justify-end">
                    <Badge className={`${cfg.color} border text-xs shrink-0`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                    {(bid.bidStatus === 'outbid' || bid.bidStatus === 'leading') && (
                      <Button variant="accent" size="sm" className="text-xs shrink-0" asChild>
                        <Link to={`/modo-lance/${bid.auctionId}`}>
                          {bid.bidStatus === 'outbid' ? 'Aumentar lance' : 'Ver'}
                        </Link>
                      </Button>
                    )}
                    {bid.bidStatus === 'won_pending' && (
                      <Button variant="kolecta" size="sm" className="text-xs shrink-0" asChild>
                        <Link to={`/modo-lance/${bid.auctionId}`}>Pagar</Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

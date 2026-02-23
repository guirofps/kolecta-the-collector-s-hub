import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import { Gavel, TrendingUp, TrendingDown, Clock, Trophy, XCircle } from 'lucide-react';
import { formatBRL, getAuctionProducts } from '@/lib/mock-data';

type BidStatus = 'leading' | 'outbid' | 'won_pending' | 'lost';

interface UserBid {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  myBid: number;
  currentBid: number;
  status: BidStatus;
  endsAt?: string;
}

const statusConfig: Record<BidStatus, { label: string; icon: React.ElementType; color: string }> = {
  leading: { label: 'Liderando', icon: TrendingUp, color: 'text-primary bg-primary/10 border-primary/20' },
  outbid: { label: 'Você foi superado', icon: TrendingDown, color: 'text-accent bg-accent/10 border-accent/20' },
  won_pending: { label: 'Aguardando pagamento', icon: Clock, color: 'text-primary bg-primary/10 border-primary/20' },
  lost: { label: 'Perdido', icon: XCircle, color: 'text-muted-foreground bg-secondary border-border' },
};

// Mock user bids
const auctions = getAuctionProducts();
const mockUserBids: UserBid[] = [
  { id: 'ub1', productId: 'p1', productTitle: auctions[0]?.title || '', productImage: '/placeholder.svg', myBid: 520, currentBid: 520, status: 'leading', endsAt: auctions[0]?.auctionEndsAt },
  { id: 'ub2', productId: 'p4', productTitle: auctions[1]?.title || '', productImage: '/placeholder.svg', myBid: 350, currentBid: 380, status: 'outbid', endsAt: auctions[1]?.auctionEndsAt },
  { id: 'ub3', productId: 'p9', productTitle: auctions[3]?.title || '', productImage: '/placeholder.svg', myBid: 750, currentBid: 780, status: 'outbid', endsAt: auctions[3]?.auctionEndsAt },
  { id: 'ub4', productId: 'p6', productTitle: auctions[2]?.title || '', productImage: '/placeholder.svg', myBid: 145, currentBid: 145, status: 'leading', endsAt: auctions[2]?.auctionEndsAt },
];

export default function MyBidsPage() {
  const [filter, setFilter] = useState<BidStatus | 'all'>('all');

  const filtered = filter === 'all' ? mockUserBids : mockUserBids.filter((b) => b.status === filter);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Gavel className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Meus Lances</h1>
            <p className="text-sm text-muted-foreground">{mockUserBids.length} lances ativos</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 'all' as const, label: 'Todos' },
            { value: 'leading' as const, label: 'Liderando' },
            { value: 'outbid' as const, label: 'Superados' },
            { value: 'won_pending' as const, label: 'Aguardando' },
            { value: 'lost' as const, label: 'Perdidos' },
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

        {/* Bid list */}
        {filtered.length === 0 ? (
          <EmptyState icon={Gavel} title="Nenhum lance encontrado" description="Explore o Modo Lance para dar seus primeiros lances." />
        ) : (
          <div className="space-y-3">
            {filtered.map((bid) => {
              const cfg = statusConfig[bid.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={bid.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/20 transition-colors">
                  <Link to={`/produto/${bid.productId}`} className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-kolecta-dark">
                    <img src={bid.productImage} alt="" className="w-full h-full object-cover" />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/produto/${bid.productId}`}>
                      <h3 className="text-sm font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">{bid.productTitle}</h3>
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Seu lance: <span className="text-foreground font-medium">{formatBRL(bid.myBid)}</span></span>
                      <span>·</span>
                      <span>Maior: <span className="text-foreground font-medium">{formatBRL(bid.currentBid)}</span></span>
                    </div>
                  </div>

                  <Badge className={`${cfg.color} border text-xs shrink-0`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>

                  {(bid.status === 'outbid' || bid.status === 'leading') && (
                    <Button variant="accent" size="sm" className="text-xs shrink-0" asChild>
                      <Link to={`/produto/${bid.productId}`}>
                        {bid.status === 'outbid' ? 'Aumentar lance' : 'Ver'}
                      </Link>
                    </Button>
                  )}
                  {bid.status === 'won_pending' && (
                    <Button variant="kolecta" size="sm" className="text-xs shrink-0">
                      Pagar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

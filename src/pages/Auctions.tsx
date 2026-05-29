import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuctions } from '@/hooks/use-api';
import { AuctionWithListing } from '@/lib/api';
import { Gavel, SlidersHorizontal, X, ChevronDown, Timer, Clock } from 'lucide-react';

const sortOptions = [
  { value: 'ending_soon', label: 'Terminando em breve' },
  { value: 'price_asc', label: 'Menor lance atual' },
  { value: 'price_desc', label: 'Maior lance atual' },
];

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function getImages(images: string | null): string[] {
  if (!images) return [];
  try { return JSON.parse(images); } catch { return []; }
}

function TimeLeft({ endsAt }: { endsAt: string }) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return <span className="text-xs text-muted-foreground">Encerrado</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff / 60000) % 60);
  const isUrgent = diff < 3600000;
  const isWarning = !isUrgent && diff < 86400000;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${isUrgent ? 'text-red-500 animate-pulse' : isWarning ? 'text-amber-500' : 'text-muted-foreground'}`}>
      <Timer className="h-3 w-3" />
      {h > 0 ? `${h}h ${m}m` : `${m}m`}
    </span>
  );
}

function AuctionCard({ auction }: { auction: AuctionWithListing }) {
  const imgs = getImages(auction.images);
  const thumb = imgs[0] ?? '/placeholder.svg';
  const currentBid = auction.currentBidInCents ?? auction.startingBidInCents;

  return (
    <Link to={`/modo-lance/${auction.id}`} className="group block rounded-lg border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden">
      <div className="aspect-square bg-secondary relative overflow-hidden">
        <img src={thumb} alt={auction.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-2 left-2">
          <Badge className="text-[10px] bg-[hsl(var(--kolecta-gold))] text-[hsl(var(--kolecta-carbon))]">
            <Gavel className="h-3 w-3 mr-1" /> Lance
          </Badge>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{auction.title}</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">Lance atual</p>
            <p className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">{formatBRL(currentBid)}</p>
          </div>
          <TimeLeft endsAt={auction.endsAt} />
        </div>
      </div>
    </Link>
  );
}

export default function AuctionsPage() {
  const { data: auctions = [], isLoading } = useAuctions();
  const [sortBy, setSortBy] = useState('ending_soon');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sorted = useMemo(() => {
    const list = [...auctions];
    switch (sortBy) {
      case 'ending_soon':
        return list.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
      case 'price_asc':
        return list.sort((a, b) => (a.currentBidInCents ?? a.startingBidInCents) - (b.currentBidInCents ?? b.startingBidInCents));
      case 'price_desc':
        return list.sort((a, b) => (b.currentBidInCents ?? b.startingBidInCents) - (a.currentBidInCents ?? a.startingBidInCents));
      default:
        return list;
    }
  }, [auctions, sortBy]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Gavel className="h-6 w-6 text-accent" />
            <div>
              <h1 className="font-heading text-3xl font-extrabold italic uppercase">Modo Lance</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Carregando...' : `${sorted.length} leilões ativos`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 rounded-md border border-border bg-input px-3 pr-8 text-sm text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="Nenhum leilão ativo"
            description="Volte em breve para novas oportunidades."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

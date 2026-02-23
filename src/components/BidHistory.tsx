import { formatBRL, type Bid } from '@/lib/mock-data';
import { Trophy } from 'lucide-react';

interface BidHistoryProps {
  bids: Bid[];
  maxItems?: number;
}

export default function BidHistory({ bids, maxItems = 10 }: BidHistoryProps) {
  const sorted = [...bids].sort((a, b) => b.amount - a.amount).slice(0, maxItems);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lance registrado ainda.</p>
    );
  }

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {sorted.map((bid, i) => (
        <div
          key={bid.id}
          className={`flex items-center justify-between text-sm py-2 px-3 rounded-md ${
            i === 0 ? 'bg-accent/10 border border-accent/20' : 'bg-secondary/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {i === 0 && <Trophy className="h-3.5 w-3.5 text-accent" />}
            <span className={i === 0 ? 'text-accent font-medium' : 'text-muted-foreground'}>{bid.userName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-heading font-bold ${i === 0 ? 'text-accent' : 'text-foreground'}`}>
              {formatBRL(bid.amount)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(bid.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

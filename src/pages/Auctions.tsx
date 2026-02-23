import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import { getAuctionProducts } from '@/lib/mock-data';
import { Gavel } from 'lucide-react';

export default function AuctionsPage() {
  const auctions = getAuctionProducts().sort(
    (a, b) => new Date(a.auctionEndsAt!).getTime() - new Date(b.auctionEndsAt!).getTime()
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Gavel className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Leilões</h1>
            <p className="text-sm text-muted-foreground">{auctions.length} leilões ativos</p>
          </div>
        </div>

        {auctions.length === 0 ? (
          <div className="text-center py-20">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-heading text-xl font-bold text-muted-foreground uppercase">Nenhum leilão ativo</p>
            <p className="text-sm text-muted-foreground mt-2">Volte em breve para novos leilões.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {auctions.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

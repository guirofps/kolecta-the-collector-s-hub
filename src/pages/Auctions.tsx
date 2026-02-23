import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAuctionProducts, mockCategories } from '@/lib/mock-data';
import { Gavel, SlidersHorizontal, X, ChevronDown } from 'lucide-react';

const sortOptions = [
  { value: 'ending_soon', label: 'Terminando em breve' },
  { value: 'most_bids', label: 'Mais disputados' },
  { value: 'price_asc', label: 'Menor preço atual' },
  { value: 'price_desc', label: 'Maior preço atual' },
];

export default function AuctionsPage() {
  const allAuctions = getAuctionProducts();
  const [sortBy, setSortBy] = useState('ending_soon');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const auctionCategories = useMemo(() => {
    const slugs = new Set(allAuctions.map((a) => a.categorySlug));
    return mockCategories.filter((c) => slugs.has(c.slug));
  }, [allAuctions]);

  const filtered = useMemo(() => {
    let results = [...allAuctions];

    if (selectedCategory) {
      results = results.filter((p) => p.categorySlug === selectedCategory);
    }
    if (verifiedOnly) {
      results = results.filter((p) => p.seller.verified);
    }

    switch (sortBy) {
      case 'ending_soon':
        results.sort((a, b) => new Date(a.auctionEndsAt!).getTime() - new Date(b.auctionEndsAt!).getTime());
        break;
      case 'most_bids':
        results.sort((a, b) => (b.bidsCount || 0) - (a.bidsCount || 0));
        break;
      case 'price_asc':
        results.sort((a, b) => (a.currentBid || 0) - (b.currentBid || 0));
        break;
      case 'price_desc':
        results.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0));
        break;
    }

    return results;
  }, [allAuctions, sortBy, selectedCategory, verifiedOnly]);

  const hasFilters = selectedCategory !== '' || verifiedOnly;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Gavel className="h-6 w-6 text-accent" />
            <div>
              <h1 className="font-heading text-3xl font-extrabold italic uppercase">Modo Lance</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} itens com lances ativos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost-light"
              size="sm"
              className="lg:hidden"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </Button>

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

        <div className="flex gap-6">
          {/* Filters */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-full lg:w-56 shrink-0 space-y-6`}>
            {hasFilters && (
              <button
                onClick={() => { setSelectedCategory(''); setVerifiedOnly(false); }}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}

            {/* Category */}
            <div>
              <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-3">Categoria</h3>
              <div className="space-y-2">
                {auctionCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:text-primary transition-colors">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === cat.slug}
                      onChange={() => setSelectedCategory(selectedCategory === cat.slug ? '' : cat.slug)}
                      className="border-border bg-input text-primary focus:ring-primary"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Verified */}
            <div>
              <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-3">Vendedor</h3>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={() => setVerifiedOnly(!verifiedOnly)}
                  className="rounded border-border bg-input text-primary focus:ring-primary"
                />
                Apenas verificados
              </label>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Gavel}
                title="Nenhum item com lances ativos"
                description="Volte em breve para novas oportunidades."
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

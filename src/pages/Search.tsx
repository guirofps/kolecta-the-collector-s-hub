import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListings } from '@/hooks/use-api';
import { mockCategories, type ProductCondition, type ProductType } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';
import { Loader2 } from 'lucide-react';

const conditionOptions: { value: ProductCondition; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'usado', label: 'Usado' },
  { value: 'mint', label: 'Mint' },
  { value: 'lacrado', label: 'Lacrado' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'recent', label: 'Mais recentes' },
  { value: 'ending_soon', label: 'Terminando em breve' },
  { value: 'most_bids', label: 'Mais lances' },
];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categorySlug = searchParams.get('category') || '';

  const { data: listingsData, isLoading } = useListings(50, 0, query);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categorySlug ? [categorySlug] : []);
  const [selectedConditions, setSelectedConditions] = useState<ProductCondition[]>([]);
  const [selectedType, setSelectedType] = useState<ProductType | ''>('');
  const [sortBy, setSortBy] = useState('relevance');

  const parseImages = (raw: string | null | undefined): string[] => {
    if (!raw) return ['/placeholder.svg'];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['/placeholder.svg'];
    } catch {
      return raw.startsWith('http') ? [raw] : ['/placeholder.svg'];
    }
  };

  const filtered = useMemo(() => {
    const rawListings = listingsData || [];
    
    // Converte de Listing para Product (frontend mock format)
    let results = rawListings.map(l => ({
      id: l.id,
      title: l.title,
      slug: l.id,
      images: parseImages(l.images),
      category: '',
      categorySlug: l.categoryId ?? '',
      condition: (l.condition as ProductCondition) ?? 'novo',
      type: l.type,
      price: l.priceInCents != null ? l.priceInCents / 100 : undefined,
      seller: {
        id: l.sellerId,
        name: l.sellerName ?? 'Vendedor Kolecta',
        slug: l.sellerId,
        avatar: '/placeholder.svg',
        verified: true,
        rating: 5,
        totalSales: 10,
        location: '',
        since: '',
      },
      description: l.description ?? '',
      details: {},
      featured: false,
      tags: [],
      status: l.status,
      createdAt: l.createdAt,
    }));

    // Filtros de Categoria, Condição e Tipo continuam client-side por enquanto
    // pois o backend findAllAdmin/findAll ainda não suporta todos eles combinados complexamente.

    if (selectedCategories.length > 0) {
      results = results.filter((p) => selectedCategories.includes(p.categorySlug));
    }

    if (selectedConditions.length > 0) {
      results = results.filter((p) => selectedConditions.includes(p.condition));
    }

    if (selectedType) {
      results = results.filter((p) => p.type === selectedType);
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        results.sort((a, b) => (a.price || a.currentBid || 0) - (b.price || b.currentBid || 0));
        break;
      case 'price_desc':
        results.sort((a, b) => (b.price || b.currentBid || 0) - (a.price || a.currentBid || 0));
        break;
      case 'recent':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'ending_soon':
        results = results.filter((p) => p.auctionEndsAt);
        results.sort((a, b) => new Date(a.auctionEndsAt!).getTime() - new Date(b.auctionEndsAt!).getTime());
        break;
      case 'most_bids':
        results.sort((a, b) => (b.bidsCount || 0) - (a.bidsCount || 0));
        break;
    }

    return results;
  }, [listingsData, selectedCategories, selectedConditions, selectedType, sortBy]);

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    trackEvent('filter_apply', { filter: 'category', value: slug });
  };

  const toggleCondition = (c: ProductCondition) => {
    setSelectedConditions((prev) =>
      prev.includes(c) ? prev.filter((s) => s !== c) : [...prev, c]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedType('');
    setSortBy('relevance');
  };

  const hasFilters = selectedCategories.length > 0 || selectedConditions.length > 0 || selectedType !== '';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">
              {query ? `Resultados para "${query}"` : 'Explorar'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{filtered.length} itens encontrados</p>
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
          {/* Filters sidebar */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-full lg:w-56 shrink-0 space-y-6`}>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}

            {/* Categories */}
            <div>
              <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-3">Categoria</h3>
              <div className="space-y-2">
                {mockCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.slug)}
                      onChange={() => toggleCategory(cat.slug)}
                      className="rounded border-border bg-input text-primary focus:ring-primary"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-3">Condição</h3>
              <div className="flex flex-wrap gap-2">
                {conditionOptions.map((opt) => (
                  <Badge
                    key={opt.value}
                    className={`cursor-pointer text-xs ${selectedConditions.includes(opt.value) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                    onClick={() => toggleCondition(opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-3">Tipo</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'direct' as ProductType, label: 'Compra Direta' },
                  { value: 'auction' as ProductType, label: 'Modo Lance' },
                ].map((opt) => (
                  <Badge
                    key={opt.value}
                    className={`cursor-pointer text-xs ${selectedType === opt.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                    onClick={() => setSelectedType(selectedType === opt.value ? '' : opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
          </aside>

          {/* Results grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="text-center py-20">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                <p className="font-heading text-xl font-bold text-muted-foreground uppercase">Buscando itens...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-heading text-xl font-bold text-muted-foreground uppercase">Nenhum item encontrado</p>
                <p className="text-sm text-muted-foreground mt-2">Tente ajustar seus filtros ou buscar por outro termo.</p>
                <Button variant="outline-gold" size="sm" className="mt-4" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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

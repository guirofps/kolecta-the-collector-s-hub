import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import { useListings, useCategories } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { onlyPublic } from '@/lib/listing-visibility';
import {
  subcategoriaField, normalizeSubcategoria, parseAttributes, formatFieldValue,
} from '@/lib/category-fields';
import type { ProductCondition, Product } from '@/lib/mock-data';
import type { Listing } from '@/lib/api';

const REMOVED_CATEGORY_SLUGS = ['modelismo', 'vintage-retro'];

const CATEGORIES = [
  { id: '1', name: 'Miniaturas Diecast', slug: 'miniaturas-diecast', icon: '🚗', description: 'Hot Wheels, Mini GT, Tomica e mais' },
  { id: '2', name: 'Cards Colecionáveis', slug: 'cards-colecionaveis', icon: '🃏', description: 'Pokémon, One Piece, Magic e mais' },
  { id: '3', name: 'Action Figures', slug: 'action-figures', icon: '🦸', description: 'Marvel, DC, Anime e mais' },
  { id: '4', name: 'Funko Pop', slug: 'funko-pop', icon: '👾', description: 'Todas as linhas e edições' },
  { id: '5', name: 'Mangás & HQs', slug: 'mangas-hqs', icon: '📚', description: 'Volumes nacionais e importados' },
];

function CategoryIcon({ slug, size = 32 }: { slug: string; size?: number }) {
  const fill = '#FFD700';
  switch (slug) {
    case 'miniaturas-diecast':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="5" y="9" width="22" height="14" rx="5" fill={fill} />
          <rect x="9" y="12" width="14" height="8" rx="2.5" fill="#0f0f0f" opacity="0.3" />
          <rect x="1" y="10" width="5" height="5" rx="2" fill={fill} />
          <rect x="1" y="17" width="5" height="5" rx="2" fill={fill} />
          <rect x="26" y="10" width="5" height="5" rx="2" fill={fill} />
          <rect x="26" y="17" width="5" height="5" rx="2" fill={fill} />
        </svg>
      );
    case 'cards-colecionaveis':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="6" y="3" width="20" height="26" rx="3" fill={fill} />
          <polygon points="16,9 17.8,14 23,14 18.9,17 20.5,22 16,19 11.5,22 13.1,17 9,14 14.2,14" fill="#0f0f0f" opacity="0.3" />
        </svg>
      );
    case 'action-figures':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M8 13 L6 29 L16 24 L26 29 L24 13 Z" fill={fill} opacity="0.55" />
          <circle cx="16" cy="8" r="5" fill={fill} />
          <rect x="11" y="13" width="10" height="10" rx="2" fill={fill} />
          <rect x="11" y="23" width="4" height="7" rx="2" fill={fill} />
          <rect x="17" y="23" width="4" height="7" rx="2" fill={fill} />
          <rect x="3" y="13" width="8" height="3" rx="1.5" fill={fill} />
          <rect x="21" y="13" width="8" height="3" rx="1.5" fill={fill} />
        </svg>
      );
    case 'funko-pop':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="11" r="9" fill={fill} />
          <rect x="10" y="19" width="12" height="11" rx="3" fill={fill} />
          <circle cx="13" cy="11" r="1.5" fill="#0f0f0f" opacity="0.4" />
          <circle cx="19" cy="11" r="1.5" fill="#0f0f0f" opacity="0.4" />
        </svg>
      );
    case 'mangas-hqs':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 4 L4 7 L4 28 L16 25 Z" fill={fill} />
          <path d="M16 4 L28 7 L28 28 L16 25 Z" fill={fill} opacity="0.65" />
          <line x1="7" y1="12" x2="15" y2="11" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="7" y1="15" x2="15" y2="14" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="7" y1="18" x2="15" y2="17" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="11" x2="25" y2="12" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="14" x2="25" y2="15" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="17" x2="25" y2="18" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
        </svg>
      );
    default:
      return <span style={{ fontSize: size * 0.75 }}>📦</span>;
  }
}

// A API pública de anúncios só aceita limite, deslocamento e busca por texto:
// não dá para filtrar por categoria no servidor. Então trazemos um lote grande
// e filtramos aqui. Com 40 (o valor antigo) a categoria aparecia VAZIA mesmo
// tendo itens, porque os 40 primeiros anúncios do geral podiam não ter nenhum
// daquela categoria. Filtrar por categoria no servidor está pedido ao backend
// (ver docs/pendencias-backend.md).
const LOTE = 500;

type FiltroTipo = 'todos' | 'direct' | 'auction';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroSub, setFiltroSub] = useState<string>('todas');
  // F29: antes passava o slug como `q` (busca de TEXTO), então procurava itens
  // com "funko-pop" no título → sempre vazio. Agora buscamos os anúncios e
  // filtramos pela CATEGORIA real (id resolvido pelo slug via API).
  // Hooks ficam antes de qualquer return condicional (regras dos hooks).
  const { data: apiCategories, isLoading: catsLoading } = useCategories();
  const { data: listingsData, isLoading: listingsLoading } = useListings(LOTE, 0);

  if (slug && REMOVED_CATEGORY_SLUGS.includes(slug)) {
    return <Navigate to="/categorias" replace />;
  }

  const category = CATEGORIES.find((c) => c.slug === slug);
  const isLoading = listingsLoading || catsLoading;
  const realCategoryId = (apiCategories ?? []).find((c) => c.slug === slug)?.id;

  // Só anúncio aprovado na vitrine (ver lib/listing-visibility).
  const daCategoria = realCategoryId
    ? onlyPublic(listingsData ?? []).filter((l) => l.categoryId === realCategoryId)
    : [];

  const totalDireta = daCategoria.filter((l) => l.type === 'direct').length;
  const totalLeilao = daCategoria.filter((l) => l.type === 'auction').length;

  // ─── Subcategoria (a "prateleira" dentro da categoria) ───
  // O valor vem de `attributes`, com as colunas do topo como reserva, e passa
  // pela normalização: sem ela, os 22 anúncios de Hot Wheels ficariam em 5
  // grupos por causa da grafia. Quem não encaixa em nada vira "Outros".
  const sub = subcategoriaField(slug);
  const OUTROS = 'Outros';

  const subDe = (l: Listing): string => {
    if (!sub) return OUTROS;
    const attrs = parseAttributes(l.attributes);
    const bruto = formatFieldValue(attrs[sub.key])
      ?? formatFieldValue((l as unknown as Record<string, unknown>)[sub.key])
      ?? '';
    return normalizeSubcategoria(bruto, sub.options ?? []) ?? OUTROS;
  };

  const contagemSub = daCategoria.reduce<Record<string, number>>((acc, l) => {
    const s = subDe(l);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  // Só mostra prateleira que tem item, da maior para a menor, com "Outros" no fim.
  const subsComItem = Object.keys(contagemSub)
    .sort((a, b) => (a === OUTROS ? 1 : b === OUTROS ? -1 : contagemSub[b] - contagemSub[a]));

  const products = daCategoria
    .filter((l) => filtroTipo === 'todos' || l.type === filtroTipo)
    .filter((l) => filtroSub === 'todas' || subDe(l) === filtroSub);

  if (!category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold text-muted-foreground uppercase">Categoria não encontrada</h1>
        </div>
      </Layout>
    );
  }

  // Converte a API Listing para o formato esperado pelo ProductCard
  const parseImages = (raw: string | null | undefined): string[] => {
    if (!raw) return ['/placeholder.svg'];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['/placeholder.svg'];
    } catch {
      return raw.startsWith('http') ? [raw] : ['/placeholder.svg'];
    }
  };

  const apiProducts: Product[] = products.map((l: Listing) => ({
    id: l.id,
    title: l.title,
    slug: l.id,
    images: parseImages(l.images),
    category: '',
    categorySlug: l.categoryId ?? '',
    subcategorySlug: '',
    condition: (l.condition as ProductCondition) ?? 'novo',
    type: l.type,
    price: l.priceInCents != null ? l.priceInCents / 100 : undefined,
    seller: {
      id: l.sellerId,
      name: l.sellerName ?? 'Vendedor Kolecta',
      slug: l.sellerId,
      avatar: '/placeholder.svg',
      // F30: sem dado real de verificação/reputação, não inventamos selo nem nota.
      verified: false,
      rating: 0,
      totalSales: 0,
      location: '',
      since: '',
    },
    description: l.description ?? '',
    details: {},
    featured: false,
    tags: [],
    status: l.status,
    createdAt: l.createdAt,
    // Leilão: sem isto o card mostra "R$ 0,00" (ver Index.tsx).
    startingBid:
      l.startingBidInCents != null ? l.startingBidInCents / 100 : undefined,
    currentBid:
      l.currentBidInCents != null ? l.currentBidInCents / 100 : undefined,
    bidsCount: l.bidsCount ?? 0,
    auctionEndsAt: l.endsAt ?? undefined,
  }));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-5">
          <CategoryIcon slug={category.slug} size={32} />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">{category.name}</h1>
            <p className="text-sm text-muted-foreground">{products.length} itens · {category.description}</p>
          </div>
        </div>

        {/* Compra direta e leilão são jornadas diferentes: uma tem preço fixo,
            a outra tem prazo e disputa. Misturar na mesma grade confunde. */}
        {daCategoria.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {([
              { valor: 'todos', rotulo: 'Tudo', total: daCategoria.length },
              { valor: 'direct', rotulo: 'Compra direta', total: totalDireta },
              { valor: 'auction', rotulo: 'Modo Lance', total: totalLeilao },
            ] as const).map((aba) => (
              <button
                key={aba.valor}
                type="button"
                onClick={() => setFiltroTipo(aba.valor)}
                disabled={aba.total === 0}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtroTipo === aba.valor
                    ? 'bg-primary/15 text-primary'
                    : aba.total === 0
                      ? 'cursor-not-allowed text-muted-foreground/40'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                {aba.rotulo} ({aba.total})
              </button>
            ))}
          </div>
        )}

        {/* Prateleiras dentro da categoria. Sem isto, "Miniaturas" é uma pilha
            de 52 itens misturando Hot Wheels, Majorette e Bburago. */}
        {sub && subsComItem.length > 1 && (
          <div className="mb-6">
            <p className="mb-2 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
              {sub.label}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFiltroSub('todas')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtroSub === 'todas'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                Todas ({daCategoria.length})
              </button>
              {subsComItem.map((nome) => (
                <button
                  key={nome}
                  type="button"
                  onClick={() => setFiltroSub(nome)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    filtroSub === nome
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  {nome} ({contagemSub[nome]})
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-card rounded-lg h-[340px] border border-border" />
            ))}
          </div>
        ) : products.length === 0 ? (
          // A categoria pode estar vazia de verdade, ou só o filtro de tipo é
          // que não tem item. Dizer "seja o primeiro a vender" para quem só
          // clicou em "Modo Lance" seria mentira.
          daCategoria.length > 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">Nenhum item com esse filtro.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => { setFiltroTipo('todos'); setFiltroSub('todas'); }}
              >
                Ver tudo de {category.name}
              </Button>
            </div>
          ) : (
            <div className="text-center py-20 flex flex-col items-center max-w-md mx-auto">
              <div className="mb-6 opacity-60">
                <CategoryIcon slug={category.slug} size={64} />
              </div>
              <h2 className="font-heading text-2xl font-bold uppercase italic text-foreground mb-3">Seja o primeiro a vender aqui</h2>
              <p className="text-muted-foreground mb-8">Nenhum item em {category.name} ainda. Que tal abrir caminho?</p>

              <div className="flex flex-col gap-3 w-full sm:w-auto">
                <Button variant="kolecta" size="lg" asChild>
                  <Link to="/painel/anuncios/novo">Criar anúncio grátis</Link>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <Link to="/categorias">Explorar outras categorias</Link>
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {apiProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

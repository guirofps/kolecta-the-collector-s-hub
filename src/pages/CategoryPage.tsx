import { useState } from 'react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useParams, Navigate, Link } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/SEO';
import ProductCard from '@/components/ProductCard';
import { useListings, useCategories } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
import { onlyPublic } from '@/lib/listing-visibility';
import { LIMITE_CATALOGO } from '@/lib/catalogo';
import {
  faixasComItem, condicoesComItem, aplicarFiltros, ordenar, ORDENS, type Ordem,
} from '@/lib/category-filters';
import {
  subcategoriaField, normalizeSubcategoria, parseAttributes, formatFieldValue,
} from '@/lib/category-fields';
import { resolverFamilia } from '@/lib/category-familia';
import type { ProductCondition, Product } from '@/lib/mock-data';
import type { Listing } from '@/lib/api';

const REMOVED_CATEGORY_SLUGS = ['modelismo', 'vintage-retro'];

const CATEGORIES = [
  { id: '1', name: 'Miniaturas Diecast', slug: 'miniaturas-diecast', icon: '🚗', description: 'Hot Wheels, Mini GT, Tomica e mais' },
  { id: '2', name: 'Cards Colecionáveis', slug: 'cards-colecionaveis', icon: '🃏', description: 'Pokémon, One Piece, Magic e mais' },
  { id: '3', name: 'Action Figures', slug: 'action-figures', icon: '🦸', description: 'Marvel, DC, Anime e mais' },
  { id: '4', name: 'Funko Pop', slug: 'funko-pop', icon: '👾', description: 'Todas as linhas e edições' },
  { id: '5', name: 'Mangás & HQs', slug: 'mangas-hqs', icon: '📚', description: 'Volumes nacionais e importados' },
  { id: '6', name: 'Acessórios', slug: 'acessorios', icon: '🛞', description: 'Rodas, expositores e peças para customizar' },
];

// Estilo comum das "pílulas" de filtro. Fica aqui para o desktop e a gaveta do
// mobile usarem exatamente o mesmo visual, sem duplicar a string de classes.
function chipClass(active: boolean, disabled = false): string {
  const base = 'rounded-md px-3 py-1.5 text-sm font-medium transition-colors';
  if (disabled) return `${base} cursor-not-allowed text-muted-foreground/40`;
  return active
    ? `${base} bg-primary/15 text-primary`
    : `${base} text-muted-foreground hover:bg-secondary/60 hover:text-foreground`;
}

// A API pública de anúncios só aceita limite, deslocamento e busca por texto:
// não dá para filtrar por categoria no servidor. Então trazemos um lote grande
// e filtramos aqui. Com 40 (o valor antigo) a categoria aparecia VAZIA mesmo
// tendo itens, porque os 40 primeiros anúncios do geral podiam não ter nenhum
// daquela categoria. Filtrar por categoria no servidor está pedido ao backend
// (ver docs/pendencias-backend.md).
//
// O número vive em lib/catalogo, junto com o da home e o da busca: limite
// diferente vira cache diferente, e a categoria refazia uma listagem que a
// home tinha acabado de baixar.

type FiltroTipo = 'todos' | 'direct' | 'auction';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroSub, setFiltroSub] = useState<string>('todas');
  // Acessórios é subcategoria de Miniaturas, não card próprio. Dentro da página
  // de Miniaturas este seletor troca entre a família "Miniaturas" e a família
  // "Acessórios" (rodas, expositores), que no banco continua sendo a categoria
  // 'acessorios' — wizard, import e Bling intactos, só a navegação a aninha.
  const [familia, setFamilia] = useState<'miniaturas' | 'acessorios'>('miniaturas');
  // Filtros genéricos de marketplace, que faltavam: preço, condição, ordem.
  const [filtroPreco, setFiltroPreco] = useState<string | null>(null);
  const [filtroCondicao, setFiltroCondicao] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<Ordem>('relevancia');
  // No mobile os filtros vivem numa gaveta (bottom sheet), aberta por este estado.
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  // F29: antes passava o slug como `q` (busca de TEXTO), então procurava itens
  // com "funko-pop" no título → sempre vazio. Agora buscamos os anúncios e
  // filtramos pela CATEGORIA real (id resolvido pelo slug via API).
  // Hooks ficam antes de qualquer return condicional (regras dos hooks).
  const { data: apiCategories, isLoading: catsLoading } = useCategories();
  const { data: listingsData, isLoading: listingsLoading } = useListings(LIMITE_CATALOGO, 0);

  if (slug && REMOVED_CATEGORY_SLUGS.includes(slug)) {
    return <Navigate to="/categorias" replace />;
  }

  const category = CATEGORIES.find((c) => c.slug === slug);
  const isLoading = listingsLoading || catsLoading;
  const idPorSlug = (s: string) => (apiCategories ?? []).find((c) => c.slug === s)?.id;

  // Só anúncio aprovado na vitrine (ver lib/listing-visibility).
  const publicos = onlyPublic(listingsData ?? []);

  // Miniatura vs acessório (decisão pura em lib/category-familia). Fora de
  // Miniaturas nada disto liga e a página segue como sempre.
  const {
    emAcessorios, slugAtivo, categoriaIdAtiva, totalMiniaturas, totalAcessorios, mostrarSeletor,
  } = resolverFamilia({ slug, familia, idPorSlug, publicos });

  const daCategoria = categoriaIdAtiva
    ? publicos.filter((l) => l.categoryId === categoriaIdAtiva)
    : [];

  // Trocar de família zera os filtros: as prateleiras de miniatura (marca) e de
  // acessório (tipo) são listas diferentes, e um filtro preso confundiria.
  const trocarFamilia = (f: 'miniaturas' | 'acessorios') => {
    setFamilia(f);
    setFiltroSub('todas');
    setFiltroTipo('todos');
    setFiltroPreco(null);
    setFiltroCondicao(null);
  };

  const totalDireta = daCategoria.filter((l) => l.type === 'direct').length;
  const totalLeilao = daCategoria.filter((l) => l.type === 'auction').length;

  // ─── Subcategoria (a "prateleira" dentro da categoria) ───
  // O valor vem de `attributes`, com as colunas do topo como reserva, e passa
  // pela normalização: sem ela, os 22 anúncios de Hot Wheels ficariam em 5
  // grupos por causa da grafia. Quem não encaixa em nada vira "Outros".
  const sub = subcategoriaField(slugAtivo);
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

  // Opções de preço e condição derivadas do que a categoria tem, para nunca
  // oferecer um filtro que zera a lista. Contam sobre os itens já filtrados por
  // tipo e prateleira, então o número ao lado do chip é o que a pessoa vê.
  const baseFiltros = daCategoria
    .filter((l) => filtroTipo === 'todos' || l.type === filtroTipo)
    .filter((l) => filtroSub === 'todas' || subDe(l) === filtroSub);

  const faixasPreco = faixasComItem(baseFiltros);
  const condicoes = condicoesComItem(baseFiltros);
  const temFiltroGenerico = filtroPreco !== null || filtroCondicao !== null || ordem !== 'relevancia';
  // Quantos filtros o visitante ligou, para a bolinha no botão "Filtros" do mobile.
  const filtrosAtivos =
    (filtroTipo !== 'todos' ? 1 : 0) +
    (filtroSub !== 'todas' ? 1 : 0) +
    (filtroPreco !== null ? 1 : 0) +
    (filtroCondicao !== null ? 1 : 0) +
    (ordem !== 'relevancia' ? 1 : 0);

  const products = ordenar(
    aplicarFiltros(baseFiltros, { faixaPreco: filtroPreco, condicao: filtroCondicao }),
    ordem,
  );

  const limparTudo = () => {
    setFiltroTipo('todos');
    setFiltroSub('todas');
    setFiltroPreco(null);
    setFiltroCondicao(null);
    setOrdem('relevancia');
  };

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
      name: l.sellerName || 'Vendedor Kolecta',
      slug: l.sellerId,
      storeSlug: l.sellerSlug ?? null,
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
    status: l.status as Product['status'],
    createdAt: l.createdAt,
    // Leilão: sem isto o card mostra "R$ 0,00" (ver Index.tsx).
    auctionId: l.auctionId ?? undefined,
    startingBid:
      l.startingBidInCents != null ? l.startingBidInCents / 100 : undefined,
    currentBid:
      l.currentBidInCents != null ? l.currentBidInCents / 100 : undefined,
    bidsCount: l.bidsCount ?? 0,
    auctionEndsAt: l.endsAt ?? undefined,
  }));

  // ─── Pílulas de filtro, montadas uma vez e reaproveitadas no desktop (inline)
  //     e no mobile (dentro da gaveta). Só os botões, sem embrulho, para cada
  //     contexto colocá-los no container que quiser. ───
  const chipsTipo = ([
    { valor: 'todos', rotulo: 'Tudo', total: daCategoria.length },
    { valor: 'direct', rotulo: 'Compra direta', total: totalDireta },
    { valor: 'auction', rotulo: 'Modo Lance', total: totalLeilao },
  ] as const).map((aba) => (
    <button
      key={aba.valor}
      type="button"
      onClick={() => setFiltroTipo(aba.valor)}
      disabled={aba.total === 0}
      className={chipClass(filtroTipo === aba.valor, aba.total === 0)}
    >
      {aba.rotulo} ({aba.total})
    </button>
  ));

  const chipsSub = [
    <button
      key="__todas"
      type="button"
      onClick={() => setFiltroSub('todas')}
      className={chipClass(filtroSub === 'todas')}
    >
      Todas ({daCategoria.length})
    </button>,
    ...subsComItem.map((nome) => (
      <button
        key={nome}
        type="button"
        onClick={() => setFiltroSub(nome)}
        className={chipClass(filtroSub === nome)}
      >
        {nome} ({contagemSub[nome]})
      </button>
    )),
  ];

  const chipsPreco = faixasPreco.map((f) => {
    const ativo = filtroPreco === f.chave;
    return (
      <button
        key={f.chave}
        type="button"
        // Clicar de novo no ativo limpa o filtro de preço.
        onClick={() => setFiltroPreco(ativo ? null : f.chave)}
        className={chipClass(ativo)}
      >
        {f.rotulo} ({f.total})
      </button>
    );
  });

  const chipsCondicao = condicoes.map((c) => {
    const ativo = filtroCondicao === c.value;
    return (
      <button
        key={c.value}
        type="button"
        onClick={() => setFiltroCondicao(ativo ? null : c.value)}
        className={chipClass(ativo)}
      >
        {c.label} ({c.total})
      </button>
    );
  });

  const chipsOrdem = ORDENS.map((o) => (
    <button
      key={o.valor}
      type="button"
      onClick={() => setOrdem(o.valor)}
      className={chipClass(ordem === o.valor)}
    >
      {o.rotulo}
    </button>
  ));

  const rotuloLabel = 'mb-2 text-[10px] font-heading uppercase tracking-wider text-muted-foreground';

  return (
    <Layout>
      {category && (
        <SEO
          title={`${category.name} · Colecionáveis`}
          description={`${category.name} na Kolecta: ${category.description}. Compre e venda com segurança no marketplace dos colecionadores.`}
          canonicalPath={`/categoria/${category.slug}`}
        />
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-5">
          <CategoryIcon slug={emAcessorios ? 'acessorios' : category.slug} size={32} />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">{category.name}</h1>
            <p className="text-sm text-muted-foreground">
              {emAcessorios ? 'Rodas, expositores e peças para suas miniaturas' : category.description}
            </p>
          </div>
        </div>

        {/* ─── Miniatura vs Acessório: acessório é peça PARA miniatura, então
            vive aninhado aqui, não como card próprio na home. Só aparece quando
            há acessório publicado, para não mostrar aba vazia. ─── */}
        {mostrarSeletor && (
          <div className="mb-6 inline-flex gap-1 rounded-lg border border-border bg-card/40 p-1">
            <button
              type="button"
              onClick={() => trocarFamilia('miniaturas')}
              className={chipClass(!emAcessorios)}
            >
              Miniaturas ({totalMiniaturas})
            </button>
            <button
              type="button"
              onClick={() => trocarFamilia('acessorios')}
              className={chipClass(emAcessorios)}
            >
              Acessórios ({totalAcessorios})
            </button>
          </div>
        )}

        {/* ─── MOBILE: barra compacta com um botão que abre a gaveta de filtros.
            Tira do topo a parede de pílulas que ficava amassada no celular. ─── */}
        {daCategoria.length > 0 && (
          <div className="mb-5 md:hidden">
            <Button
              variant="outline"
              onClick={() => setFiltrosAbertos(true)}
              className="w-full justify-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros e ordenação
              {filtrosAtivos > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {filtrosAtivos}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* ─── DESKTOP: filtros inline, escondidos no mobile (lá vão na gaveta).
            Compra direta e leilão são jornadas diferentes; misturar confunde. ─── */}
        {daCategoria.length > 0 && (
          <div className="mb-6 hidden md:block">
            <div className="flex flex-wrap gap-2">{chipsTipo}</div>
          </div>
        )}

        {/* Prateleiras dentro da categoria. Sem isto, "Miniaturas" é uma pilha
            de 52 itens misturando Hot Wheels, Majorette e Bburago. */}
        {sub && subsComItem.length > 1 && (
          <div className="mb-6 hidden md:block">
            <p className={rotuloLabel}>{sub.label}</p>
            <div className="flex flex-wrap gap-2">{chipsSub}</div>
          </div>
        )}

        {/* Preço e condição: os filtros genéricos que todo marketplace tem. Cada
            bloco só aparece quando há mais de uma opção, senão vira ruído. */}
        {baseFiltros.length > 0 && (faixasPreco.length > 1 || condicoes.length > 1) && (
          <div className="mb-6 hidden space-y-4 rounded-lg border border-border bg-card/40 p-4 md:block">
            {faixasPreco.length > 1 && (
              <div>
                <p className={rotuloLabel}>Preço</p>
                <div className="flex flex-wrap gap-2">{chipsPreco}</div>
              </div>
            )}
            {condicoes.length > 1 && (
              <div>
                <p className={rotuloLabel}>Condição</p>
                <div className="flex flex-wrap gap-2">{chipsCondicao}</div>
              </div>
            )}
          </div>
        )}

        {/* Contagem do resultado + ordenação. A ordenação por select fica só no
            desktop; no mobile ela está dentro da gaveta. */}
        {baseFiltros.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {products.length} {products.length === 1 ? 'item' : 'itens'}
              {temFiltroGenerico && (
                <button type="button" onClick={limparTudo} className="ml-3 text-primary hover:underline">
                  Limpar filtros
                </button>
              )}
            </p>
            <label className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              Ordenar por
              <select
                value={ordem}
                onChange={(e) => setOrdem(e.target.value as Ordem)}
                className="rounded-md border border-border bg-input px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ORDENS.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                ))}
              </select>
            </label>
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

        {/* ─── MOBILE: a gaveta (bottom sheet) de filtros. Só monta no celular;
            no desktop o botão que a abre está escondido, então ela nunca aparece. ─── */}
        <Sheet open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl md:hidden">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle>Filtros e ordenação</SheetTitle>
            </SheetHeader>

            <div className="space-y-5">
              <div>
                <p className={rotuloLabel}>Ordenar por</p>
                <div className="flex flex-wrap gap-2">{chipsOrdem}</div>
              </div>

              {daCategoria.length > 0 && (
                <div>
                  <p className={rotuloLabel}>Tipo</p>
                  <div className="flex flex-wrap gap-2">{chipsTipo}</div>
                </div>
              )}

              {sub && subsComItem.length > 1 && (
                <div>
                  <p className={rotuloLabel}>{sub.label}</p>
                  <div className="flex flex-wrap gap-2">{chipsSub}</div>
                </div>
              )}

              {faixasPreco.length > 1 && (
                <div>
                  <p className={rotuloLabel}>Preço</p>
                  <div className="flex flex-wrap gap-2">{chipsPreco}</div>
                </div>
              )}

              {condicoes.length > 1 && (
                <div>
                  <p className={rotuloLabel}>Condição</p>
                  <div className="flex flex-wrap gap-2">{chipsCondicao}</div>
                </div>
              )}
            </div>

            <SheetFooter className="mt-6 flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={limparTudo}
                disabled={filtrosAtivos === 0}
              >
                Limpar
              </Button>
              <SheetClose asChild>
                <Button variant="kolecta" className="flex-1">
                  Ver {products.length} {products.length === 1 ? 'item' : 'itens'}
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}

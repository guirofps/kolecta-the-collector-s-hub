import { useEffect, useMemo } from 'react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Search, TrendingUp, Package, Users, Loader2, Store, MessagesSquare, Heart, MessageSquare } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  toProduct,
  destaques as pegarDestaques,
  novidades as pegarNovidades,
  leiloes as pegarLeiloes,
  lojas as pegarLojas,
  contagemPorCategoria,
} from '@/lib/home-sections';
import { useListings, useCommunityFeed } from '@/hooks/use-api';
import { LIMITE_CATALOGO } from '@/lib/catalogo';
import { COMMISSION_LABEL } from '@/lib/fees';
import { useLaunchGate } from '@/hooks/use-launch-gate';
import { categoryArt } from '@/lib/category-art';
import { trackEvent } from '@/lib/analytics';
import { onlyPublic } from '@/lib/listing-visibility';
import heroBg from '@/assets/hero-bg.jpg';
import LaunchCountdown from './LaunchCountdown';

const CATEGORIES = [
  { id: '1', name: 'Miniaturas Diecast', slug: 'miniaturas-diecast', icon: '🚗', description: 'Hot Wheels, Mini GT, Tomica e mais' },
  { id: '2', name: 'Cards Colecionáveis', slug: 'cards-colecionaveis', icon: '🃏', description: 'Pokémon, One Piece, Magic e mais' },
  { id: '3', name: 'Action Figures', slug: 'action-figures', icon: '🦸', description: 'Marvel, DC, Anime e mais' },
  { id: '4', name: 'Funko Pop', slug: 'funko-pop', icon: '👾', description: 'Todas as linhas e edições' },
  { id: '5', name: 'Mangás & HQs', slug: 'mangas-hqs', icon: '📚', description: 'Volumes nacionais e importados' },
  { id: '6', name: 'Acessórios', slug: 'acessorios', icon: '🛞', description: 'Rodas, expositores e peças para customizar' },
];

// Atalhos do hero. Escolhidos entre o que o catálogo realmente tem: no acervo
// de hoje devolvem 57, 39, 10 e 8 resultados. Atalho que cai numa lista vazia
// é pior do que não existir, então valem uma conferida quando o mix de
// categorias mudar.
const ATALHOS_BUSCA = ['Hot Wheels', 'Mini GT', 'Kaido House', 'Pokémon'];

// Quanto a home puxa de uma vez. Precisa cobrir o catálogo inteiro para a
// contagem por categoria bater com a realidade; se um dia não cobrir mais, a
// home passa a dizer "mais de N" em vez de mentir o total.
//
// É o mesmo número da categoria, da busca e da página do produto (lib/catalogo),
// para as quatro dividirem um cache só. Antes a home pedia 200 e a categoria
// 500: quem clicava numa categoria esperava a mesma listagem duas vezes.
const LIMITE_HOME = LIMITE_CATALOGO;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
};

export default function Index() {
  const { isLoading: gateLoading, gateActive } = useLaunchGate();

  // Antes do lançamento, a home vira a landing de countdown (exceto admin).
  if (gateLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-kolecta-dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (gateActive) {
    return <LaunchCountdown />;
  }

  return <HomeContent />;
}

function HomeContent() {
  useEffect(() => {
    trackEvent('view_home');
  }, []);

  // Uma requisição só alimenta todas as seções. Antes pedia 40 para mostrar 5;
  // com 136 anúncios no ar, a home ficava com cara de catálogo vazio. O filtro
  // de status continua porque a API já devolve só aprovado, mas nada garante
  // que siga assim.
  const { data: listingsData, isLoading } = useListings(LIMITE_HOME);
  const ativos = useMemo(() => onlyPublic(listingsData ?? []), [listingsData]);

  // Comunidade: consulta separada e leve, que não segura o resto da home.
  const { data: feedComunidade } = useCommunityFeed({ sort: 'recent' });
  const postsDaComunidade = feedComunidade?.data ?? [];

  const secoes = useMemo(() => {
    // A ordem importa: cada seção tira do bolo o que a anterior já usou, senão
    // o mesmo leilão aparecia três vezes na mesma tela (era o item mais caro do
    // catálogo, então entrava em destaque, em Modo Lance e em novidades).
    const emLeilao = pegarLeiloes(ativos);
    const emDestaque = pegarDestaques(ativos, 10, emLeilao);
    return {
      destaque: emDestaque.map(toProduct),
      leiloes: emLeilao.map(toProduct),
      novidades: pegarNovidades(ativos, 20, [...emLeilao, ...emDestaque]).map(toProduct),
      lojas: pegarLojas(ativos, 8),
      porCategoria: contagemPorCategoria(ativos),
      // A busca agora traz TODAS as páginas, então `total` é o número real, não
      // um piso. Por isso não há mais "mais de N": a contagem é exata.
      total: ativos.length,
    };
  }, [ativos]);

  return (
    <Layout>
      {/* ─── HERO ─────────────────────────────────────── */}
      {/* 85vh empurrava o primeiro produto para duas rolagens abaixo. Numa home
          de marketplace o catálogo precisa aparecer junto com a dobra. */}
      <section className="relative min-h-[62vh] flex items-center justify-center overflow-hidden py-16">
        {/* Background */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-kolecta-dark via-kolecta-dark/80 to-kolecta-dark/40" />
          <div className="absolute inset-0 bg-carbon-texture opacity-30" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            className="max-w-3xl mx-auto"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 font-heading uppercase tracking-widest text-xs px-4 py-1.5">
                Marketplace de Colecionáveis
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold italic uppercase leading-[0.9] mb-6 text-white"
            >
              O point dos{' '}
              <span className="text-primary text-glow-primary">colecionadores</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto mb-6"
            >
              Compre, venda e dê lances em miniaturas diecast, cards e artigos exclusivos. Plataforma criada por colecionadores, para colecionadores.
            </motion.p>

            {/* Atalhos, não um segundo campo de busca: o header já tem o dele
                fixo no topo, e dois campos na mesma tela é escolha demais para
                quem acabou de chegar. Aqui a pessoa entra direto no que o
                catálogo tem de verdade. */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="mx-auto mb-6 flex max-w-xl flex-wrap items-center justify-center gap-2"
            >
              <Button variant="kolecta" size="lg" className="px-7" asChild>
                <Link to="/busca">
                  <Search className="mr-2 h-5 w-5" />
                  Explorar coleção
                </Link>
              </Button>
              {ATALHOS_BUSCA.map((termo) => (
                <Link
                  key={termo}
                  to={`/busca?q=${encodeURIComponent(termo)}`}
                  onClick={() => trackEvent('search', { q: termo, origem: 'atalho-home' })}
                  className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs text-white/70 transition-colors hover:border-primary/50 hover:text-white"
                >
                  {termo}
                </Link>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-white/60">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Pagamento protegido
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Frete calculado na hora
              </span>
              {secoes.total > 0 && (
                <span className="flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" />
                  {secoes.total} {secoes.total === 1 ? 'item no ar' : 'itens no ar'}
                </span>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── CATEGORIES ───────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader title="Categorias" subtitle="Encontre o que colecionadores buscam" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat, i) => {
              // Categoria sem nenhum anúncio no ar não vira link: no lançamento,
              // clicar levava a uma página vazia. Fica visível (a marca é mais
              // que diecast) mas marcada como "em breve". Assim que o primeiro
              // anúncio da categoria for aprovado, ela volta a ser clicável
              // sozinha, sem precisar mexer aqui.
              const qtd = secoes.porCategoria[cat.slug] ?? 0;
              const vazia = !isLoading && qtd === 0;

              const miolo = (
                <>
                  {/* Arte duotone da categoria (mesma da landing, via category-art) */}
                  <div className="relative aspect-square overflow-hidden bg-black">
                    <img
                      src={categoryArt(cat.slug)}
                      alt=""
                      aria-hidden="true"
                      className={`h-full w-full object-cover transition-transform duration-500 ${
                        vazia ? 'opacity-40 grayscale' : 'group-hover:scale-105'
                      }`}
                    />
                    {vazia && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[10px] font-semibold uppercase tracking-widest text-white/70">
                        Em breve
                      </span>
                    )}
                  </div>
                  <div className="p-3 text-center">
                    <span
                      className={`block font-heading text-sm font-semibold uppercase tracking-wider transition-colors ${
                        vazia ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary'
                      }`}
                    >
                      {cat.name}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                      {qtd > 0 ? `${qtd} ${qtd === 1 ? 'item' : 'itens'}` : cat.description}
                    </span>
                  </div>
                </>
              );

              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                >
                  {vazia ? (
                    <div
                      aria-disabled="true"
                      className="block cursor-default overflow-hidden rounded-lg border border-dashed border-border bg-card"
                    >
                      {miolo}
                    </div>
                  ) : (
                    <Link
                      to={`/categoria/${cat.slug}`}
                      className="group block overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:border-primary/40"
                    >
                      {miolo}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FEATURED ─────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-dark">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <>
              <SectionHeader
                title="Em Destaque"
                subtitle="O melhor do catálogo, de lojas diferentes"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-card rounded-lg h-[340px] border border-border" />
                ))}
              </div>
            </>
          ) : secoes.destaque.length > 0 ? (
            <>
              <SectionHeader
                title="Em Destaque"
                subtitle="O melhor do catálogo, de lojas diferentes"
                action={{ label: 'Ver todos', href: '/busca' }}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {secoes.destaque.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i, 4) * 0.08, duration: 0.5 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <>
              <SectionHeader
                title="Em Destaque"
                subtitle="O melhor do catálogo, de lojas diferentes"
              />
              <div className="text-center py-12 mb-8">
                <h3 className="font-heading text-2xl font-bold uppercase italic text-foreground mb-2">Produtos chegando em breve</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">Estamos preparando uma coleção incrível. Seja o primeiro a saber.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center justify-center gap-3 bg-kolecta-dark border border-dashed border-border rounded-lg h-[240px] p-6">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground/70 uppercase tracking-wider font-semibold">Em breve</span>
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" asChild>
                  <Link to="/criar-conta">Me avisar</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── MODO LANCE ───────────────────────────────── */}
      {/* Só aparece quando há leilão aberto. Uma seção de leilão vazia é pior
          que seção nenhuma: anuncia um recurso e entrega uma prateleira sem
          nada. O countdown já vem dentro do ProductCard. */}
      {secoes.leiloes.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Modo Lance"
              subtitle="Leilões abertos agora, o que termina antes primeiro"
              action={{ label: 'Ver todos', href: '/modo-lance' }}
              accentTitle
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {secoes.leiloes.slice(0, 5).map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── NOVIDADES ────────────────────────────────── */}
      {/* O grande volume da home. Antes ela mostrava 5 itens de 136: quem
          entrava não tinha o que percorrer e saía achando o catálogo vazio. */}
      {secoes.novidades.length > 0 && (
        <section className="py-16 lg:py-20 bg-gradient-dark">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Chegou agora"
              subtitle="Os anúncios mais recentes dos nossos vendedores"
              action={{ label: 'Ver tudo', href: '/busca' }}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {secoes.novidades.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  // O atraso trava no quinto card: escalonar 20 itens deixava
                  // a última fileira aparecendo quase dois segundos depois.
                  transition={{ delay: Math.min(i % 5, 4) * 0.06, duration: 0.4 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" asChild>
                <Link to="/busca">
                  Ver o catálogo completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── LOJAS ────────────────────────────────────── */}
      {/* Prova social que a home não tinha: quem está vendendo aqui e com
          quantos itens. Número real, tirado do catálogo, sem inventar métrica. */}
      {secoes.lojas.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Lojas na Kolecta"
              subtitle="Vendedores com itens no ar agora"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {secoes.lojas.map((loja, i) => (
                <motion.div
                  key={loja.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i, 4) * 0.05, duration: 0.4 }}
                >
                  <Link
                    to={`/vendedor/${loja.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
                  >
                    <img
                      src={loja.capa}
                      alt=""
                      aria-hidden="true"
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <span className="block truncate font-heading text-sm font-semibold uppercase tracking-wide text-foreground transition-colors group-hover:text-primary">
                        {loja.nome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {loja.itens} {loja.itens === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── COMUNIDADE ───────────────────────────────── */}
      {/* A Comunidade existe desde antes do lançamento e vivia só no menu, onde
          ninguém tropeça nela. Aqui ela aparece no caminho de quem já está
          rolando a home, com convite direto para publicar. */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            title="Comunidade"
            subtitle="Mostre a coleção, tire dúvida, ache quem coleciona o mesmo que você"
            action={{ label: 'Ver a comunidade', href: '/comunidade' }}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Convite primeiro: a seção existe para gerar post, não só para
                mostrar o que já tem. */}
            <div className="flex flex-col justify-between rounded-lg border border-primary/30 bg-primary/5 p-6">
              <div>
                <MessagesSquare className="mb-3 h-7 w-7 text-primary" />
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider">
                  Publique a sua
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Foto da estante, aquela peça que você caçou por meses, dúvida sobre
                  originalidade. Colecionador gosta de ver coleção dos outros.
                </p>
              </div>
              <Button variant="kolecta" className="mt-5 w-full" asChild>
                <Link to="/comunidade">Publicar na comunidade</Link>
              </Button>
            </div>

            {/* Posts recentes. Com a comunidade nova, é normal ter pouca coisa:
                melhor mostrar dois de verdade do que encher com invenção. */}
            {postsDaComunidade.slice(0, 2).map((post) => (
              <Link
                key={post.id}
                to="/comunidade"
                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
              >
                {post.images?.[0] && (
                  <div className="aspect-[16/10] overflow-hidden bg-secondary">
                    <img
                      src={post.images[0]}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-medium leading-snug transition-colors group-hover:text-primary">
                    {post.title}
                  </h3>
                  {post.body && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
                  )}
                  <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
                    <span className="truncate">{post.author?.name || 'Colecionador'}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.likeCount}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {post.commentCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── POR QUE VENDER AQUI ──────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader title="Por que vender na Kolecta?" subtitle="A plataforma feita para quem leva colecionáveis a sério" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-10 max-w-5xl mx-auto">
            <div className="flex gap-4 p-6 rounded-lg border border-border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-2">Comissão justa</h3>
                <p className="text-sm text-muted-foreground">Apenas {COMMISSION_LABEL} por venda. Sem mensalidade, sem taxa de cadastro.</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-6 rounded-lg border border-border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-2">Vendedores verificados</h3>
                <p className="text-sm text-muted-foreground">Processo de verificação que gera confiança no comprador.</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-6 rounded-lg border border-border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-2">Base qualificada</h3>
                <p className="text-sm text-muted-foreground">Compradores colecionadores, focados no nicho. Quem entra aqui veio pra comprar.</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-6 rounded-lg border border-border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-2">Frete integrado</h3>
                <p className="text-sm text-muted-foreground">Cotação automática via Melhor Envio. Você só cuida do produto.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Button variant="kolecta" size="lg" asChild>
              <Link to="/painel/anuncios/novo">
                Quero ser parceiro
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-dark">
        <div className="container mx-auto px-4">
          <SectionHeader title="Como Funciona" subtitle="Simples, seguro e rápido" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Search,
                // "milhares de itens" não se sustenta num catálogo que abre com
                // pouco mais de cem. Promessa que o site não cumpre na primeira
                // rolagem custa mais confiança do que ganha.
                title: 'Encontre',
                desc: 'Busque por peça, linha ou vendedor, ou dê lances em itens raros no Modo Lance.',
              },
              {
                icon: ShieldCheck,
                title: 'Negocie com Segurança',
                desc: 'Vendedores verificados, pagamento protegido e sistema de disputas justo.',
              },
              {
                icon: Package,
                title: 'Receba em Casa',
                desc: 'Acompanhe seu pedido e receba seu item com rastreamento completo.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="text-center p-6 rounded-lg border border-border bg-card"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ───────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto p-10 rounded-xl border border-primary/30 bg-kolecta-dark text-white glow-primary"
          >
            <TrendingUp className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold italic uppercase mb-3">
              Tem algo para <span className="text-primary">vender</span>?
            </h2>
            <p className="text-white/60 mb-6">
              Anuncie seus itens colecionáveis e alcance milhares de compradores. Comece em minutos.
            </p>
            <Button variant="kolecta" size="lg" className="text-base px-8" asChild>
              <Link to="/painel/anuncios/novo">
                Criar Anúncio Grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}

// ─── Section Header ──────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  action,
  accentTitle,
}: {
  title: string;
  subtitle: string;
  action?: { label: string; href: string };
  accentTitle?: boolean;
}) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className={`font-heading text-2xl sm:text-3xl font-extrabold italic uppercase ${accentTitle ? 'text-accent' : 'text-foreground'}`}>
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {action && (
        <Link
          to={action.href}
          className="hidden sm:flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Search, TrendingUp, Package, Users, Loader2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProductCondition, Product } from '@/lib/mock-data';
import type { Listing } from '@/lib/api';
import { isListingFeatured } from '@/lib/api';
import { useListings } from '@/hooks/use-api';
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

  // Busca uma folga porque só anúncio aprovado vai à vitrine e a API devolve
  // qualquer status: pedindo 8 exatos, a home podia ficar quase vazia.
  const { data: listingsData, isLoading } = useListings(40);
  const products = onlyPublic(listingsData ?? []).slice(0, 8);
  
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

  const apiFeatured: Product[] = products.map((l: Listing) => ({
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
      verified: true,
      rating: 5,
      totalSales: 10,
      location: '',
      since: '',
    },
    description: l.description ?? '',
    details: {},
    featured: isListingFeatured(l),
    tags: [],
    status: l.status,
    createdAt: l.createdAt,
    // Leilão: sem estes campos o card cai no `|| 0` e mostra "R$ 0,00" mesmo
    // num leilão de R$ 3.100. O backend passou a mandá-los na listagem.
    startingBid:
      l.startingBidInCents != null ? l.startingBidInCents / 100 : undefined,
    currentBid:
      l.currentBidInCents != null ? l.currentBidInCents / 100 : undefined,
    bidsCount: l.bidsCount ?? 0,
    auctionEndsAt: l.endsAt ?? undefined,
  }));

  return (
    <Layout>
      {/* ─── HERO ─────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
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
              className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto mb-4"
            >
              Compre, venda e dê lances em miniaturas diecast, cards e artigos exclusivos. Plataforma criada por colecionadores, para colecionadores.
            </motion.p>
            
            <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-1.5 mb-8 text-[11px] text-white/60">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Pagamento protegido · Vendedores verificados</span>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="kolecta" size="lg" className="text-base px-8" asChild>
                <Link to="/busca">
                  <Search className="h-5 w-5 mr-2" />
                  Explorar coleção
                </Link>
              </Button>
              <Button variant="ghost-light" size="lg" className="text-base px-8 text-white border-white/20 hover:bg-white/10" asChild>
                <Link to="/painel/anuncios/novo">
                  Quero ser parceiro
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── CATEGORIES ───────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader title="Categorias" subtitle="Encontre o que colecionadores buscam" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Link
                  to={`/categoria/${cat.slug}`}
                  className="group block overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:border-primary/40"
                >
                  {/* Arte duotone da categoria (mesma da landing, via category-art) */}
                  <div className="relative aspect-square overflow-hidden bg-black">
                    <img
                      src={categoryArt(cat.slug)}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3 text-center">
                    <span className="block font-heading text-sm font-semibold uppercase tracking-wider text-foreground transition-colors group-hover:text-primary">
                      {cat.name}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                      {cat.description}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
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
                subtitle="Selecionados pela curadoria Kolecta"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-card rounded-lg h-[340px] border border-border" />
                ))}
              </div>
            </>
          ) : apiFeatured.length > 0 ? (
            <>
              <SectionHeader
                title="Em Destaque"
                subtitle="Selecionados pela curadoria Kolecta"
                action={{ label: 'Ver todos', href: '/busca' }}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {apiFeatured.slice(0, 5).map((product, i) => (
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
            </>
          ) : (
            <>
              <SectionHeader
                title="Em Destaque"
                subtitle="Selecionados pela curadoria Kolecta"
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
                title: 'Encontre',
                desc: 'Navegue por milhares de itens colecionáveis ou dê lances em itens exclusivos.',
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

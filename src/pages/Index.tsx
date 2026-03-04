import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Gavel, ShieldCheck, Search, TrendingUp, Star, Package } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import AuctionCountdown from '@/components/AuctionCountdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockProducts, mockCategories, mockSellers, getAuctionProducts, getFeaturedProducts, formatBRL } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';
import heroBg from '@/assets/hero-bg.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
};

export default function Index() {
  useEffect(() => {
    trackEvent('view_home');
  }, []);

  const featured = getFeaturedProducts();
  const auctions = getAuctionProducts().sort(
    (a, b) => new Date(a.auctionEndsAt!).getTime() - new Date(b.auctionEndsAt!).getTime()
  );
  const verifiedSellers = mockSellers.filter((s) => s.verified);

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
              className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto mb-8"
            >
              Compre, venda e dê lances em carrinhos, miniaturas e artigos exclusivos. Comunidade verificada, transações seguras.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="kolecta" size="lg" className="text-base px-8" asChild>
                <Link to="/busca">
                  <Search className="h-5 w-5" />
                  Explorar
                </Link>
              </Button>
              <Button variant="ghost-light" size="lg" className="text-base px-8 text-white border-white/20 hover:bg-white/10" asChild>
                <Link to="/painel-vendedor/anuncios/novo">
                  Anunciar Item
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            variants={fadeUp}
            custom={5}
            initial="hidden"
            animate="visible"
            className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto"
          >
            {[
              { value: '3.5K+', label: 'Itens' },
              { value: '890+', label: 'Colecionadores' },
              { value: '12K+', label: 'Lances' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CATEGORIES ───────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader title="Categorias" subtitle="Encontre o que colecionadores buscam" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {mockCategories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Link
                  to={`/categoria/${cat.slug}`}
                  className="group flex flex-col items-center gap-3 p-5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all duration-300"
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="font-heading text-sm font-semibold uppercase tracking-wider text-center text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{cat.count} itens</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED ─────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-dark">
        <div className="container mx-auto px-4">
          <SectionHeader
            title="Destaques"
            subtitle="Selecionados pela curadoria Kolecta"
            action={{ label: 'Ver todos', href: '/busca?sort=featured' }}
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {featured.slice(0, 5).map((product, i) => (
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

      {/* ─── AUCTIONS ENDING SOON ─────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            title="Encerrando em Breve"
            subtitle="Não perca — últimos minutos para dar lance"
            action={{ label: 'Ver todos', href: '/modo-lance' }}
            accentTitle
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.slice(0, 3).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:border-accent/30 transition-all group">
                  <Link to={`/produto/${product.id}`} className="shrink-0 w-28 h-28 rounded-md overflow-hidden bg-kolecta-dark">
                    <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/produto/${product.id}`}>
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors">{product.title}</h3>
                    </Link>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-heading text-xl font-bold text-accent">{formatBRL(product.currentBid || 0)}</span>
                      <span className="text-[10px] text-muted-foreground">{product.bidsCount} lances</span>
                    </div>
                    <div className="mt-2">
                      <AuctionCountdown endsAt={product.auctionEndsAt!} compact />
                    </div>
                    <Button variant="accent" size="sm" className="mt-2 text-xs h-7" asChild>
                      <Link to={`/produto/${product.id}`}>
                        <Gavel className="h-3 w-3" />
                        Dar Lance
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VERIFIED SELLERS ─────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-dark">
        <div className="container mx-auto px-4">
          <SectionHeader title="Vendedores Verificados" subtitle="Colecionadores de confiança" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {verifiedSellers.map((seller, i) => (
              <motion.div
                key={seller.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Link
                  to={`/vendedor/${seller.slug}`}
                  className="group flex flex-col items-center gap-3 p-5 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                    <span className="font-heading text-xl font-bold text-foreground">{seller.name[0]}</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{seller.name}</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 justify-center mt-1 text-[11px] text-muted-foreground">
                      <Star className="h-3 w-3 text-primary fill-primary" />
                      {seller.rating}
                      <span>·</span>
                      {seller.totalSales} vendas
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────── */}
      <section className="py-16 lg:py-20">
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
      <section className="py-16 lg:py-20 bg-gradient-dark">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto p-10 rounded-xl border border-primary/20 bg-card glow-primary"
          >
            <TrendingUp className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold italic uppercase mb-3">
              Tem algo para <span className="text-primary">vender</span>?
            </h2>
            <p className="text-muted-foreground mb-6">
              Anuncie seus itens colecionáveis e alcance milhares de compradores. Comece em minutos.
            </p>
            <Button variant="kolecta" size="lg" className="text-base px-8" asChild>
              <Link to="/painel-vendedor/anuncios/novo">
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

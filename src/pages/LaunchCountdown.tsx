import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, Award, Rocket, Percent,
  Sparkles, MessagesSquare, Store, ClipboardCheck, Timer, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FounderMedal, FounderBadge } from '@/components/FounderBadge';
import { getCountdown, getLaunchDate, type Countdown } from '@/lib/launch';
import kolectaLogo from '@/assets/kolecta-logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import miniGtNsx from '@/assets/mini-gt-nsx.webp';
import photoDiecast from '@/assets/categories/photo-diecast.webp';
import photoCards from '@/assets/categories/photo-cards.webp';
import photoActionFigures from '@/assets/categories/photo-action-figures.webp';
import photoFunko from '@/assets/categories/photo-funko.webp';
import photoMangas from '@/assets/categories/photo-mangas.webp';

// ─── Config da campanha de Fundador ──────────────────────────
// Números da oferta em um só lugar. Ajuste aqui, o layout acompanha.
const TOTAL_FOUNDERS = 100;
const STANDARD_FEE = '11%';
const FOUNDER_FEE = '9%';
const FEE_MONTHS = 6;
const HIGHLIGHT_CREDITS = 5;
const CREDIT_DAYS = 7;
const REQUIRED_LISTINGS = 3;

const FOUNDER_PERKS = [
  {
    icon: Award,
    title: 'Selo de Fundador numerado',
    desc: `Seu número fica no perfil e nos anúncios pra sempre. São só ${TOTAL_FOUNDERS} no mundo. Quem chegar depois do lançamento nunca mais consegue um.`,
    tag: 'Permanente',
  },
  {
    icon: Percent,
    title: `Taxa de ${FOUNDER_FEE} em vez de ${STANDARD_FEE}`,
    desc: `Comissão reduzida durante os ${FEE_MONTHS} primeiros meses de plataforma. Depois, volta para a taxa padrão de ${STANDARD_FEE}.`,
    tag: `${FEE_MONTHS} meses`,
  },
  {
    icon: Sparkles,
    title: `${HIGHLIGHT_CREDITS} créditos de destaque grátis`,
    desc: `Cada crédito coloca um anúncio seu em destaque por ${CREDIT_DAYS} dias. São ${HIGHLIGHT_CREDITS} semanas de vitrine por nossa conta.`,
    tag: 'No lançamento',
  },
  {
    icon: Rocket,
    title: 'Estreia em destaque no dia 25',
    desc: 'Quando a plataforma abrir, sua loja já entra no ar cheia, enquanto os outros começam do zero.',
    tag: 'No lançamento',
  },
  {
    icon: MessagesSquare,
    title: 'Canal de Fundadores',
    desc: 'Grupo fechado com o time. Sua opinião entra na fila do que a gente constrói primeiro.',
    tag: 'Permanente',
  },
];

const HOW_IT_WORKS = [
  {
    icon: Store,
    title: 'Crie sua conta',
    desc: 'Leva um minuto e é grátis. Só existem 100 vagas de Fundador.',
  },
  {
    icon: ClipboardCheck,
    title: `Suba ${REQUIRED_LISTINGS} anúncios`,
    desc: `É o que garante sua vaga: Fundador é benefício de lojista. Os anúncios ficam em análise enquanto a plataforma não abre.`,
  },
  {
    icon: Timer,
    title: 'Estreie no lançamento',
    desc: 'No dia 25 sua loja abre no ar, com o selo e os créditos de destaque na mão.',
  },
];

// Cada categoria é uma FOTO real do colecionável (moldura circular dourada) com
// o nome escrito POR CIMA em duas linhas: `line1` branca, `line2` dourada.
// `name` é o texto alternativo completo (leitor de tela / SEO).
const CATEGORIES = [
  { name: 'Miniaturas Diecast', line1: 'Miniaturas', line2: 'Diecast', photo: photoDiecast },
  { name: 'Cards Colecionáveis', line1: 'Cards', line2: 'Colecionáveis', photo: photoCards },
  { name: 'Action Figures', line1: 'Action', line2: 'Figures', photo: photoActionFigures },
  { name: 'Funko Pop', line1: 'Funko', line2: 'Pop', photo: photoFunko },
  { name: 'Mangás & HQs', line1: 'Mangás', line2: '& HQs', photo: photoMangas },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' as const },
  }),
};

/** "25 de julho" a partir da data configurada (fuso de Brasília). */
function formatLaunchLabel(): string {
  const d = getLaunchDate();
  if (!d) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

const pad = (n: number) => String(n).padStart(2, '0');

function TimerBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-[72px] sm:w-24 rounded-xl border border-primary/25 bg-kolecta-dark/70 backdrop-blur-sm px-2 py-4 sm:py-5 shadow-lg shadow-black/40">
        <span className="block font-heading text-4xl sm:text-5xl font-extrabold italic text-primary text-glow-primary tabular-nums leading-none">
          {value}
        </span>
      </div>
      <span className="mt-2 text-[10px] sm:text-xs font-heading uppercase tracking-widest text-white/50">
        {label}
      </span>
    </div>
  );
}

function SignupCta({ label = 'Quero ser Fundador' }: { label?: string }) {
  return (
    <Button variant="kolecta" size="lg" className="text-base px-10" asChild>
      <Link to="/criar-conta">
        {label}
        <ArrowRight className="h-5 w-5 ml-2" />
      </Link>
    </Button>
  );
}

/** Mock de card de anúncio. Só ilustração da landing, não usa dados reais. */
function MockListingCard({ featured }: { featured?: boolean }) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden border bg-kolecta-dark ${
        featured ? 'border-primary/60 glow-primary' : 'border-white/10'
      }`}
    >
      {featured && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-primary text-primary-foreground text-center py-1">
          <span className="font-heading text-[10px] font-bold uppercase tracking-widest">
            ⭐ Em destaque
          </span>
        </div>
      )}

      {/* Foto do produto */}
      <div className="aspect-square overflow-hidden bg-black/40">
        <img
          src={miniGtNsx}
          alt="Miniatura Mini GT Honda NSX Type R na escala 1:64"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-3 space-y-2">
        <p className="text-sm text-white/90 leading-snug line-clamp-2">
          Mini GT Honda NSX Type R 1:64
        </p>
        <p className="font-heading text-xl font-extrabold italic text-primary">R$ 189,90</p>
        <div className="pt-2 border-t border-white/10 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50">por Ricardo M.</span>
          <FounderBadge number={7} />
        </div>
      </div>
    </div>
  );
}

export default function LaunchCountdown() {
  const [time, setTime] = useState<Countdown>(() => getCountdown());
  const launchLabel = formatLaunchLabel();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Kolecta · Seja um Fundador' + (launchLabel ? ` · Lançamento ${launchLabel}` : '');
    return () => {
      document.title = prev;
    };
  }, [launchLabel]);

  useEffect(() => {
    const id = setInterval(() => setTime(getCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-kolecta-dark text-white">
      {/* ─── HERO ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-kolecta-dark via-kolecta-dark/90 to-kolecta-dark/70" />
          <div className="absolute inset-0 bg-carbon-texture opacity-30" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-2xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} custom={0}>
            <img src={kolectaLogo} alt="Kolecta" className="h-10 sm:h-12 w-auto mx-auto mb-8" />
          </motion.div>

          <motion.div variants={fadeUp} custom={1}>
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 font-heading uppercase tracking-widest text-xs px-4 py-1.5">
              Pré-lançamento · Apenas {TOTAL_FOUNDERS} vagas
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={2}
            className="font-heading text-4xl sm:text-6xl font-extrabold italic uppercase leading-[0.9] mb-5 text-white"
          >
            Seja um dos {TOTAL_FOUNDERS}{' '}
            <span className="text-primary text-glow-primary">Fundadores</span> da Kolecta
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={3}
            className="text-base sm:text-lg text-white/60 max-w-lg mx-auto mb-6"
          >
            O point dos colecionadores abre {launchLabel ? <>em <strong className="text-white/80">{launchLabel}</strong></> : 'em breve'}.
            Entre agora, monte sua loja e garanta as vantagens de Fundador que ninguém mais vai ter.
          </motion.p>

          {/* Faixa de benefícios: o que ganha, na cara, sem precisar rolar */}
          <motion.div
            variants={fadeUp}
            custom={4}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8"
          >
            {[
              { icon: Award, label: 'Selo numerado' },
              { icon: Percent, label: 'Taxa reduzida' },
              { icon: Sparkles, label: `${HIGHLIGHT_CREDITS} destaques grátis` },
            ].map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5"
              >
                <b.icon className="h-3.5 w-3.5 text-primary" />
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-white/90">
                  {b.label}
                </span>
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={5}
            className="flex items-start justify-center gap-2 sm:gap-4 mb-8"
            aria-hidden="true"
          >
            <TimerBlock value={String(time.days)} label="Dias" />
            <span className="font-heading text-4xl sm:text-5xl text-primary/40 pt-3">:</span>
            <TimerBlock value={pad(time.hours)} label="Horas" />
            <span className="font-heading text-4xl sm:text-5xl text-primary/40 pt-3">:</span>
            <TimerBlock value={pad(time.minutes)} label="Min" />
            <span className="font-heading text-4xl sm:text-5xl text-primary/40 pt-3">:</span>
            <TimerBlock value={pad(time.seconds)} label="Seg" />
          </motion.div>

          <motion.div variants={fadeUp} custom={6} className="flex flex-col items-center gap-4">
            <SignupCta />
            <Link to="/entrar" className="text-sm text-white/50 hover:text-white/80 transition-colors">
              Já tem conta? Entrar
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={7}
            className="flex items-center justify-center gap-1.5 mt-10 text-[11px] text-white/40"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Pagamento protegido · Vendedores verificados</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── O SELO (vitrine visual) ───────────────────── */}
      <section className="py-16 lg:py-24 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <FounderMedal number={7} size={180} />
            </motion.div>

            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-heading uppercase tracking-widest text-xs px-4 py-1.5">
                Seu selo
              </Badge>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold italic uppercase mb-4">
                Um número que <span className="text-primary">ninguém</span> mais vai ter
              </h2>
              <p className="text-white/60 mb-4">
                Cada Fundador recebe um número único, de #001 a #{TOTAL_FOUNDERS}. Ele fica no seu perfil
                e em todos os seus anúncios, pra sempre.
              </p>
              <p className="text-white/40 text-sm">
                Quanto mais cedo você entra, menor o seu número. E colecionador sabe o que vale
                um número baixo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMO APARECE NO ANÚNCIO ──────────────────── */}
      <section className="py-16 lg:py-24 bg-kolecta-carbon border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold italic uppercase mb-3">
              Como vai <span className="text-primary">aparecer</span>
            </h2>
            <p className="text-white/60">
              Seu selo em cada anúncio. E, com os créditos de destaque, sua peça no topo da vitrine.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
            <div>
              <MockListingCard />
              <p className="text-center text-xs text-white/40 mt-3">Anúncio normal, com seu selo</p>
            </div>
            <div>
              <MockListingCard featured />
              <p className="text-center text-xs text-primary/70 mt-3">
                Com crédito de destaque · {CREDIT_DAYS} dias
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-white/30 mt-8">
            Ilustração do produto. O layout final pode variar.
          </p>
        </div>
      </section>

      {/* ─── BENEFÍCIOS ───────────────────────────────── */}
      <section className="py-16 lg:py-24 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-heading uppercase tracking-widest text-xs px-4 py-1.5">
              O que é ser Fundador
            </Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold italic uppercase mb-3">
              Só quem entra <span className="text-primary">antes</span> tem
            </h2>
            <p className="text-white/60">
              É de graça. São {TOTAL_FOUNDERS} vagas e elas fecham no lançamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 max-w-4xl mx-auto">
            {FOUNDER_PERKS.map((perk, i) => (
              <motion.div
                key={perk.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                className="flex gap-4 p-6 rounded-lg border border-white/10 bg-white/5 hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <perk.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-heading text-lg font-bold uppercase tracking-wider">{perk.title}</h3>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/80 uppercase tracking-wider">
                      {perk.tag}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/60">{perk.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO GARANTIR A VAGA ─────────────────────── */}
      <section className="py-16 lg:py-24 bg-kolecta-carbon border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold italic uppercase mb-3">
              Como garantir sua <span className="text-primary">vaga</span>
            </h2>
            <p className="text-white/60">
              Fundador é benefício de <strong className="text-white/80">lojista</strong>. Não basta se
              cadastrar: precisa mostrar que você veio vender.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-10">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative text-center p-6 rounded-lg border border-white/10 bg-white/5"
              >
                <span className="absolute top-4 right-5 font-heading text-3xl font-extrabold italic text-white/10">
                  {i + 1}
                </span>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-2">{step.title}</h3>
                <p className="text-sm text-white/60">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Regra, em texto claro */}
          <div className="max-w-2xl mx-auto p-5 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex gap-3">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-white/70">
                <strong className="text-white">A regra:</strong> sua vaga de Fundador é confirmada
                quando você tiver <strong className="text-white">{REQUIRED_LISTINGS} anúncios enviados</strong> antes
                do lançamento. Depois, para manter a taxa de {FOUNDER_FEE} e os créditos, basta seguir com
                anúncios ativos. <span className="text-white/50">O selo, esse é seu pra sempre.</span>
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <SignupCta label="Garantir minha vaga" />
          </div>
        </div>
      </section>

      {/* ─── CATEGORIAS ───────────────────────────────── */}
      <section className="py-16 lg:py-24 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold italic uppercase mb-3">
            O que você vai vender aqui
          </h2>
          <p className="text-white/60 max-w-xl mx-auto mb-12">
            Compra direta e modo lance nas categorias mais fortes do colecionismo.
          </p>

          {/* Arte duotone do colecionável sangrando no quadro, com a moldura
              gráfica da marca (cantoneiras + chevron) e o nome grande por cima:
              linha 1 branca, linha 2 dourada. Texto é HTML: alinha e nunca erra. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="group relative aspect-square overflow-hidden rounded-xl bg-black"
              >
                {/* Arte preenchendo o quadro */}
                <img
                  src={cat.photo}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Escurece pro texto ler + leve lavagem dourada da marca */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/60" />
                <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />

                {/* Cantoneiras douradas (moldura gráfica) */}
                <span className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 border-l-2 border-t-2 border-primary/80" />
                <span className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 border-r-2 border-t-2 border-primary/80" />
                <span className="pointer-events-none absolute bottom-2.5 left-2.5 h-4 w-4 border-b-2 border-l-2 border-primary/80" />
                <span className="pointer-events-none absolute bottom-2.5 right-2.5 h-4 w-4 border-b-2 border-r-2 border-primary/80" />

                {/* Nome sobreposto */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" aria-hidden="true" className="mb-1 opacity-90">
                    <path d="M3 1 L12 8 L21 1" stroke="hsl(var(--kolecta-gold))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 8 L12 15 L21 8" stroke="hsl(var(--kolecta-gold))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                  </svg>

                  <span className="block font-heading text-2xl sm:text-3xl font-extrabold italic uppercase leading-[0.8] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    {cat.line1}
                  </span>

                  <span className="mt-1.5 inline-block border-b-2 border-primary pb-0.5 font-heading text-sm sm:text-base font-extrabold italic uppercase leading-none tracking-tight text-primary text-glow-primary">
                    {cat.line2}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ────────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-kolecta-carbon border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto p-10 rounded-xl border border-primary/30 bg-kolecta-dark glow-primary"
          >
            <Award className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold italic uppercase mb-3">
              São {TOTAL_FOUNDERS}. Depois <span className="text-primary">fecha</span>.
            </h2>
            <p className="text-white/60 mb-6">
              Passou do dia {launchLabel || '25'}, não tem como voltar atrás e virar Fundador. Entre agora, é grátis.
            </p>
            <SignupCta />
          </motion.div>
        </div>
      </section>

      {/* ─── Rodapé ───────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <img src={kolectaLogo} alt="Kolecta" className="h-6 w-auto opacity-60" />
          <div className="flex items-center gap-4 text-xs text-white/40">
            <Link to="/termos" className="hover:text-white/70 transition-colors">Termos</Link>
            <span className="text-white/20">·</span>
            <Link to="/privacidade" className="hover:text-white/70 transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

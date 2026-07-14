import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCountdown, getLaunchDate, type Countdown } from '@/lib/launch';
import kolectaLogo from '@/assets/kolecta-logo.png';
import heroBg from '@/assets/hero-bg.jpg';

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

export default function LaunchCountdown() {
  const [time, setTime] = useState<Countdown>(() => getCountdown());
  const launchLabel = formatLaunchLabel();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Kolecta — Em breve' + (launchLabel ? ` · Lançamento ${launchLabel}` : '');
    return () => {
      document.title = prev;
    };
  }, [launchLabel]);

  useEffect(() => {
    const id = setInterval(() => setTime(getCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-kolecta-dark via-kolecta-dark/90 to-kolecta-dark/70" />
        <div className="absolute inset-0 bg-carbon-texture opacity-30" />
      </div>

      {/* Content */}
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
            Marketplace de Colecionáveis
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          custom={2}
          className="font-heading text-4xl sm:text-6xl font-extrabold italic uppercase leading-[0.9] mb-5 text-white"
        >
          Estamos <span className="text-primary text-glow-primary">chegando</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          custom={3}
          className="text-base sm:text-lg text-white/60 max-w-lg mx-auto mb-10"
        >
          O point dos colecionadores abre {launchLabel ? <>em <strong className="text-white/80">{launchLabel}</strong></> : 'em breve'}.
          Crie sua conta agora e seja o primeiro a explorar quando lançarmos.
        </motion.p>

        {/* Timer */}
        <motion.div
          variants={fadeUp}
          custom={4}
          className="flex items-start justify-center gap-2 sm:gap-4 mb-10"
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

        <motion.div variants={fadeUp} custom={5} className="flex flex-col items-center gap-4">
          <Button variant="kolecta" size="lg" className="text-base px-10" asChild>
            <Link to="/criar-conta">
              Criar conta
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
          <Link
            to="/entrar"
            className="text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Já tem conta? Entrar
          </Link>
        </motion.div>

        <motion.div
          variants={fadeUp}
          custom={6}
          className="flex items-center justify-center gap-1.5 mt-10 text-[11px] text-white/40"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>By Artminis · 4 anos no nicho · 15K colecionadores</span>
        </motion.div>
      </motion.div>

      {/* Rodapé minimalista */}
      <div className="relative z-10 mt-12 flex items-center gap-4 text-xs text-white/40">
        <Link to="/termos" className="hover:text-white/70 transition-colors">Termos</Link>
        <span className="text-white/20">·</span>
        <Link to="/privacidade" className="hover:text-white/70 transition-colors">Privacidade</Link>
      </div>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { AVISOS, marcarVisto, proximoAviso, type ChaveAviso } from '@/lib/novidades';

// ─── Coach mark ──────────────────────────────────────────────────────────────
//
// O balãozinho que apresenta uma novidade apontando para onde clicar. Aparece
// UMA vez por pessoa (ver lib/novidades) e some depois de visto.
//
// Envolve o alvo em vez de flutuar solto na tela: assim ele segue o botão em
// qualquer resolução, sem cálculo de coordenada que quebra quando o header
// muda de tamanho.

interface CoachMarkProps {
  /** Qual novidade este balão anuncia. */
  aviso: ChaveAviso;
  /**
   * Todas as novidades que PODEM aparecer nesta página. Garante um balão por
   * vez: numa página que tem tema e KPV, só o de maior prioridade abre.
   */
  candidatas?: ChaveAviso[];
  titulo: string;
  texto: string;
  /** Onde o balão fica em relação ao alvo. O header fica no topo, então nele
   *  o balão desce ('baixo'); num card no meio da página, sobe ('cima'). */
  posicao?: 'baixo' | 'cima';
  /** Encosta o balão à direita, para não vazar da tela num alvo perto da borda. */
  alinhamento?: 'esquerda' | 'direita';
  children: ReactNode;
}

export default function CoachMark({
  aviso,
  candidatas,
  titulo,
  texto,
  posicao = 'baixo',
  alinhamento = 'direita',
  children,
}: CoachMarkProps) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    // Espera meio segundo para não piscar durante o carregamento da página, e
    // para o balão chegar depois que a pessoa já viu a tela assentar.
    const lista = candidatas ?? [aviso];
    const t = setTimeout(() => {
      if (proximoAviso(lista) === aviso) setAberto(true);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aviso]);

  const fechar = () => {
    marcarVisto(aviso);
    setAberto(false);
  };

  const vertical = posicao === 'baixo' ? { top: 'calc(100% + 12px)' } : { bottom: 'calc(100% + 12px)' };
  const horizontal = alinhamento === 'direita' ? { right: 0 } : { left: 0 };
  const setaLado = posicao === 'baixo'
    ? { top: -5, borderTop: '1px solid', borderLeft: '1px solid' }
    : { bottom: -5, borderBottom: '1px solid', borderRight: '1px solid' };

  return (
    <div className="relative inline-flex">
      {/* Clicar no próprio alvo também dispensa: quem já entendeu e usou o
          botão não precisa ver o balão de novo. */}
      <div onClickCapture={() => aberto && fechar()}>{children}</div>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: posicao === 'baixo' ? -6 : 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            role="status"
            className="absolute z-50 w-64 rounded-lg border border-primary/30 bg-card p-3 text-left shadow-xl"
            style={{ ...vertical, ...horizontal }}
          >
            {/* Seta apontando para o alvo. */}
            <span
              aria-hidden="true"
              className="absolute h-2.5 w-2.5 rotate-45 border-primary/30 bg-card"
              style={{ ...setaLado, right: 14 }}
            />
            <div className="flex items-start justify-between gap-2">
              <span className="rounded bg-primary px-1.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                Novidade
              </span>
              <button
                onClick={fechar}
                aria-label="Fechar aviso"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 font-heading text-sm font-bold uppercase tracking-wide text-foreground">
              {titulo}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{texto}</p>
            <button
              onClick={fechar}
              className="mt-2.5 font-heading text-xs font-bold uppercase tracking-wider text-primary hover:underline"
            >
              Entendi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { AVISOS };

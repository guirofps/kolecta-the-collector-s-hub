// ─── Referência de preço (KPV) no anúncio ────────────────────────────────────
//
// O que o comprador vê para saber se o preço pedido faz sentido, e o que o
// vendedor vê para saber que existe estudo de mercado por trás.
//
// A régua é o elemento central, e é um INSTRUMENTO, não uma barra decorativa:
// mostra a faixa onde o mercado de fato pratica e onde este anúncio caiu dentro
// dela. Vem do mundo da marca, que é automotivo.
//
// Três decisões que o dado impõe:
//
//  1. A faixa tem o mesmo peso da mediana. Um número sozinho finge uma precisão
//     que a amostra não tem: a mesma peça sai por R$ 40 e por R$ 78 no mesmo
//     dia, e as duas vendas são legítimas.
//  2. A nota compara com a FAIXA, não com a mediana. Comparando com a mediana,
//     metade dos vendedores honestos apareceria como "acima do mercado" por
//     definição matemática.
//  3. Nenhum nome de fonte aparece. A procedência fica gravada para auditoria
//     interna; a vitrine da Kolecta não faz propaganda de marketplace alheio.

import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Info, Gauge, X, ShieldCheck } from 'lucide-react';
import { formatBRL } from '@/lib/mock-data';
import { lerKpv, explicarConfianca } from '@/lib/kpv-anuncio';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AVISOS, marcarVisto, proximoAviso } from '@/lib/novidades';

interface KpvCardProps {
  /** `attributes` do anúncio, já parseado. */
  attributes: Record<string, unknown> | null | undefined;
  precoEmCentavos?: number | null;
  /** Muda o texto para a ótica de quem está precificando. */
  modo?: 'comprador' | 'vendedor';
  className?: string;
}

// Cores vêm de tokens com valor próprio em tema claro e escuro (ver index.css).
// O ouro da marca funciona como preenchimento mas some como texto sobre o fundo
// claro do site, então rótulo e ícone usam os semânticos.
const ESTADOS = {
  abaixo: { cor: 'text-kpv-bom', agulha: 'bg-kpv-bom', Icone: TrendingDown },
  dentro: { cor: 'text-foreground', agulha: 'bg-foreground', Icone: Minus },
  acima: { cor: 'text-kpv-alto', agulha: 'bg-kpv-alto', Icone: TrendingUp },
} as const;

// Selo de confiança. Só a alta ganha cor forte; assim o verde significa algo
// quando aparece, em vez de estar em todo card.
const SELO = {
  alta: { rotulo: 'Alta confiança', classe: 'bg-kpv-bom/15 text-kpv-bom' },
  media: { rotulo: 'Confiança média', classe: 'bg-secondary text-muted-foreground' },
  baixa: { rotulo: 'Indicativo', classe: 'bg-secondary text-muted-foreground' },
} as const;

/** Onde um valor cai na régua, de 0 a 100. */
function posicao(valor: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.min(97, Math.max(3, ((valor - min) / (max - min)) * 100));
}

export default function KpvCard({
  attributes, precoEmCentavos, modo = 'comprador', className,
}: KpvCardProps) {
  const kpv = lerKpv(attributes, precoEmCentavos);

  // Primeira vez que a pessoa vê uma referência: destaca o card e explica o que
  // é. Os hooks ficam ANTES do return condicional (regra dos hooks), e só
  // armam quando há card de verdade. O tema tem prioridade, então este aviso
  // espera o botão de tema ser dispensado.
  const [novo, setNovo] = useState(false);
  useEffect(() => {
    if (!kpv) return;
    const t = setTimeout(() => {
      if (proximoAviso([AVISOS.tema, AVISOS.kpv]) === AVISOS.kpv) setNovo(true);
    }, 700);
    return () => clearTimeout(t);
  }, [kpv]);

  const dispensarNovo = () => {
    marcarVisto(AVISOS.kpv);
    setNovo(false);
  };

  // Sem referência confiável não mostra nada. Caixa vazia dizendo "sem dados"
  // só ocupa tela e sugere que faltou alguma coisa.
  if (!kpv) return null;

  const nota = kpv.avaliacao?.nota ?? 'dentro';
  const { cor, agulha, Icone } = ESTADOS[nota];

  // A régua vai um pouco além da faixa dos dois lados, senão um anúncio fora
  // dela ficaria colado na borda sem dar noção de quão longe está.
  const folga = Math.max((kpv.p75EmCentavos - kpv.p25EmCentavos) * 0.8, kpv.medianaEmCentavos * 0.25);
  const min = Math.max(0, kpv.p25EmCentavos - folga);
  const max = kpv.p75EmCentavos + folga;
  const esq = posicao(kpv.p25EmCentavos, min, max);
  const dir = posicao(kpv.p75EmCentavos, min, max);

  return (
    <div
      className={`rounded-lg border bg-card p-4 transition-shadow ${
        novo ? 'border-primary/50 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]' : 'border-border'
      } ${className ?? ''}`}
    >
      {/* Apresentação da novidade, uma vez por pessoa. Fica DENTRO do card, em
          cima, para o olho ir direto ao que é novo em vez de a um balão solto. */}
      {novo && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-primary/10 p-2.5">
          <span className="rounded bg-primary px-1.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
            Novidade
          </span>
          <p className="flex-1 text-xs leading-relaxed text-foreground">
            A Kolecta agora mostra o preço de mercado de cada peça, com base num
            levantamento nosso. Compare antes de fechar negócio.
          </p>
          <button
            onClick={dispensarNovo}
            aria-label="Entendi"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          Referência de mercado
        </span>
        <div className="flex items-center gap-2">
          {/* Selo de confiança: bate o olho e vê. Alta ganha destaque em
              verde com escudo; média e indicativo ficam discretos, para o
              verde não perder o valor de aparecer só quando merece. */}
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SELO[kpv.confianca].classe}`}>
            {kpv.confianca === 'alta' && <ShieldCheck className="h-3 w-3" aria-hidden="true" />}
            {SELO[kpv.confianca].rotulo}
          </span>
          <Tooltip>
          <TooltipTrigger aria-label="Como calculamos a referência">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            A Kolecta levanta o preço praticado nesta mesma peça, sempre nova e
            lacrada. Um preço por vendedor, valores extremos descartados, e a
            mediana como referência.
            {kpv.ressalvas.length > 0 && (
              <span className="mt-1 block text-muted-foreground">{kpv.ressalvas.join('. ')}.</span>
            )}
          </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-heading text-3xl font-extrabold leading-none tabular-nums text-foreground">
          {formatBRL(kpv.medianaEmCentavos / 100)}
        </span>
        <span className="font-heading text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          preço usual
        </span>
      </div>

      {/* ── A régua ── */}
      <div className="mt-4">
        <div className="relative h-7">
          {/* Amplitude inteira, fraca. */}
          <div className="absolute left-0 right-0 top-3 h-[3px] rounded-full bg-border" />
          {/* Miolo: onde a maioria pratica. É o único lugar com o ouro. */}
          <div
            className="absolute top-[9px] h-[7px] rounded-full bg-kpv-faixa/70"
            style={{ left: `${esq}%`, right: `${100 - dir}%` }}
          />
          {/* Traços de escala, como painel de instrumento. */}
          <div className="absolute top-1 h-5 w-px bg-kpv-faixa" style={{ left: `${esq}%` }} />
          <div className="absolute top-1 h-5 w-px bg-kpv-faixa" style={{ left: `${dir}%` }} />
          {/* Ponteiro: onde ESTE anúncio caiu. */}
          {precoEmCentavos != null && precoEmCentavos > 0 && (
            <div
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-0.5"
              style={{ left: `${posicao(precoEmCentavos, min, max)}%` }}
            >
              <span className={`whitespace-nowrap font-heading text-[10px] font-bold uppercase tracking-wide ${cor}`}>
                {modo === 'vendedor' ? 'seu preço' : 'este'}
              </span>
              <span className={`h-4 w-0.5 rounded-full ${agulha}`} />
            </div>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          A maioria fica entre{' '}
          <span className="tabular-nums text-foreground">{formatBRL(kpv.p25EmCentavos / 100)}</span>
          {' '}e{' '}
          <span className="tabular-nums text-foreground">{formatBRL(kpv.p75EmCentavos / 100)}</span>
        </p>
      </div>

      {kpv.avaliacao && (
        <div className={`mt-3 flex items-center gap-1.5 text-sm font-semibold ${cor}`}>
          <Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {modo === 'vendedor' && nota === 'acima' ? 'Seu preço está acima da faixa usual'
              : modo === 'vendedor' && nota === 'abaixo' ? 'Seu preço está abaixo da faixa usual'
              : kpv.avaliacao.texto}
          </span>
          {nota !== 'dentro' && (
            <span className="text-xs font-normal tabular-nums opacity-70">
              {kpv.avaliacao.diferencaPercentual > 0 ? '+' : ''}{kpv.avaliacao.diferencaPercentual}%
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        <span className="rounded bg-primary px-1.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
          Levantamento Kolecta
        </span>
        {/* Confiança vira forma, não só palavra. */}
        <span className="flex items-end gap-[2px]" aria-hidden="true">
          {[3, 6, 9].map((h, i) => (
            <span
              key={h}
              className={`w-[3px] rounded-sm ${i < ({ baixa: 1, media: 2, alta: 3 }[kpv.confianca]) ? 'bg-kpv-faixa' : 'bg-border'}`}
              style={{ height: h }}
            />
          ))}
        </span>
        <span>{explicarConfianca(kpv.confianca, kpv.amostra)}</span>
        {kpv.desatualizada && (
          <span className="w-full text-kpv-alto">Levantamento com mais de 6 meses</span>
        )}
      </div>
    </div>
  );
}

// ─── Referência de preço (KPV) no anúncio ────────────────────────────────────
//
// O que o comprador vê para saber se o preço pedido faz sentido, e o que o
// vendedor vê para saber que existe estudo de mercado por trás.
//
// Duas decisões de interface que vieram do que o dado permite dizer:
//
//  1. Mostra a FAIXA com destaque igual ao da mediana. Um número só passa uma
//     precisão que a amostra não tem, e colecionável tem dispersão real: a
//     mesma peça sai por R$ 40 e por R$ 78 no mesmo dia, e as duas são
//     legítimas.
//  2. Diz de onde veio e de quantos vendedores. Referência sem procedência é
//     opinião com cara de dado, e o vendedor acusado de estar "acima do
//     mercado" tem direito de conferir a conta.

import { TrendingDown, TrendingUp, Minus, Info } from 'lucide-react';
import { formatBRL } from '@/lib/mock-data';
import { lerKpv, explicarConfianca } from '@/lib/kpv-anuncio';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

interface KpvCardProps {
  /** `attributes` do anúncio, já parseado. */
  attributes: Record<string, unknown> | null | undefined;
  precoEmCentavos?: number | null;
  className?: string;
}

const CORES = {
  abaixo: { texto: 'text-primary', fundo: 'bg-primary/10 border-primary/25', Icone: TrendingDown },
  dentro: { texto: 'text-muted-foreground', fundo: 'bg-secondary/40 border-border', Icone: Minus },
  acima: { texto: 'text-accent', fundo: 'bg-accent/10 border-accent/25', Icone: TrendingUp },
} as const;

export default function KpvCard({ attributes, precoEmCentavos, className }: KpvCardProps) {
  const kpv = lerKpv(attributes, precoEmCentavos);
  // Sem referência confiável, não mostra nada. Um espaço vazio dizendo "sem
  // dados" só ocupa tela e sugere que faltou alguma coisa.
  if (!kpv) return null;

  const nota = kpv.avaliacao?.nota ?? 'dentro';
  const { texto, fundo, Icone } = CORES[nota];

  return (
    <div className={`rounded-lg border p-4 ${fundo} ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
          Referência de mercado
        </h3>
        <Tooltip>
          <TooltipTrigger aria-label="Como calculamos">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            A Kolecta levanta o preço praticado nesta mesma peça, sempre nova e
            lacrada, e consolida: um preço por vendedor, valores extremos
            descartados, e a mediana como referência.
            {kpv.ressalvas.length > 0 && (
              <span className="mt-1 block text-muted-foreground">{kpv.ressalvas.join('. ')}.</span>
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-heading text-2xl font-extrabold text-foreground">
          {formatBRL(kpv.medianaEmCentavos / 100)}
        </span>
        <span className="text-xs text-muted-foreground">preço usual</span>
      </div>

      {/* A faixa importa tanto quanto a mediana: colecionável tem dispersão
          real, e um número só finge uma precisão que não existe. */}
      <p className="mt-1 text-xs text-muted-foreground">
        A maioria fica entre{' '}
        <span className="text-foreground">{formatBRL(kpv.p25EmCentavos / 100)}</span> e{' '}
        <span className="text-foreground">{formatBRL(kpv.p75EmCentavos / 100)}</span>
      </p>

      {kpv.avaliacao && (
        <div className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${texto}`}>
          <Icone className="h-4 w-4 shrink-0" />
          <span>{kpv.avaliacao.texto}</span>
          {nota !== 'dentro' && (
            <span className="text-xs opacity-70">
              ({kpv.avaliacao.diferencaPercentual > 0 ? '+' : ''}
              {kpv.avaliacao.diferencaPercentual}%)
            </span>
          )}
        </div>
      )}

      {/* Procedência SEM citar concorrente. O nome das fontes fica gravado no
          anúncio para auditoria interna, mas nunca aparece aqui: a vitrine da
          Kolecta não faz propaganda de marketplace alheio. O comprador precisa
          saber que existe método e qual o tamanho da amostra, não onde a gente
          pesquisou. */}
      <div className="mt-3 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
        <p>Levantamento Kolecta · {explicarConfianca(kpv.confianca, kpv.amostra)}</p>
        {kpv.desatualizada && (
          <p className="mt-0.5 text-accent">Levantamento com mais de 6 meses</p>
        )}
      </div>
    </div>
  );
}

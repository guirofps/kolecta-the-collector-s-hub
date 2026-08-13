import type { StoreCoverData } from '@/lib/api';

// ─── Capa (banner) da loja ───────────────────────────────────────────────────
//
// Os mesmos números do backend (`src/sellers/capa.ts`). Repetir aqui é
// deliberado: são dois processos, e o valor que chega da API pode ser antigo
// (cache do React Query, resposta guardada antes desta regra existir). O nome da
// loja fica POR CIMA da imagem — se o piso falhar, some o nome.

/** Escurecimento mínimo sobre a capa, em %. Regra de legibilidade, não gosto. */
export const COVER_OVERLAY_MIN = 35;
export const COVER_OVERLAY_MAX = 90;
export const COVER_OVERLAY_DEFAULT = 55;
export const COVER_FOCAL_DEFAULT = 50;

/** Maior lado (px) de uma capa. Mais que a foto de anúncio: a capa ocupa a
 *  largura inteira da tela, e 1600 embaça em monitor grande. */
export const CAPA_LADO_MAXIMO = 2400;

/**
 * Devolve a capa com os valores dentro da faixa, ou `null` se não houver capa.
 * Todo componente que desenha a capa passa por aqui — é o único lugar do front
 * que decide o quanto a imagem escurece.
 */
export function capaSegura(cover: StoreCoverData | null | undefined): StoreCoverData | null {
  if (!cover?.url) return null;
  return {
    url: cover.url,
    focalY: limitar(cover.focalY ?? COVER_FOCAL_DEFAULT, 0, 100),
    overlay: limitar(cover.overlay ?? COVER_OVERLAY_DEFAULT, COVER_OVERLAY_MIN, COVER_OVERLAY_MAX),
  };
}

function limitar(valor: number, min: number, max: number): number {
  if (!Number.isFinite(valor)) return min;
  return Math.min(max, Math.max(min, Math.round(valor)));
}

/**
 * Variação da capa PADRÃO (a de quem ainda não subiu a sua).
 *
 * Toda loja sem capa própria mostrando exatamente o mesmo banner traria de volta
 * o problema que a capa veio resolver: visitar três lojas e sentir que é a mesma
 * página. Aqui o id da loja vira um deslocamento do brilho e uma inclinação do
 * gradiente — estável (a mesma loja é sempre igual, inclusive entre sessões e
 * dispositivos) e dentro de uma faixa estreita, para nenhuma sair feia.
 *
 * Sem `seed` (prévia nas Configurações, por exemplo), cai no centro.
 */
export function variacaoDaCapaPadrao(seed?: string | null): {
  brilhoX: number;
  angulo: number;
} {
  if (!seed) return { brilhoX: 50, angulo: 115 };

  // Soma simples dos códigos: não precisa ser hash bom, precisa ser estável.
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i) * (i + 1)) % 997;

  return {
    brilhoX: 20 + (n % 61), // 20% a 80% da largura
    angulo: 95 + (n % 51), // 95° a 145°
  };
}

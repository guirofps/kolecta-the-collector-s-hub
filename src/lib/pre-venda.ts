// ─── Pré-venda ───────────────────────────────────────────────────────────────
//
// Vendedor anuncia peça que ainda não chegou e cobra um sinal (a "entrada") em
// vez do valor cheio. Duas regras vieram fechadas do produto:
//
//  1. O percentual da entrada é SELETOR, nunca campo aberto. Campo aberto vira
//     "entrada de 95%", que é pré-venda no nome e risco cheio para o comprador.
//  2. O título mostra que é pré-venda, sem depender do vendedor lembrar de
//     escrever. Quem varre a grade precisa ver antes de clicar.

/** Percentuais oferecidos. O teto de 50% é regra de produto, não sugestão. */
export const PERCENTUAIS_ENTRADA = [10, 20, 30, 40, 50] as const;

export type PercentualEntrada = (typeof PERCENTUAIS_ENTRADA)[number];

export const PERCENTUAL_ENTRADA_PADRAO: PercentualEntrada = 30;

/** Como a tag aparece no título. */
export const TAG_PRE_VENDA = '[PRÉ-VENDA]';

// Reconhece a tag já escrita à mão pelo vendedor, em qualquer grafia vista:
// "PRE VENDA", "pré-venda", "[PRÉ VENDA]", com ou sem colchete, hífen ou acento.
// Sem isso o anúncio sairia "[PRÉ-VENDA] PRE-VENDA Skyline GT-R".
const TAG_NO_COMECO = /^\s*[[(]?\s*pr[eé]\s*[-–—]?\s*venda\s*[\])]?\s*[-–—:]?\s*/i;

/** O título já anuncia pré-venda, de qualquer jeito? */
export function temTagPreVenda(titulo: string | null | undefined): boolean {
  return TAG_NO_COMECO.test(titulo ?? '');
}

/** Tira a tag do começo, seja qual for a grafia. Título sem tag volta igual. */
export function removerTagPreVenda(titulo: string | null | undefined): string {
  return (titulo ?? '').replace(TAG_NO_COMECO, '').trim();
}

/**
 * Põe a tag no começo do título, sem duplicar.
 *
 * Idempotente de propósito: o wizard chama isso a cada tecla para mostrar a
 * prévia, e o vendedor pode ligar e desligar a pré-venda várias vezes antes de
 * publicar. Aplicar duas vezes tem que dar o mesmo resultado que aplicar uma.
 */
export function aplicarTagPreVenda(titulo: string | null | undefined): string {
  const limpo = removerTagPreVenda(titulo);
  if (!limpo) return '';
  return `${TAG_PRE_VENDA} ${limpo}`;
}

/**
 * Título final conforme a pré-venda está ligada ou não.
 * Desligar a pré-venda devolve o título limpo, sem sobra da tag.
 */
export function tituloComPreVenda(titulo: string | null | undefined, preVenda: boolean): string {
  return preVenda ? aplicarTagPreVenda(titulo) : removerTagPreVenda(titulo);
}

/**
 * Quanto sobra para o título depois da tag.
 *
 * O campo do wizard tem limite de 80 caracteres. A tag entra na hora de
 * publicar, então sem descontar aqui o vendedor escreve 80, a tag soma 12 e o
 * título publicado passa do limite (ou é cortado no meio da palavra).
 */
export function limiteTitulo(limiteTotal: number, preVenda: boolean): number {
  return preVenda ? Math.max(0, limiteTotal - (TAG_PRE_VENDA.length + 1)) : limiteTotal;
}

export interface ResumoEntrada {
  /** O que o comprador paga agora, em centavos. */
  entradaEmCentavos: number;
  /** O que fica para pagar quando a peça chegar, em centavos. */
  restanteEmCentavos: number;
  percentual: PercentualEntrada;
}

/**
 * Divide o preço entre entrada e restante.
 *
 * Arredonda a entrada para o centavo mais próximo e tira o RESTANTE por
 * subtração, nunca por um segundo arredondamento: assim entrada + restante bate
 * exatamente com o preço, sempre. Calcular os dois separado deixa um centavo
 * sobrando ou faltando, e o comprador que confere não perdoa.
 */
export function calcularEntrada(
  precoEmCentavos: number,
  percentual: PercentualEntrada,
): ResumoEntrada {
  const preco = Math.max(0, Math.round(precoEmCentavos || 0));
  const entradaEmCentavos = Math.round((preco * percentual) / 100);
  return {
    entradaEmCentavos,
    restanteEmCentavos: preco - entradaEmCentavos,
    percentual,
  };
}

/** É um dos percentuais permitidos? Guarda contra dado antigo ou adulterado. */
export function percentualValido(valor: unknown): valor is PercentualEntrada {
  return PERCENTUAIS_ENTRADA.includes(Number(valor) as PercentualEntrada);
}

/**
 * Percentual seguro a partir de qualquer entrada.
 *
 * O anúncio guarda o percentual em `attributes` (JSON), que é texto vindo do
 * banco: pode chegar como "30", como 30, ou como lixo de um anúncio antigo.
 * Nada disso pode virar cobrança errada, então o que não for da lista cai no
 * padrão.
 */
export function normalizarPercentual(valor: unknown): PercentualEntrada {
  return percentualValido(valor) ? (Number(valor) as PercentualEntrada) : PERCENTUAL_ENTRADA_PADRAO;
}

export interface DadosPreVenda {
  preVenda: true;
  preVendaPercentual: PercentualEntrada;
  preVendaEntradaEmCentavos: number;
}

/**
 * O bloco que vai para `attributes` do anúncio.
 *
 * Grava o valor da entrada JÁ CALCULADO, além do percentual. O percentual
 * sozinho obrigaria todo lugar que exibe o anúncio a recalcular, e basta uma
 * arredondada diferente em um deles para a vitrine e o checkout mostrarem
 * valores distintos para a mesma peça.
 */
export function dadosPreVenda(
  precoEmCentavos: number,
  percentual: PercentualEntrada,
): DadosPreVenda {
  const { entradaEmCentavos } = calcularEntrada(precoEmCentavos, percentual);
  return {
    preVenda: true,
    preVendaPercentual: percentual,
    preVendaEntradaEmCentavos: entradaEmCentavos,
  };
}

/** O anúncio é pré-venda? Lê `attributes` já parseado. */
export function ehPreVenda(attrs: Record<string, unknown> | null | undefined): boolean {
  return attrs?.preVenda === true || attrs?.preVenda === 'true';
}

/**
 * Resumo de um anúncio de pré-venda já salvo, ou null se não for pré-venda.
 *
 * Recalcula a partir do preço atual em vez de confiar no valor gravado: o
 * vendedor pode editar o preço depois de publicar, e aí a entrada guardada fica
 * velha. O que manda é sempre o percentual escolhido sobre o preço de hoje.
 */
export function resumoPreVenda(
  attrs: Record<string, unknown> | null | undefined,
  precoEmCentavos: number | null | undefined,
): ResumoEntrada | null {
  if (!ehPreVenda(attrs)) return null;
  return calcularEntrada(precoEmCentavos ?? 0, normalizarPercentual(attrs?.preVendaPercentual));
}

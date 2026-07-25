// Extrato financeiro do pedido, do ponto de vista do vendedor.
//
// A tela mostrava "Comissão Kolecta (64%)". O número saía de dividir tudo que
// foi descontado pelo total do pedido COM frete, misturando duas coisas
// diferentes: a comissão da plataforma, que incide só sobre o item, e o custo
// da etiqueta, que a Kolecta emite e cobra de volta.
//
// Aqui os valores são separados quando dá para afirmar, e agregados quando não
// dá. Rotular de errado um desconto de 60% do pedido é pior do que dizer
// "descontos" e deixar o vendedor perguntar.

import { COMMISSION_RATE } from './fees';

export interface EntradaExtrato {
  /** Total pago pelo comprador, item mais frete. */
  totalInCents: number;
  /** Frete cobrado no checkout. */
  shippingInCents?: number | null;
  /** Tudo que o backend descontou do vendedor. */
  platformFeeInCents?: number | null;
  /** Quanto sobra para o vendedor, segundo o backend. */
  sellerNetInCents?: number | null;
}

export interface Extrato {
  /** Valor do item, sem frete. */
  itemInCents: number;
  freteInCents: number;
  totalInCents: number;
  /** Total descontado do vendedor. */
  descontosInCents: number;
  liquidoInCents: number;
  /**
   * Quando dá para separar com segurança, vem a comissão e o custo da etiqueta
   * em linhas próprias. `null` quando os números não fecham: nesse caso a tela
   * mostra só o total dos descontos, em vez de inventar rótulo.
   */
  detalhe: {
    comissaoInCents: number;
    etiquetaInCents: number;
    /** Percentual sobre o ITEM, que é onde a comissão incide de verdade. */
    taxaSobreItem: number;
  } | null;
}

/** Tolerância de 1 ponto percentual, para arredondamento de centavos. */
const TOLERANCIA = 0.01;

export function montarExtrato(pedido: EntradaExtrato): Extrato {
  const total = Math.max(0, pedido.totalInCents ?? 0);
  const frete = Math.max(0, pedido.shippingInCents ?? 0);
  // O frete nunca deveria passar do total; se passar, o dado está errado e é
  // melhor zerar do que mostrar item negativo.
  const item = Math.max(0, total - Math.min(frete, total));
  const descontos = Math.max(0, pedido.platformFeeInCents ?? 0);
  const liquido = pedido.sellerNetInCents ?? total - descontos;

  return {
    itemInCents: item,
    freteInCents: frete,
    totalInCents: total,
    descontosInCents: descontos,
    liquidoInCents: liquido,
    detalhe: separarDescontos(item, frete, descontos),
  };
}

/**
 * Tenta explicar os descontos em comissão mais etiqueta.
 *
 * Duas hipóteses, nesta ordem:
 * 1. Os descontos JÁ incluem o frete. É o caso quando a Kolecta emite a
 *    etiqueta e cobra do vendedor: sobrando a comissão esperada, fecha.
 * 2. Os descontos são só comissão, e o frete não passa pelo vendedor.
 *
 * Se nenhuma fecha, devolve `null`: os números não batem com nada conhecido, e
 * chutar um rótulo é o que criou o "64%" que ninguém entendia.
 */
function separarDescontos(
  item: number,
  frete: number,
  descontos: number,
): Extrato['detalhe'] {
  if (item <= 0 || descontos <= 0) return null;

  // Hipótese 1: descontos = comissão + etiqueta.
  if (frete > 0 && descontos >= frete) {
    const comissao = descontos - frete;
    const taxa = comissao / item;
    if (Math.abs(taxa - COMMISSION_RATE) <= TOLERANCIA) {
      return { comissaoInCents: comissao, etiquetaInCents: frete, taxaSobreItem: taxa };
    }
  }

  // Hipótese 2: descontos são só a comissão.
  const taxaDireta = descontos / item;
  if (Math.abs(taxaDireta - COMMISSION_RATE) <= TOLERANCIA) {
    return { comissaoInCents: descontos, etiquetaInCents: 0, taxaSobreItem: taxaDireta };
  }

  return null;
}

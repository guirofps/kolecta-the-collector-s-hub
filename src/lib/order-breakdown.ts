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

import { COMMISSION_RATE, FOUNDER_COMMISSION_RATE } from './fees';

/**
 * Taxas que um pedido pode ter sido fechado com.
 *
 * Precisa ser uma LISTA, e não a taxa da plataforma: o pedido guarda o valor em
 * centavos, não o percentual, então a única forma de rotular é reconhecer a
 * conta. Com 11% cravado, todo pedido de Membro Fundador (9%) falhava as duas
 * hipóteses e caía no `null` — o fundador via um bolo de "descontos" sem
 * explicação, justamente quem tem a melhor taxa da plataforma.
 *
 * Ordem importa: a taxa base primeiro, porque é a maioria dos pedidos.
 */
const TAXAS_CONHECIDAS = [COMMISSION_RATE, FOUNDER_COMMISSION_RATE];

export interface EntradaExtrato {
  /** Total pago pelo comprador, item mais frete. */
  totalInCents: number;
  /** Frete cobrado no checkout. */
  shippingInCents?: number | null;
  /** Comissão da plataforma (mais a etiqueta, quando a Kolecta a emite). */
  platformFeeInCents?: number | null;
  /**
   * Taxa da Pagar.me, descontada do vendedor no split.
   *
   * Sem ela a tela não fechava: um arremate de R$ 200 mostrava comissão de
   * R$ 18 e líquido de R$ 174,22 — faltavam R$ 7,78 sem nenhuma linha que os
   * explicasse, e o vendedor tinha razão em achar que a conta estava errada.
   */
  gatewayFeeInCents?: number | null;
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
   * Quando dá para separar com segurança, vêm as linhas próprias. `null`
   * quando os números não fecham: nesse caso a tela mostra só o total dos
   * descontos, em vez de inventar rótulo.
   *
   * A regra de "fechar" é literal — as linhas TÊM que somar `descontosInCents`.
   * Antes bastava a comissão bater com uma taxa conhecida, e a taxa do gateway
   * simplesmente não entrava na conta: a tela exibia linhas que não somavam o
   * líquido logo abaixo delas.
   */
  detalhe: {
    comissaoInCents: number;
    etiquetaInCents: number;
    gatewayInCents: number;
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
  const comissaoEEtiqueta = Math.max(0, pedido.platformFeeInCents ?? 0);
  const gateway = Math.max(0, pedido.gatewayFeeInCents ?? 0);
  const liquido =
    pedido.sellerNetInCents ?? total - comissaoEEtiqueta - gateway;

  // Os descontos são o que NÃO chegou ao vendedor — derivado do líquido, não
  // somado a partir das taxas. Somar as taxas conhecidas deixava de fora
  // qualquer desconto que a tela não conhecesse (foi o caso do gateway), e o
  // resultado era um extrato que não fechava com o próprio total logo abaixo.
  const descontos = Math.max(0, total - liquido);

  return {
    itemInCents: item,
    freteInCents: frete,
    totalInCents: total,
    descontosInCents: descontos,
    liquidoInCents: liquido,
    detalhe: separarDescontos(item, frete, descontos, gateway),
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
  gateway: number,
): Extrato['detalhe'] {
  if (item <= 0 || descontos <= 0) return null;

  /** A conta bate com alguma taxa que a plataforma pratica? */
  const reconhecida = (taxa: number) =>
    TAXAS_CONHECIDAS.some((conhecida) => Math.abs(taxa - conhecida) <= TOLERANCIA);

  /**
   * Só devolve o detalhe se as linhas somarem EXATAMENTE os descontos. É esta
   * checagem que impede a tela de voltar a exibir um extrato que não fecha:
   * qualquer desconto novo que apareça no futuro e não tenha linha própria
   * derruba para o agregado, em vez de sumir da soma.
   */
  const seFechar = (comissao: number, etiqueta: number) =>
    comissao + etiqueta + gateway === descontos
      ? {
          comissaoInCents: comissao,
          etiquetaInCents: etiqueta,
          gatewayInCents: gateway,
          taxaSobreItem: comissao / item,
        }
      : null;

  // A taxa do gateway não é deduzida, vem informada pelo backend — o que sobra
  // depois dela é que precisa ser explicado como comissão (+ etiqueta).
  const semGateway = descontos - gateway;
  if (semGateway <= 0) return null;

  // Hipótese 1: o resto é comissão + etiqueta.
  if (frete > 0 && semGateway >= frete) {
    const comissao = semGateway - frete;
    if (reconhecida(comissao / item)) {
      const detalhe = seFechar(comissao, frete);
      if (detalhe) return detalhe;
    }
  }

  // Hipótese 2: o resto é só a comissão.
  if (reconhecida(semGateway / item)) {
    return seFechar(semGateway, 0);
  }

  return null;
}

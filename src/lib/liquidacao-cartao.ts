// ─── Liquidação do cartão ────────────────────────────────────
// Duas contas diferentes sobre o mesmo dinheiro.
//
// A carteira da Kolecta libera o valor da venda em 48h — é o fim da janela de
// disputa, e o cron move o saldo de retido para disponível. A Pagar.me libera o
// dinheiro do CARTÃO em D+30: até lá ele fica em `waiting_funds` no recebedor do
// vendedor e não pode ser transferido de jeito nenhum.
//
// Por 28 dias, portanto, as duas discordam — e quem tem razão sobre SACAR é a
// operadora. Foi assim que o Rock Wheels viu "Saldo disponível R$ 748,53" e
// mesmo assim foi barrado: a carteira já havia liberado, a operadora não.
//
// O backend acerta o número (o teto do saque é o MENOR entre carteira e saldo
// real do recebedor — ver `calcMaxWithdrawableInCents` no backend). Quem errava
// era a tela, que explicava o bloqueio pelo saldo da CARTEIRA e chegava a dizer
// "é preciso ter pelo menos R$ 53,67; hoje você tem R$ 748,53" — enquanto
// impedia o saque.
//
// Este módulo responde o que faltava para a frase ficar verdadeira: QUANTO está
// preso na operadora e ATÉ QUANDO.

import type { Order } from '@/lib/api';

/**
 * Prazo da Pagar.me para o dinheiro do cartão virar saldo transferível.
 *
 * É o padrão da conta (D+30 a partir da captura, para crédito à vista). PIX não
 * passa por isto: cai como disponível quase na hora, e é por isso que os
 * vendedores que sacaram até hoje eram todos de PIX.
 *
 * ⚠️ Se a conta contratar antecipação automática, este número deixa de valer e
 * a tela passa a atrasar o vendedor em vez de informá-lo. Mudou lá, muda aqui.
 */
export const DIAS_LIQUIDACAO_CARTAO = 30;

/** Quando o valor de um pedido pago no cartão fica transferível. */
export function dataLiquidacao(order: Pick<Order, 'createdAt'>): Date {
  const d = new Date(order.createdAt);
  d.setDate(d.getDate() + DIAS_LIQUIDACAO_CARTAO);
  return d;
}

export interface LiquidacaoPendente {
  /** Soma, em reais, das vendas no cartão ainda dentro do prazo da operadora. */
  valor: number;
  /** Quando a PRÓXIMA venda presa libera. `null` quando não há nenhuma. */
  proxima: Date | null;
  /** Quando a ÚLTIMA libera — o dia em que tudo estará sacável. */
  ultima: Date | null;
  /** Quantas vendas estão nessa situação. */
  vendas: number;
}

/**
 * O que já é do vendedor na carteira mas a operadora ainda não soltou.
 *
 * Só entram pedidos `completed`: são exatamente os que o cron das 48h já moveu
 * para o saldo disponível. Pedido ainda retido aparece como "A receber" na tela
 * e não tem nada a ver com este bloqueio — misturar os dois faria a soma
 * prometer duas vezes o mesmo dinheiro.
 *
 * @param agora injetável para o teste não depender do relógio.
 */
export function liquidacaoPendente(
  orders: Order[],
  agora: Date = new Date(),
): LiquidacaoPendente {
  const presos = orders
    .filter(
      (o) => o.status === 'completed' && o.paymentInstrument === 'credit_card',
    )
    .map((o) => ({
      liberaEm: dataLiquidacao(o),
      valor: (o.sellerNetInCents ?? o.totalInCents) / 100,
    }))
    .filter((p) => p.liberaEm.getTime() > agora.getTime())
    .sort((a, b) => a.liberaEm.getTime() - b.liberaEm.getTime());

  return {
    valor: presos.reduce((soma, p) => soma + p.valor, 0),
    proxima: presos.length ? presos[0].liberaEm : null,
    ultima: presos.length ? presos[presos.length - 1].liberaEm : null,
    vendas: presos.length,
  };
}

/** "08/09/2026" — data curta para a interface. */
export function fmtDataCurta(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

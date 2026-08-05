// ─── Taxas da Kolecta ────────────────────────────────────────
// Fonte ÚNICA da verdade da comissão. Antes existiam duas taxas (Venda Direta
// 12% e Modo Lance 13%), e o wizard de criar anúncio ainda mostrava 10% fixo,
// que não batia com nenhuma. Agora é uma taxa só, igual para os dois tipos.
//
// Se a taxa mudar, muda AQUI e a mudança se propaga para a página de taxas,
// a calculadora e o wizard de anúncio.

/** Comissão do marketplace sobre o valor do item (não incide sobre o frete). */
export const COMMISSION_RATE = 0.11;

/**
 * Comissão do Membro Fundador, nos 6 primeiros meses do selo.
 *
 * Espelha FOUNDER_COMMISSION_PERCENT do backend. Quem MANDA é o backend: a
 * cobrança sai de `resolveCommissionPercent`, e a taxa efetiva chega ao front
 * em `GET /api/founder/me` (`commissionPercent`). Este valor existe para duas
 * coisas só: texto de marketing em página pública, e reconhecer a taxa de um
 * pedido já fechado (ver `order-breakdown`).
 *
 * Não reimplemente a REGRA aqui ("active" e dentro dos 6 meses). Ela mora no
 * backend; duplicar no navegador é como o front acabou mostrando 11% para
 * fundador que paga 9%.
 */
export const FOUNDER_COMMISSION_RATE = 0.09;

/** Taxa operacional fixa por venda concluída, em reais. */
export const OPERATIONAL_FEE = 2;

/** "11%" — para exibir na interface. */
export const COMMISSION_LABEL = `${(COMMISSION_RATE * 100).toFixed(0)}%`;

/** Formata uma taxa qualquer para a interface: 0.09 → "9%". */
export function commissionLabel(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * Quanto o vendedor recebe de uma venda de `value` reais.
 *
 * `rate` é a taxa DELE, não a da plataforma: o fundador recebe mais, e o wizard
 * de anúncio mostrava a conta com 11% para todo mundo — o número errado no
 * lugar exato em que ele decide o preço.
 */
export function sellerNet(value: number, rate: number = COMMISSION_RATE): number {
  return Math.max(0, value - value * rate - OPERATIONAL_FEE);
}

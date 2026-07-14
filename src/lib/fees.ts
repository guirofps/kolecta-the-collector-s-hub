// ─── Taxas da Kolecta ────────────────────────────────────────
// Fonte ÚNICA da verdade da comissão. Antes existiam duas taxas (Venda Direta
// 12% e Modo Lance 13%), e o wizard de criar anúncio ainda mostrava 10% fixo,
// que não batia com nenhuma. Agora é uma taxa só, igual para os dois tipos.
//
// Se a taxa mudar, muda AQUI e a mudança se propaga para a página de taxas,
// a calculadora e o wizard de anúncio.

/** Comissão do marketplace sobre o valor do item (não incide sobre o frete). */
export const COMMISSION_RATE = 0.11;

/** Taxa operacional fixa por venda concluída, em reais. */
export const OPERATIONAL_FEE = 2;

/** "11%" — para exibir na interface. */
export const COMMISSION_LABEL = `${(COMMISSION_RATE * 100).toFixed(0)}%`;

/** Quanto o vendedor recebe de uma venda de `value` reais. */
export function sellerNet(value: number): number {
  return Math.max(0, value - value * COMMISSION_RATE - OPERATIONAL_FEE);
}

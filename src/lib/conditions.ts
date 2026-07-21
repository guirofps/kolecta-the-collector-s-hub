// ─── Condições do item ───────────────────────────────────────
// Fonte ÚNICA dos rótulos de condição.
//
// Antes existiam listas soltas em criar anúncio, editar anúncio e mock-data, e
// elas divergiram: o wizard salva `novo-lacrado`, mas o `conditionLabel` só
// conhecia `novo|usado|mint|lacrado`. Resultado: a condição saía vazia no card
// do produto, na página do produto, no carrinho e no leilão.
//
// Sobre o rótulo: "lacrado" não vale para toda categoria (caixa de Funko não
// tem lacre), então o texto fala em "embalagem" e cobre os dois casos.

export interface ConditionOption {
  value: string;
  label: string;
  desc: string;
}

export const CONDITIONS: ConditionOption[] = [
  {
    value: 'novo-lacrado',
    label: 'Novo na embalagem',
    desc: 'Lacrado ou nunca retirado da embalagem original',
  },
  {
    value: 'novo-sem-caixa',
    label: 'Novo sem caixa',
    desc: 'Item novo, sem embalagem original',
  },
  {
    value: 'usado-conservado',
    label: 'Usado conservado',
    desc: 'Sem danos visíveis, bem mantido',
  },
  {
    value: 'usado-com-marcas',
    label: 'Usado com marcas',
    desc: 'Com desgastes ou danos visíveis',
  },
];

// Vocabulário antigo (mock//dados legados), mantido para anúncios já gravados.
const LEGACY_LABELS: Record<string, string> = {
  novo: 'Novo',
  usado: 'Usado',
  mint: 'Mint',
  lacrado: 'Lacrado',
};

/**
 * Rótulo legível da condição. Aceita o vocabulário atual e o antigo; se o valor
 * for desconhecido, devolve o próprio valor em vez de sumir da tela.
 */
export function conditionLabel(value: string | null | undefined): string {
  if (!value) return '';
  const found = CONDITIONS.find((c) => c.value === value);
  return found?.label ?? LEGACY_LABELS[value] ?? value;
}

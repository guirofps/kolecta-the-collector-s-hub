// Filtros da página de categoria.
//
// A categoria tinha só tipo (compra/leilão) e prateleira (marca). Faltava o que
// todo marketplace tem: preço, condição, ordenação. Tudo aqui é função pura
// sobre `Listing[]`, e as opções são DERIVADAS do que a categoria contém, para
// a tela nunca oferecer um filtro que zera a lista.

import type { Listing } from './api';
import { conditionLabel } from './conditions';

/** Valor em reais do anúncio, seja compra direta ou lance inicial de leilão. */
export function precoDe(l: Listing): number {
  const cents = l.priceInCents ?? l.startingBidInCents ?? l.currentBidInCents ?? 0;
  return cents / 100;
}

// ─── Faixas de preço ─────────────────────────────────────────────────────────

export interface FaixaPreco {
  chave: string;
  rotulo: string;
  min: number;
  max: number; // Infinity na última
}

/** Faixas fixas. O rótulo evita travessão de propósito (regra de copy). */
export const FAIXAS_PRECO: FaixaPreco[] = [
  { chave: 'ate-50', rotulo: 'Até R$ 50', min: 0, max: 50 },
  { chave: '50-150', rotulo: 'R$ 50 a 150', min: 50, max: 150 },
  { chave: '150-300', rotulo: 'R$ 150 a 300', min: 150, max: 300 },
  { chave: '300-1000', rotulo: 'R$ 300 a 1.000', min: 300, max: 1000 },
  { chave: 'acima-1000', rotulo: 'Acima de R$ 1.000', min: 1000, max: Infinity },
];

/** Um anúncio está nesta faixa? Limite inferior aberto (>) menos na primeira,
 *  para R$ 50 cair em "até 50" e não também em "50 a 150". */
export function naFaixa(l: Listing, faixa: FaixaPreco): boolean {
  const p = precoDe(l);
  const acimaDoMin = faixa.min === 0 ? p >= 0 : p > faixa.min;
  return acimaDoMin && p <= faixa.max;
}

export interface FaixaComContagem extends FaixaPreco {
  total: number;
}

/** Só as faixas que têm item na categoria, com a contagem. */
export function faixasComItem(listings: Listing[]): FaixaComContagem[] {
  return FAIXAS_PRECO
    .map((f) => ({ ...f, total: listings.filter((l) => naFaixa(l, f)).length }))
    .filter((f) => f.total > 0);
}

// ─── Condição ────────────────────────────────────────────────────────────────

export interface CondicaoComContagem {
  value: string;
  label: string;
  total: number;
}

/** Condições presentes na categoria, da mais comum para a menos, com contagem. */
export function condicoesComItem(listings: Listing[]): CondicaoComContagem[] {
  const conta = new Map<string, number>();
  for (const l of listings) {
    const v = (l.condition ?? '').trim();
    if (!v) continue;
    conta.set(v, (conta.get(v) ?? 0) + 1);
  }
  return [...conta.entries()]
    .map(([value, total]) => ({ value, label: conditionLabel(value), total }))
    .sort((a, b) => b.total - a.total);
}

// ─── Ordenação ───────────────────────────────────────────────────────────────

export type Ordem = 'relevancia' | 'recentes' | 'menor-preco' | 'maior-preco';

export const ORDENS: { valor: Ordem; rotulo: string }[] = [
  { valor: 'relevancia', rotulo: 'Relevância' },
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'menor-preco', rotulo: 'Menor preço' },
  { valor: 'maior-preco', rotulo: 'Maior preço' },
];

const quando = (l: Listing) => new Date(l.createdAt ?? 0).getTime() || 0;

/** Ordena sem alterar o array recebido. `relevancia` mantém a ordem que veio. */
export function ordenar(listings: Listing[], ordem: Ordem): Listing[] {
  const copia = [...listings];
  switch (ordem) {
    case 'recentes':
      return copia.sort((a, b) => quando(b) - quando(a));
    case 'menor-preco':
      return copia.sort((a, b) => precoDe(a) - precoDe(b));
    case 'maior-preco':
      return copia.sort((a, b) => precoDe(b) - precoDe(a));
    default:
      return copia;
  }
}

// ─── Aplicação conjunta ──────────────────────────────────────────────────────

export interface FiltrosCategoria {
  faixaPreco?: string | null;
  condicao?: string | null;
}

/**
 * Aplica preço e condição. Tipo e subcategoria continuam na página, porque
 * dependem de lógica dela (o campo da prateleira varia por categoria). Aqui
 * ficam os filtros genéricos, iguais em qualquer categoria.
 */
export function aplicarFiltros(listings: Listing[], f: FiltrosCategoria): Listing[] {
  let out = listings;
  if (f.faixaPreco) {
    const faixa = FAIXAS_PRECO.find((x) => x.chave === f.faixaPreco);
    if (faixa) out = out.filter((l) => naFaixa(l, faixa));
  }
  if (f.condicao) {
    out = out.filter((l) => (l.condition ?? '').trim() === f.condicao);
  }
  return out;
}

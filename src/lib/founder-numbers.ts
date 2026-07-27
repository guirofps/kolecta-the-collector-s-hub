// Próximo número de Fundador livre.
//
// O backend calcula `nextNumber` a partir de 51 (lógica antiga, quando 51-100
// era a faixa da seleção). A numeração agora é sequencial de 1, e as concessões
// reais estão em #001..#010, então o backend sugeria #051, um número errado.
//
// Aqui o próximo livre sai dos números REALMENTE concedidos, que cada anúncio
// carrega em `sellerFounderNumber`. Enquanto o backend não corrige o
// `nextNumber`, esta é a fonte confiável.

import type { Listing } from './api';

/** O #000 é a casa e não entra na sequência pública. */
const CASA = 0;

/** Números de Fundador já em uso, a partir dos anúncios. */
export function numerosOcupados(listings: Listing[]): Set<number> {
  const ocupados = new Set<number>();
  for (const l of listings) {
    const n = (l as { sellerFounderNumber?: number | null }).sellerFounderNumber;
    if (typeof n === 'number' && n > CASA) ocupados.add(n);
  }
  return ocupados;
}

/**
 * Menor número positivo ainda livre. Preenche buraco se houver (mais seguro que
 * `max + 1`, que reusaria um número se alguém tivesse sido removido). Com
 * #001..#010 contíguos, devolve 11, que é o esperado.
 */
export function proximoNumeroLivre(ocupados: Set<number>): number {
  let n = 1;
  while (ocupados.has(n)) n++;
  return n;
}

/** Atalho: direto da lista de anúncios. */
export function proximoNumeroDeFundador(listings: Listing[]): number {
  return proximoNumeroLivre(numerosOcupados(listings));
}

// ─── Fundadores concedidos ───────────────────────────────────────────────────

export interface FundadorConcedido {
  numero: number;
  sellerId: string;
  nome: string;
  status: string; // active | lapsed | ...
  /** Quantos anúncios no ar essa loja tem: sinal de engajamento para a gestão. */
  anunciosNoAr: number;
}

/**
 * Os fundadores atuais, um por número, ordenados pelo número.
 *
 * Sai dos anúncios (`sellerFounderNumber` / `sellerFounderStatus`), então só vê
 * fundador que tem anúncio no ar. Fundador sem nenhum anúncio ativo não aparece
 * aqui: isso é justamente o sinal de quem parou de engajar, mas para a gestão
 * completa (inclusive quem zerou a loja) o certo é um endpoint de fundadores no
 * backend. Ver docs/backend-pendencias.
 */
export function fundadoresConcedidos(listings: Listing[]): FundadorConcedido[] {
  const porNumero = new Map<number, FundadorConcedido>();
  for (const l of listings) {
    const n = (l as { sellerFounderNumber?: number | null }).sellerFounderNumber;
    if (typeof n !== 'number' || n < CASA) continue;
    const noAr = l.status === 'active' ? 1 : 0;
    const existente = porNumero.get(n);
    if (existente) {
      existente.anunciosNoAr += noAr;
    } else {
      porNumero.set(n, {
        numero: n,
        sellerId: l.sellerId,
        nome: (l.sellerName ?? '').trim() || 'Sem nome',
        status: (l as { sellerFounderStatus?: string | null }).sellerFounderStatus ?? 'active',
        anunciosNoAr: noAr,
      });
    }
  }
  return [...porNumero.values()].sort((a, b) => a.numero - b.numero);
}

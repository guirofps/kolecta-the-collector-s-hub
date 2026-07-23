// ─── Visibilidade pública do anúncio ─────────────────────────
// Fonte ÚNICA da pergunta "este anúncio pode aparecer para o público?".
//
// O motivo de existir: as telas públicas (perfil do vendedor, categoria, busca,
// home) pediam os anúncios à API e mostravam o que viesse, sem olhar o status.
// Como a API devolve anúncio em qualquer status, dava para ver na vitrine item
// que ainda estava esperando moderação. De fora parecia que o anúncio tinha
// sido aprovado sozinho, quando na verdade ele só estava sendo exibido antes da
// hora.
//
// A regra correta é de negação: só `active` vai ao ar. Qualquer status novo que
// o backend invente nasce escondido, que é o lado seguro de errar.

import type { Listing } from '@/lib/api';

/** Único status que o público pode ver. */
export const PUBLIC_STATUS = 'active';

/** O anúncio pode aparecer em vitrine pública? */
export function isPubliclyVisible(l: Pick<Listing, 'status'>): boolean {
  return l.status === PUBLIC_STATUS;
}

/**
 * Filtra uma lista para o que pode ir ao ar.
 *
 * Use em TODA tela pública. O backend deveria filtrar também, mas confiar só
 * nele já deixou anúncio não aprovado aparecer no perfil do vendedor.
 */
export function onlyPublic<T extends Pick<Listing, 'status'>>(listings: T[]): T[] {
  return listings.filter(isPubliclyVisible);
}

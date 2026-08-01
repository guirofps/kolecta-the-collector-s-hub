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
import { leilaoAberto, leilaoPausado } from '@/lib/leilao';

/** Único status que o público pode ver. */
export const PUBLIC_STATUS = 'active';

/**
 * O anúncio pode aparecer em vitrine pública?
 *
 * Status `active` é a primeira condição. A segunda vale só para leilão: o
 * acervo inteiro tem leilões com fim em 2099, criados junto do anúncio e nunca
 * iniciados. Eles são `active` e passavam por aqui, apareciam na vitrine com o
 * selo "Modo Lance", e ao clicar não havia lance a dar. Um card que não leva a
 * lugar nenhum é pior do que um card a menos.
 */
export function isPubliclyVisible(l: Pick<Listing, 'status'> & Partial<Listing>): boolean {
  if (l.status !== PUBLIC_STATUS) return false;
  if (l.type === 'auction') return leilaoAberto(l as Listing);
  return true;
}

/**
 * Filtra uma lista para o que pode ir ao ar.
 *
 * Use em TODA tela pública. O backend deveria filtrar também, mas confiar só
 * nele já deixou anúncio não aprovado aparecer no perfil do vendedor.
 */
export function onlyPublic<T extends Pick<Listing, 'status'> & Partial<Listing>>(listings: T[]): T[] {
  return listings.filter(isPubliclyVisible);
}

/**
 * Visibilidade na LOJA do vendedor, que é mais larga que a da vitrine.
 *
 * A loja mostra também o leilão pausado, com selo. A vitrine (home, busca,
 * categoria) não: lá a pessoa está procurando o que comprar, e leilão que não
 * recebe lance só atrapalha. Na loja o contexto é outro — ela responde "o que
 * este vendedor tem?", e esconder 12 dos 14 itens fazia lojas inteiras
 * parecerem abandonadas quando o vendedor só estava esperando o KYC.
 *
 * Continua escondendo o leilão NUNCA INICIADO, que é o caso que a regra original
 * queria pegar: aquele não é um item que existe à venda, é um rascunho.
 */
export function onlyPublicNaLoja<T extends Pick<Listing, 'status'> & Partial<Listing>>(
  listings: T[],
): T[] {
  return listings.filter((l) => isPubliclyVisible(l) || leilaoPausado(l));
}

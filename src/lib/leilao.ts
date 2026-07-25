// O que conta como leilão aberto para receber lance.
//
// Todo leilão do acervo hoje vem com `endsAt` em 2099-01-01. É uma data
// sentinela do backend: o leilão foi criado junto do anúncio, mas nunca
// começou de verdade. Para quem navega, isso aparecia como um leilão normal na
// vitrine, e ao clicar não havia como dar lance.
//
// Um leilão de verdade na Kolecta dura horas ou dias (`durationHours` do
// wizard). Nada legítimo termina daqui a décadas, então uma data absurdamente
// distante é o sinal de que o leilão ainda não foi para o ar.

import type { Listing } from './api';

/**
 * Além disto, o fim é sentinela e não prazo. Um ano é folgado de propósito:
 * cobre qualquer leilão real com sobra e ainda assim descarta o 2099.
 */
const HORIZONTE_MS = 365 * 24 * 60 * 60 * 1000;

/** Estados em que o leilão não recebe mais lance. */
const ENCERRADOS = ['ended', 'cancelled'];

export function fimEhSentinela(endsAt: string | null | undefined, agora: Date = new Date()): boolean {
  if (!endsAt) return true; // sem fim definido também não é leilão em andamento
  const fim = new Date(endsAt).getTime();
  if (Number.isNaN(fim)) return true;
  return fim - agora.getTime() > HORIZONTE_MS;
}

/**
 * O leilão está aberto e aceitando lance?
 *
 * Usado pela vitrine para não anunciar o que a pessoa não consegue arrematar.
 * Prefere errar escondendo: um leilão de verdade que não apareça é menos ruim
 * do que um card que leva a uma página onde o botão não funciona.
 */
export function leilaoAberto(l: Listing, agora: Date = new Date()): boolean {
  if (l.type !== 'auction') return false;
  if (l.status !== 'active') return false;
  if (l.auctionStatus && ENCERRADOS.includes(l.auctionStatus)) return false;
  if (fimEhSentinela(l.endsAt, agora)) return false;
  return new Date(l.endsAt as string).getTime() > agora.getTime();
}

/**
 * Mesma regra para a lista de `/api/auctions`, que devolve outro formato: lá o
 * `status` é o do próprio leilão, não o do anúncio. A página do Modo Lance
 * mostrava os mesmos leilões parados que a home.
 */
export function leilaoDaListaAberto(
  a: { status?: string | null; endsAt?: string | null },
  agora: Date = new Date(),
): boolean {
  if (a.status && ENCERRADOS.includes(a.status)) return false;
  if (fimEhSentinela(a.endsAt, agora)) return false;
  return new Date(a.endsAt as string).getTime() > agora.getTime();
}

import { describe, it, expect } from 'vitest';
import { onlyPublic, onlyPublicNaLoja } from '@/lib/listing-visibility';
import { leilaoPausado, leilaoAberto } from '@/lib/leilao';
import type { Listing } from '@/lib/api';

/**
 * A loja do vendedor mostra leilão pausado; a vitrine não.
 *
 * Motivação: sem recebedor na Pagar.me os leilões do vendedor ficam pausados, e
 * escondê-los deixava lojas inteiras com cara de abandonadas — o caso que puxou
 * isto tinha 14 anúncios e exibia 1. Na vitrine (home, busca, categoria) eles
 * continuam fora: lá a pessoa procura o que comprar, e leilão que não recebe
 * lance só atrapalha.
 *
 * O risco que estes testes guardam é a confusão entre PAUSADO e NUNCA INICIADO.
 * Os dois carregam o mesmo `endsAt` sentinela de 2099 e só `auctionPausedAt` os
 * separa. Se a distinção se perder, a loja volta a exibir rascunho de leilão.
 */

const SENTINELA = '2099-01-01T00:00:00Z';

const anuncio = (over: Partial<Listing> = {}): Listing =>
  ({
    id: 'l1',
    sellerId: 's1',
    type: 'auction',
    status: 'active',
    auctionStatus: 'active',
    endsAt: '2099-06-01T00:00:00Z',
    startingBidInCents: 5000,
    title: 'Batplane 2020',
    condition: 'novo',
    images: null,
    createdAt: '2026-07-20T00:00:00Z',
    ...over,
  }) as Listing;

const pausado = anuncio({ endsAt: SENTINELA, auctionPausedAt: '2026-07-31T20:48:00Z' });
const nuncaIniciado = anuncio({ endsAt: SENTINELA, auctionPausedAt: null });
const rodando = anuncio({ endsAt: '2099-01-01T00:00:00Z', auctionPausedAt: null });
const encerrado = anuncio({ auctionStatus: 'ended', auctionPausedAt: '2026-07-31T20:48:00Z' });
const direto = anuncio({ type: 'direct', endsAt: null, auctionPausedAt: null });

describe('leilaoPausado', () => {
  it('reconhece o leilão pausado', () => {
    expect(leilaoPausado(pausado)).toBe(true);
  });

  it('leilão nunca iniciado NÃO é pausado, mesmo com o mesmo fim de 2099', () => {
    expect(leilaoPausado(nuncaIniciado)).toBe(false);
  });

  it('leilão encerrado não volta como pausado', () => {
    expect(leilaoPausado(encerrado)).toBe(false);
  });

  it('venda direta nunca é leilão pausado', () => {
    expect(leilaoPausado(direto)).toBe(false);
  });

  // `leilaoAberto` responde "aceita lance?" e habilita o lance na tela.
  // Pausado não aceita — juntar os dois faria o leilão parecer disputável.
  it('pausado NÃO conta como leilão aberto', () => {
    expect(leilaoAberto(pausado)).toBe(false);
  });
});

describe('visibilidade: loja x vitrine', () => {
  it('a vitrine continua escondendo o pausado', () => {
    expect(onlyPublic([pausado])).toHaveLength(0);
  });

  it('a loja mostra o pausado', () => {
    expect(onlyPublicNaLoja([pausado])).toHaveLength(1);
  });

  it('nem a loja mostra leilão nunca iniciado', () => {
    expect(onlyPublicNaLoja([nuncaIniciado])).toHaveLength(0);
  });

  it('nem a loja mostra leilão encerrado', () => {
    expect(onlyPublicNaLoja([encerrado])).toHaveLength(0);
  });

  it('anúncio não aprovado segue fora das duas', () => {
    const emModeracao = anuncio({ status: 'pending_review', auctionPausedAt: '2026-07-31T20:48:00Z' });
    expect(onlyPublic([emModeracao])).toHaveLength(0);
    expect(onlyPublicNaLoja([emModeracao])).toHaveLength(0);
  });

  // O caso concreto: 12 pausados + 1 encerrado + 1 venda direta.
  it('a loja do caso real vai de 1 para 13 cards', () => {
    const acervo = [
      ...Array.from({ length: 12 }, (_, i) => ({ ...pausado, id: `p${i}` })),
      { ...encerrado, id: 'enc' },
      { ...direto, id: 'dir' },
    ];
    expect(onlyPublic(acervo)).toHaveLength(1); // era o que a loja mostrava
    expect(onlyPublicNaLoja(acervo)).toHaveLength(13);
  });
});

import { describe, it, expect } from 'vitest';
import { leilaoAberto, fimEhSentinela } from '@/lib/leilao';
import type { Listing } from '@/lib/api';

/**
 * Todo leilão do acervo vinha com `endsAt` em 2099-01-01, uma data sentinela
 * do backend para leilão criado mas nunca iniciado. A vitrine mostrava dezenas
 * deles como se estivessem abertos, e ao clicar não havia como dar lance.
 */

const AGORA = new Date('2026-07-25T15:00:00Z');

const leilao = (over: Partial<Listing> = {}): Listing =>
  ({
    id: 'l1',
    sellerId: 's1',
    type: 'auction',
    status: 'active',
    auctionStatus: 'active',
    endsAt: '2026-07-28T15:00:00Z',
    startingBidInCents: 5000,
    title: 'Hot Wheels',
    condition: 'novo',
    images: null,
    createdAt: '2026-07-20T00:00:00Z',
    ...over,
  }) as Listing;

describe('fimEhSentinela', () => {
  it('reconhece o 2099 do acervo', () => {
    expect(fimEhSentinela('2099-01-01T00:00:00Z', AGORA)).toBe(true);
  });

  it('prazo de leilão de verdade não é sentinela', () => {
    expect(fimEhSentinela('2026-07-28T15:00:00Z', AGORA)).toBe(false);
    // Até um leilão longo, de meses, continua valendo.
    expect(fimEhSentinela('2026-12-31T00:00:00Z', AGORA)).toBe(false);
  });

  it('sem data, ou com data inválida, trata como não iniciado', () => {
    expect(fimEhSentinela(null, AGORA)).toBe(true);
    expect(fimEhSentinela('', AGORA)).toBe(true);
    expect(fimEhSentinela('qualquer coisa', AGORA)).toBe(true);
  });
});

describe('leilaoAberto', () => {
  it('aceita leilão em andamento', () => {
    expect(leilaoAberto(leilao(), AGORA)).toBe(true);
  });

  it('recusa o leilão que nunca começou', () => {
    // É o caso de TODOS os 70 leilões que estavam na vitrine.
    expect(leilaoAberto(leilao({ endsAt: '2099-01-01T00:00:00Z' }), AGORA)).toBe(false);
  });

  it('recusa leilão encerrado ou cancelado', () => {
    expect(leilaoAberto(leilao({ auctionStatus: 'ended' }), AGORA)).toBe(false);
    expect(leilaoAberto(leilao({ auctionStatus: 'cancelled' }), AGORA)).toBe(false);
  });

  it('recusa leilão cujo prazo já passou', () => {
    expect(leilaoAberto(leilao({ endsAt: '2026-07-24T15:00:00Z' }), AGORA)).toBe(false);
  });

  it('recusa anúncio que não está no ar, mesmo com prazo válido', () => {
    expect(leilaoAberto(leilao({ status: 'draft' }), AGORA)).toBe(false);
    expect(leilaoAberto(leilao({ status: 'rejected' }), AGORA)).toBe(false);
  });

  it('venda direta nunca é leilão', () => {
    expect(leilaoAberto(leilao({ type: 'direct' }), AGORA)).toBe(false);
  });

  it('sem auctionStatus, decide pelo prazo', () => {
    // A listagem pública nem sempre popula o status do leilão.
    expect(leilaoAberto(leilao({ auctionStatus: null }), AGORA)).toBe(true);
    expect(leilaoAberto(leilao({ auctionStatus: null, endsAt: '2099-01-01T00:00:00Z' }), AGORA)).toBe(false);
  });
});

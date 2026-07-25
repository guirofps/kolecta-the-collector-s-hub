import { describe, it, expect, beforeEach } from 'vitest';
import { lerCatalogo, guardarCatalogo } from '@/lib/catalogo-cache';
import type { Listing } from '@/lib/api';

/**
 * `GET /api/listings` leva de 3 a 7 segundos, e o custo é fixo da consulta:
 * pedir UM anúncio já custa 3,3s. Enquanto isso não muda no backend, guardar a
 * última vitrine faz a visita de volta pintar na hora.
 */

const AGORA = new Date('2026-07-25T12:00:00Z').getTime();

const item = (id: string): Listing =>
  ({
    id,
    sellerId: 's1',
    title: 'Hot Wheels',
    status: 'active',
    type: 'direct',
    condition: 'novo',
    images: null,
    priceInCents: 10000,
    createdAt: '2026-07-20T00:00:00Z',
  }) as Listing;

beforeEach(() => localStorage.clear());

describe('catálogo guardado', () => {
  it('devolve o que foi guardado', () => {
    guardarCatalogo([item('a'), item('b')], AGORA);
    expect(lerCatalogo(AGORA)).toHaveLength(2);
  });

  it('sem nada guardado, não inventa', () => {
    expect(lerCatalogo(AGORA)).toBeUndefined();
  });

  it('descarta o que passou de um dia', () => {
    // Preço e disponibilidade mudam: vitrine de ontem é pior que esperar.
    guardarCatalogo([item('a')], AGORA);
    const doisDias = AGORA + 2 * 24 * 60 * 60 * 1000;
    expect(lerCatalogo(doisDias)).toBeUndefined();
  });

  it('aceita o que ainda está dentro da validade', () => {
    guardarCatalogo([item('a')], AGORA);
    expect(lerCatalogo(AGORA + 60 * 60 * 1000)).toHaveLength(1);
  });

  it('não guarda lista vazia', () => {
    // Uma resposta vazia por erro passageiro apagaria a vitrine boa da visita
    // anterior e a pessoa veria uma home vazia na volta.
    guardarCatalogo([item('a')], AGORA);
    guardarCatalogo([], AGORA);
    expect(lerCatalogo(AGORA)).toHaveLength(1);
  });

  it('não quebra com cache corrompido', () => {
    localStorage.setItem('kolecta:catalogo:v1', 'isso não é json');
    expect(() => lerCatalogo(AGORA)).not.toThrow();
    expect(lerCatalogo(AGORA)).toBeUndefined();
  });

  it('não quebra quando o navegador recusa gravar', () => {
    // Aba anônima com armazenamento bloqueado, ou cota estourada.
    const original = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    expect(() => guardarCatalogo([item('a')], AGORA)).not.toThrow();
    localStorage.setItem = original;
  });
});

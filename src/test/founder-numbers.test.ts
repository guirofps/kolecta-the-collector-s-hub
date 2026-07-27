import { describe, it, expect } from 'vitest';
import {
  numerosOcupados,
  proximoNumeroLivre,
  proximoNumeroDeFundador,
  fundadoresConcedidos,
} from '@/lib/founder-numbers';
import type { Listing } from '@/lib/api';

/**
 * O backend calculava `nextNumber` a partir de 51 (lógica antiga). A numeração
 * agora é sequencial de 1, e o próximo livre sai dos números realmente
 * concedidos, que os anúncios carregam.
 */

let seq = 0;
const item = (over: Partial<Listing> & { sellerFounderNumber?: number | null; sellerFounderStatus?: string }): Listing =>
  ({
    id: `l${++seq}`,
    sellerId: 's1',
    sellerName: 'Loja',
    status: 'active',
    type: 'direct',
    condition: 'novo',
    images: null,
    title: 'Item',
    createdAt: '2026-07-01T00:00:00Z',
    ...over,
  }) as Listing;

describe('próximo número livre', () => {
  it('com #001..#010 contíguos, o próximo é 11', () => {
    const listings = Array.from({ length: 10 }, (_, i) =>
      item({ sellerId: `s${i}`, sellerFounderNumber: i + 1 }),
    );
    expect(proximoNumeroDeFundador(listings)).toBe(11);
  });

  it('sem nenhum fundador, começa no 1', () => {
    expect(proximoNumeroDeFundador([item({ sellerFounderNumber: null })])).toBe(1);
  });

  it('preenche buraco em vez de reusar o maior', () => {
    // 1,2,4 concedidos: o próximo é 3, não 5. Evita colar número em cima de
    // outro se alguém for removido no futuro.
    const listings = [1, 2, 4].map((n) => item({ sellerId: `s${n}`, sellerFounderNumber: n }));
    expect(proximoNumeroDeFundador(listings)).toBe(3);
  });

  it('ignora o #000 da casa na conta', () => {
    // A casa não ocupa vaga da sequência pública.
    expect(proximoNumeroLivre(numerosOcupados([item({ sellerFounderNumber: 0 })]))).toBe(1);
  });
});

describe('fundadores concedidos', () => {
  it('lista um por número, ordenado, somando anúncios no ar', () => {
    const fs = fundadoresConcedidos([
      item({ sellerId: 'b', sellerName: 'Beta', sellerFounderNumber: 2, status: 'active' }),
      item({ sellerId: 'a', sellerName: 'Alfa', sellerFounderNumber: 1, status: 'active' }),
      item({ sellerId: 'a', sellerName: 'Alfa', sellerFounderNumber: 1, status: 'active' }),
    ]);
    expect(fs.map((f) => f.numero)).toEqual([1, 2]);
    expect(fs[0]).toMatchObject({ nome: 'Alfa', anunciosNoAr: 2 });
    expect(fs[1]).toMatchObject({ nome: 'Beta', anunciosNoAr: 1 });
  });

  it('conta só anúncio no ar como engajamento', () => {
    // Fundador com tudo pausado aparece com 0 no ar: sinal para a gestão.
    const fs = fundadoresConcedidos([
      item({ sellerId: 'x', sellerFounderNumber: 5, status: 'paused' }),
      item({ sellerId: 'x', sellerFounderNumber: 5, status: 'draft' }),
    ]);
    expect(fs[0]).toMatchObject({ numero: 5, anunciosNoAr: 0 });
  });

  it('anúncio sem número de fundador não vira linha', () => {
    expect(fundadoresConcedidos([item({ sellerFounderNumber: null })])).toHaveLength(0);
  });

  it('inclui o status, para a gestão ver quem lapsed', () => {
    const fs = fundadoresConcedidos([
      item({ sellerFounderNumber: 3, sellerFounderStatus: 'lapsed' }),
    ]);
    expect(fs[0].status).toBe('lapsed');
  });
});

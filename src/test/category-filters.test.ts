import { describe, it, expect } from 'vitest';
import {
  precoDe,
  naFaixa,
  faixasComItem,
  condicoesComItem,
  ordenar,
  aplicarFiltros,
  FAIXAS_PRECO,
} from '@/lib/category-filters';
import type { Listing } from '@/lib/api';

/**
 * A categoria só filtrava por tipo e marca. Estes filtros genéricos (preço,
 * condição, ordenação) valem em qualquer categoria, e as opções saem do que a
 * categoria tem, para a tela nunca oferecer um filtro que zera a lista.
 */

let seq = 0;
const item = (over: Partial<Listing> = {}): Listing =>
  ({
    id: `l${++seq}`,
    sellerId: 's1',
    type: 'direct',
    status: 'active',
    condition: 'novo-lacrado',
    priceInCents: 10000,
    createdAt: '2026-07-20T00:00:00Z',
    images: null,
    title: 'Item',
    ...over,
  }) as Listing;

describe('precoDe', () => {
  it('usa o preço da compra direta', () => {
    expect(precoDe(item({ priceInCents: 14990 }))).toBe(149.9);
  });

  it('em leilão, cai no lance inicial', () => {
    expect(precoDe(item({ type: 'auction', priceInCents: null, startingBidInCents: 5000 } as Partial<Listing>))).toBe(50);
  });
});

describe('faixas de preço', () => {
  const faixa = (chave: string) => FAIXAS_PRECO.find((f) => f.chave === chave)!;

  it('R$ 50 cai em "até 50", não em "50 a 150"', () => {
    // Limite compartilhado não pode contar o item duas vezes.
    const l = item({ priceInCents: 5000 });
    expect(naFaixa(l, faixa('ate-50'))).toBe(true);
    expect(naFaixa(l, faixa('50-150'))).toBe(false);
  });

  it('só devolve faixa que tem item, com contagem', () => {
    const faixas = faixasComItem([
      item({ priceInCents: 3000 }),
      item({ priceInCents: 4000 }),
      item({ priceInCents: 250000 }),
    ]);
    expect(faixas.map((f) => f.chave)).toEqual(['ate-50', 'acima-1000']);
    expect(faixas.find((f) => f.chave === 'ate-50')!.total).toBe(2);
  });
});

describe('condições presentes', () => {
  it('lista só as que existem, da mais comum para a menos', () => {
    const cs = condicoesComItem([
      item({ condition: 'novo-lacrado' }),
      item({ condition: 'novo-lacrado' }),
      item({ condition: 'usado-conservado' }),
    ]);
    expect(cs[0]).toMatchObject({ value: 'novo-lacrado', total: 2 });
    expect(cs[1]).toMatchObject({ value: 'usado-conservado', total: 1 });
    expect(cs[0].label).toBeTruthy(); // traduzido para o rótulo legível
  });

  it('ignora condição vazia', () => {
    expect(condicoesComItem([item({ condition: '' })])).toHaveLength(0);
  });
});

describe('ordenar', () => {
  const lista = [
    item({ id: 'caro', priceInCents: 90000, createdAt: '2026-01-01T00:00:00Z' }),
    item({ id: 'barato', priceInCents: 1000, createdAt: '2026-07-01T00:00:00Z' }),
  ];

  it('menor preço primeiro', () => {
    expect(ordenar(lista, 'menor-preco').map((l) => l.id)).toEqual(['barato', 'caro']);
  });

  it('maior preço primeiro', () => {
    expect(ordenar(lista, 'maior-preco').map((l) => l.id)).toEqual(['caro', 'barato']);
  });

  it('mais recentes primeiro', () => {
    expect(ordenar(lista, 'recentes').map((l) => l.id)).toEqual(['barato', 'caro']);
  });

  it('relevância mantém a ordem que veio', () => {
    expect(ordenar(lista, 'relevancia').map((l) => l.id)).toEqual(['caro', 'barato']);
  });

  it('não altera o array original', () => {
    const antes = lista.map((l) => l.id);
    ordenar(lista, 'menor-preco');
    expect(lista.map((l) => l.id)).toEqual(antes);
  });
});

describe('aplicarFiltros', () => {
  const lista = [
    item({ id: 'a', priceInCents: 3000, condition: 'novo-lacrado' }),
    item({ id: 'b', priceInCents: 20000, condition: 'usado-conservado' }),
    item({ id: 'c', priceInCents: 4000, condition: 'usado-conservado' }),
  ];

  it('sem filtro, devolve tudo', () => {
    expect(aplicarFiltros(lista, {})).toHaveLength(3);
  });

  it('filtra por faixa de preço', () => {
    expect(aplicarFiltros(lista, { faixaPreco: 'ate-50' }).map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('filtra por condição', () => {
    expect(aplicarFiltros(lista, { condicao: 'usado-conservado' }).map((l) => l.id)).toEqual(['b', 'c']);
  });

  it('preço e condição juntos', () => {
    // Barato E usado: só o 'c'.
    expect(aplicarFiltros(lista, { faixaPreco: 'ate-50', condicao: 'usado-conservado' }).map((l) => l.id)).toEqual(['c']);
  });
});

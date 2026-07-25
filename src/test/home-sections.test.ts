import { describe, it, expect } from 'vitest';
import {
  intercalarPorVendedor,
  destaques,
  novidades,
  leiloes,
  lojas,
  contagemPorCategoria,
  parseImages,
} from '@/lib/home-sections';
import type { Listing } from '@/lib/api';

/**
 * A home mostrava 5 de 136 anúncios, e o catálogo real é desequilibrado: 93%
 * miniaturas diecast e um vendedor com 56 itens. Sem tratar isso, a vitrine
 * vira a loja de um vendedor só.
 */

let seq = 0;
const item = (over: Partial<Listing> = {}): Listing =>
  ({
    id: `l${++seq}`,
    sellerId: 's1',
    sellerName: 'Loja Um',
    categoryId: 'miniaturas-diecast',
    title: 'Hot Wheels',
    description: null,
    brand: null,
    line: null,
    scale: null,
    year: null,
    edition: null,
    condition: 'novo',
    type: 'direct',
    priceInCents: 10000,
    images: JSON.stringify(['a.jpg']),
    status: 'active',
    createdAt: '2026-07-01T00:00:00Z',
    ...over,
  }) as Listing;

describe('intercalarPorVendedor', () => {
  it('não deixa o mesmo vendedor ocupar a fileira inteira', () => {
    const entrada = [
      ...Array.from({ length: 5 }, () => item({ sellerId: 'grande' })),
      item({ sellerId: 'pequena-a' }),
      item({ sellerId: 'pequena-b' }),
    ];
    const saida = intercalarPorVendedor(entrada);
    // Os três primeiros são de lojas diferentes, que é o que a primeira
    // fileira da home mostra.
    const primeiros = saida.slice(0, 3).map((l) => l.sellerId);
    expect(new Set(primeiros).size).toBe(3);
  });

  it('não perde nem duplica anúncio', () => {
    const entrada = [
      item({ sellerId: 'a' }), item({ sellerId: 'a' }), item({ sellerId: 'a' }),
      item({ sellerId: 'b' }),
    ];
    const saida = intercalarPorVendedor(entrada);
    expect(saida).toHaveLength(4);
    expect(new Set(saida.map((l) => l.id)).size).toBe(4);
  });

  it('aguenta lista vazia', () => {
    expect(intercalarPorVendedor([])).toEqual([]);
  });
});

describe('destaques', () => {
  it('destaque pago vem antes do resto', () => {
    const pago = item({ id: 'pago', featuredUntil: '2099-01-01T00:00:00Z' } as Partial<Listing>);
    const caro = item({ id: 'caro', priceInCents: 999999 });
    const saida = destaques([caro, pago], 5);
    expect(saida[0].id).toBe('pago');
  });

  it('sem destaque pago, os mais caros sustentam a vitrine', () => {
    const saida = destaques([
      item({ id: 'barato', priceInCents: 1000, sellerId: 'a' }),
      item({ id: 'caro', priceInCents: 90000, sellerId: 'b' }),
    ]);
    expect(saida[0].id).toBe('caro');
  });

  it('respeita o limite pedido', () => {
    const muitos = Array.from({ length: 40 }, () => item());
    expect(destaques(muitos, 10)).toHaveLength(10);
  });

  it('não repete o que já vai na seção de leilão', () => {
    // O leilão mais caro do catálogo entrava em destaque, em Modo Lance e em
    // novidades: o mesmo card três vezes na mesma tela.
    const leilao = item({ id: 'leilao', type: 'auction', priceInCents: 999999 });
    const compra = item({ id: 'compra', priceInCents: 500 });
    const saida = destaques([leilao, compra], 10, [leilao]);
    expect(saida.map((l) => l.id)).toEqual(['compra']);
  });
});

describe('novidades', () => {
  it('mais recente primeiro', () => {
    const saida = novidades([
      item({ id: 'velho', createdAt: '2026-01-01T00:00:00Z' }),
      item({ id: 'novo', createdAt: '2026-07-20T00:00:00Z' }),
    ]);
    expect(saida[0].id).toBe('novo');
  });

  it('não repete o que já está em destaque', () => {
    const a = item({ id: 'a' });
    const b = item({ id: 'b' });
    const saida = novidades([a, b], 20, [a]);
    expect(saida.map((l) => l.id)).toEqual(['b']);
  });
});

describe('leiloes', () => {
  const agora = new Date('2026-07-25T00:00:00Z');

  it('só leilão, e o que acaba antes vem na frente', () => {
    const saida = leiloes(
      [
        item({ id: 'compra' }),
        item({ id: 'tarde', type: 'auction', endsAt: '2026-08-01T00:00:00Z' }),
        item({ id: 'cedo', type: 'auction', endsAt: '2026-07-26T00:00:00Z' }),
      ],
      agora,
    );
    expect(saida.map((l) => l.id)).toEqual(['cedo', 'tarde']);
  });

  it('leilão encerrado não aparece na home', () => {
    const saida = leiloes(
      [item({ id: 'acabou', type: 'auction', endsAt: '2026-07-01T00:00:00Z' })],
      agora,
    );
    expect(saida).toEqual([]);
  });
});

describe('lojas', () => {
  it('agrupa por vendedor e ordena pelo tamanho', () => {
    const saida = lojas([
      item({ sellerId: 'g', sellerName: 'Grande' }),
      item({ sellerId: 'g', sellerName: 'Grande' }),
      item({ sellerId: 'p', sellerName: 'Pequena' }),
    ]);
    expect(saida[0]).toMatchObject({ nome: 'Grande', itens: 2 });
    expect(saida[1]).toMatchObject({ nome: 'Pequena', itens: 1 });
  });

  it('a capa da loja é a foto do item mais caro', () => {
    const saida = lojas([
      item({ sellerId: 'x', sellerName: 'X', priceInCents: 100, images: JSON.stringify(['barato.jpg']) }),
      item({ sellerId: 'x', sellerName: 'X', priceInCents: 90000, images: JSON.stringify(['caro.jpg']) }),
    ]);
    expect(saida[0].capa).toBe('caro.jpg');
  });

  it('vendedor sem nome não vira card', () => {
    // O nome vazio caía no fallback e a home mostrava vários "Vendedor Kolecta".
    expect(lojas([item({ sellerId: 'z', sellerName: null })])).toEqual([]);
  });
});

describe('contagemPorCategoria', () => {
  it('conta só o que existe', () => {
    const conta = contagemPorCategoria([
      item({ categoryId: 'miniaturas-diecast' }),
      item({ categoryId: 'miniaturas-diecast' }),
      item({ categoryId: 'cards-colecionaveis' }),
    ]);
    expect(conta['miniaturas-diecast']).toBe(2);
    expect(conta['cards-colecionaveis']).toBe(1);
    // Categoria sem anúncio precisa ficar ausente: é assim que a home sabe
    // que ela não deve virar link para uma página vazia.
    expect(conta['funko-pop']).toBeUndefined();
  });
});

describe('parseImages', () => {
  it('usa placeholder quando não há foto', () => {
    expect(parseImages(null)).toEqual(['/placeholder.svg']);
    expect(parseImages('[]')).toEqual(['/placeholder.svg']);
  });

  it('aceita url solta que não é JSON', () => {
    expect(parseImages('https://x.com/a.jpg')).toEqual(['https://x.com/a.jpg']);
  });
});

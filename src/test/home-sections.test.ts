import { describe, it, expect } from 'vitest';
import {
  intercalarPorVendedor,
  destaques,
  novidades,
  leiloes,
  lojas,
  recomendados,
  vitrinesPorCategoria,
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

describe('destaques: rotação por semente', () => {
  it('mesma semente é estável; sementes diferentes variam a vitrine', () => {
    const acervo = Array.from({ length: 30 }, (_, i) =>
      item({ id: `r${i}`, sellerId: `v${i % 6}`, priceInCents: 5000 + i * 100 }));
    const a = destaques(acervo, 10, [], 111).map((l) => l.id);
    const a2 = destaques(acervo, 10, [], 111).map((l) => l.id);
    const b = destaques(acervo, 10, [], 999).map((l) => l.id);
    expect(a).toEqual(a2); // não re-embaralha na mesma visita
    expect(a).not.toEqual(b); // muda entre visitas
  });

  it('o destaque PAGO vem sempre primeiro, mesmo com rotação', () => {
    const futuro = new Date(Date.now() + 7 * 86400_000).toISOString();
    const pago = item({ id: 'pago', featuredUntil: futuro, sellerId: 'vp' });
    const acervo = [
      pago,
      ...Array.from({ length: 20 }, (_, i) => item({ id: `o${i}`, sellerId: `v${i % 5}` })),
    ];
    for (const semente of [1, 42, 777]) {
      expect(destaques(acervo, 10, [], semente)[0].id).toBe('pago');
    }
  });

  it('sem semente, mantém o comportamento antigo (mais caro primeiro)', () => {
    const acervo = [
      item({ id: 'barato', sellerId: 'v1', priceInCents: 1000 }),
      item({ id: 'caro', sellerId: 'v2', priceInCents: 90000 }),
    ];
    expect(destaques(acervo, 10)[0].id).toBe('caro');
  });
});

describe('recomendados', () => {
  const acervo = [
    ...Array.from({ length: 8 }, (_, i) => item({ id: `cat-a-${i}`, categoryId: 'a', sellerId: `v${i % 3}` })),
    ...Array.from({ length: 8 }, (_, i) => item({ id: `cat-b-${i}`, categoryId: 'b', sellerId: `v${i % 3}` })),
  ];
  const atual = { id: 'cat-a-0', categoryId: 'a', sellerId: 'v0' };

  it('não inclui o próprio anúncio', () => {
    const ids = recomendados(acervo, atual).map((l) => l.id);
    expect(ids).not.toContain('cat-a-0');
  });

  it('a mesma categoria vem primeiro (relevância)', () => {
    const primeiros = recomendados(acervo, atual, { quantos: 6 }).slice(0, 5);
    expect(primeiros.every((l) => l.categoryId === 'a')).toBe(true);
  });

  it('anúncios DIFERENTES mostram conjuntos diferentes (não fica fixo)', () => {
    const a = recomendados(acervo, { id: 'cat-a-0', categoryId: 'a', sellerId: 'v0' }).map((l) => l.id);
    const b = recomendados(acervo, { id: 'cat-a-1', categoryId: 'a', sellerId: 'v1' }).map((l) => l.id);
    expect(a).not.toEqual(b);
  });

  it('mesmo anúncio é estável durante a visita', () => {
    const a = recomendados(acervo, atual).map((l) => l.id);
    const b = recomendados(acervo, atual).map((l) => l.id);
    expect(a).toEqual(b);
  });

  it('respeita o limite pedido', () => {
    expect(recomendados(acervo, atual, { quantos: 5 })).toHaveLength(5);
  });
});

describe('vitrinesPorCategoria', () => {
  const CATS = [
    { slug: 'cards-colecionaveis', nome: 'Cards' },
    { slug: 'funko-pop', nome: 'Funko' },
    { slug: 'mangas-hqs', nome: 'Mangás' },
  ];

  it('só cria prateleira de categoria com o mínimo de itens (nada de prateleira vazia)', () => {
    const acervo = [
      ...Array.from({ length: 15 }, (_, i) => item({ id: `c${i}`, categoryId: 'cards-colecionaveis', sellerId: `v${i % 4}` })),
      ...Array.from({ length: 2 }, (_, i) => item({ id: `m${i}`, categoryId: 'mangas-hqs' })), // abaixo do mínimo
    ];
    const v = vitrinesPorCategoria(acervo, CATS, { minItens: 12, semente: 1 });
    const slugs = v.map((x) => x.slug);
    expect(slugs).toContain('cards-colecionaveis');
    expect(slugs).not.toContain('mangas-hqs'); // 2 itens: escondida
    expect(slugs).not.toContain('funko-pop'); // 0 itens
  });

  it('limita cada prateleira a porSecao e rotaciona por semente', () => {
    const acervo = Array.from({ length: 30 }, (_, i) =>
      item({ id: `c${i}`, categoryId: 'cards-colecionaveis', sellerId: `v${i % 5}` }));
    const a = vitrinesPorCategoria(acervo, CATS, { minItens: 12, porSecao: 8, semente: 5 });
    const b = vitrinesPorCategoria(acervo, CATS, { minItens: 12, porSecao: 8, semente: 999 });
    expect(a[0].itens.length).toBe(8);
    expect(a[0].itens.map((l) => l.id)).not.toEqual(b[0].itens.map((l) => l.id));
  });

  it('não repete o que já foi excluído (destaque/novidades)', () => {
    const acervo = Array.from({ length: 14 }, (_, i) =>
      item({ id: `c${i}`, categoryId: 'cards-colecionaveis', sellerId: `v${i % 3}` }));
    const excluir = [acervo[0], acervo[1]];
    const v = vitrinesPorCategoria(acervo, CATS, { minItens: 12, semente: 1, excluir });
    const ids = v[0].itens.map((l) => l.id);
    expect(ids).not.toContain('c0');
    expect(ids).not.toContain('c1');
  });
});

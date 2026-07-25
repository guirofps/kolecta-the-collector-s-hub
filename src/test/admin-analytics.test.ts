import { describe, it, expect } from 'vitest';
import {
  chaveDoDia,
  criadosPorDia,
  criadosHoje,
  criadosNosUltimos,
  funilModeracao,
  esperaMaisAntiga,
  vendedores,
  vendedoresComItemNoAr,
  catalogoPorCategoria,
  faixasDePreco,
  valorDoCatalogoEmCentavos,
} from '@/lib/admin-analytics';
import type { Listing } from '@/lib/api';

/**
 * Painel de Analytics do admin, camada 1: tudo derivado da listagem que o
 * backend já entrega. Sem rastreamento de sessão, que ainda não existe.
 */

const AGORA = new Date('2026-07-25T15:00:00');

let seq = 0;
const item = (over: Partial<Listing> = {}): Listing =>
  ({
    id: `l${++seq}`,
    sellerId: 's1',
    sellerName: 'Loja Um',
    categoryId: 'miniaturas-diecast',
    title: 'Hot Wheels',
    condition: 'novo',
    type: 'direct',
    priceInCents: 10000,
    images: null,
    status: 'active',
    createdAt: '2026-07-25T10:00:00',
    ...over,
  }) as Listing;

describe('criadosPorDia', () => {
  it('devolve um ponto por dia, inclusive os vazios', () => {
    // Série que pula dia vazio esconde justamente quando o movimento parou.
    const serie = criadosPorDia([item({ createdAt: '2026-07-25T10:00:00' })], 7, AGORA);
    expect(serie).toHaveLength(7);
    expect(serie.filter((p) => p.criados === 0)).toHaveLength(6);
  });

  it('o último ponto é hoje', () => {
    const serie = criadosPorDia([], 3, AGORA);
    expect(serie[serie.length - 1].dia).toBe('2026-07-25');
    expect(serie[serie.length - 1].rotulo).toBe('25/07');
  });

  it('conta cada dia no lugar certo', () => {
    const serie = criadosPorDia(
      [
        item({ createdAt: '2026-07-25T08:00:00' }),
        item({ createdAt: '2026-07-25T20:00:00' }),
        item({ createdAt: '2026-07-24T10:00:00' }),
      ],
      3,
      AGORA,
    );
    expect(serie.find((p) => p.dia === '2026-07-25')!.criados).toBe(2);
    expect(serie.find((p) => p.dia === '2026-07-24')!.criados).toBe(1);
  });

  it('ignora data inválida em vez de quebrar a série', () => {
    const serie = criadosPorDia([item({ createdAt: 'nao-e-data' })], 3, AGORA);
    expect(serie.every((p) => p.criados === 0)).toBe(true);
  });
});

describe('criadosHoje e criadosNosUltimos', () => {
  const lista = [
    item({ createdAt: '2026-07-25T01:00:00' }),
    item({ createdAt: '2026-07-24T23:00:00' }),
    item({ createdAt: '2026-07-19T10:00:00' }),
    item({ createdAt: '2026-06-01T10:00:00' }),
  ];

  it('hoje conta desde a meia-noite, não as últimas 24h', () => {
    expect(criadosHoje(lista, AGORA)).toBe(1);
  });

  it('7 dias inclui o dia de hoje', () => {
    // 25, 24 e 19 caem dentro; 01/06 fica fora.
    expect(criadosNosUltimos(lista, 7, AGORA)).toBe(3);
  });
});

describe('funilModeracao', () => {
  it('separa fila, no ar e reprovado', () => {
    const f = funilModeracao([
      item({ status: 'draft' }),
      item({ status: 'pending_review' }),
      item({ status: 'active' }),
      item({ status: 'active' }),
      item({ status: 'rejected' }),
      item({ status: 'paused' }),
    ]);
    expect(f.total).toBe(6);
    expect(f.aguardando).toBe(2); // draft e pending_review contam junto
    expect(f.noAr).toBe(2);
    expect(f.reprovados).toBe(1);
    expect(f.outros).toBe(1);
  });

  it('a taxa é sobre o que foi decidido, não sobre o total', () => {
    // Com a fila cheia, dividir pelo total faria a taxa despencar sem que
    // ninguém tivesse reprovado nada.
    const f = funilModeracao([
      ...Array.from({ length: 100 }, () => item({ status: 'draft' })),
      item({ status: 'active' }),
      item({ status: 'active' }),
      item({ status: 'rejected' }),
    ]);
    expect(f.taxaAprovacao).toBeCloseTo(2 / 3);
  });

  it('sem nada decidido, a taxa é nula em vez de zero', () => {
    // Zero leria como "reprovamos tudo", que é diferente de "não decidimos".
    expect(funilModeracao([item({ status: 'draft' })]).taxaAprovacao).toBeNull();
  });
});

describe('esperaMaisAntiga', () => {
  it('conta os dias do mais antigo da fila', () => {
    const dias = esperaMaisAntiga(
      [item({ status: 'draft', createdAt: '2026-07-20T10:00:00' }), item({ status: 'active', createdAt: '2026-01-01T10:00:00' })],
      AGORA,
    );
    // O ativo é mais antigo, mas já foi decidido: não conta como espera.
    expect(dias).toBe(5);
  });

  it('fila vazia devolve nulo', () => {
    expect(esperaMaisAntiga([item({ status: 'active' })], AGORA)).toBeNull();
  });
});

describe('vendedores', () => {
  it('separa o que está no ar do que aguarda', () => {
    // Vendedor com muita coisa na fila e pouco publicado é um problema, e a
    // soma sozinha esconderia isso.
    const v = vendedores([
      item({ sellerId: 'a', sellerName: 'Grande', status: 'draft' }),
      item({ sellerId: 'a', sellerName: 'Grande', status: 'draft' }),
      item({ sellerId: 'a', sellerName: 'Grande', status: 'active' }),
      item({ sellerId: 'b', sellerName: 'Pequena', status: 'active' }),
      item({ sellerId: 'b', sellerName: 'Pequena', status: 'active' }),
    ]);
    expect(v[0]).toMatchObject({ nome: 'Pequena', noAr: 2 });
    expect(v[1]).toMatchObject({ nome: 'Grande', noAr: 1, aguardando: 2, total: 3 });
  });

  it('conta vendedores distintos com item no ar', () => {
    expect(
      vendedoresComItemNoAr([
        item({ sellerId: 'a', status: 'active' }),
        item({ sellerId: 'a', status: 'active' }),
        item({ sellerId: 'b', status: 'draft' }),
      ]),
    ).toBe(1);
  });
});

describe('catálogo', () => {
  it('conta por categoria só o que está no ar', () => {
    const c = catalogoPorCategoria([
      item({ categoryId: 'miniaturas-diecast', status: 'active' }),
      item({ categoryId: 'miniaturas-diecast', status: 'active' }),
      item({ categoryId: 'cards-colecionaveis', status: 'active' }),
      item({ categoryId: 'funko-pop', status: 'draft' }),
    ]);
    expect(c[0]).toEqual({ categoria: 'miniaturas-diecast', noAr: 2 });
    expect(c.find((f) => f.categoria === 'funko-pop')).toBeUndefined();
  });

  it('distribui por faixa de preço', () => {
    const f = faixasDePreco([
      item({ priceInCents: 3000 }),
      item({ priceInCents: 9990 }),
      item({ priceInCents: 250000 }),
      item({ priceInCents: 5000, status: 'draft' }),
    ]);
    expect(f.find((x) => x.faixa === 'até R$ 50')!.itens).toBe(1);
    expect(f.find((x) => x.faixa === 'R$ 50 a 150')!.itens).toBe(1);
    expect(f.find((x) => x.faixa === 'acima de R$ 1.000')!.itens).toBe(1);
  });

  it('leilão entra pelo lance inicial, que é o valor que ele tem', () => {
    const f = faixasDePreco([
      item({ type: 'auction', priceInCents: null, startingBidInCents: 20000 } as Partial<Listing>),
    ]);
    expect(f.find((x) => x.faixa === 'R$ 150 a 300')!.itens).toBe(1);
  });

  it('soma o valor do que está no ar', () => {
    expect(
      valorDoCatalogoEmCentavos([
        item({ priceInCents: 10000 }),
        item({ priceInCents: 5000 }),
        item({ priceInCents: 99999, status: 'draft' }),
      ]),
    ).toBe(15000);
  });
});

describe('chaveDoDia', () => {
  it('usa o fuso local, que é como o admin lê a data', () => {
    expect(chaveDoDia(new Date('2026-07-25T23:30:00'))).toBe('2026-07-25');
  });
});

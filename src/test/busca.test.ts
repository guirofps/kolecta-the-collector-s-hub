import { describe, it, expect } from 'vitest';
import { normalizar, combinaComTermo, filtrarPorTermo } from '@/lib/busca';
import type { Listing } from '@/lib/api';

/**
 * Quem digitava "pokemon" recebia zero resultado, porque o acervo está escrito
 * "Pokémon" e a busca do backend compara o texto cru.
 */

let seq = 0;
const item = (over: Partial<Listing> = {}): Listing =>
  ({
    id: `l${++seq}`,
    sellerId: 's1',
    sellerName: 'Loja Um',
    categoryId: 'cards-colecionaveis',
    title: 'Pokémon Coleção Especial',
    description: null,
    brand: null,
    line: null,
    condition: 'novo',
    type: 'direct',
    priceInCents: 10000,
    images: null,
    status: 'active',
    createdAt: '2026-07-01T00:00:00Z',
    ...over,
  }) as Listing;

describe('normalizar', () => {
  it('tira acento e caixa', () => {
    expect(normalizar('Pokémon')).toBe('pokemon');
    expect(normalizar('MANGÁ')).toBe('manga');
    expect(normalizar('  Edição  ')).toBe('edicao');
  });

  it('mantém o texto sem acento intacto', () => {
    expect(normalizar('Hot Wheels')).toBe('hot wheels');
  });
});

describe('combinaComTermo', () => {
  it('acha sem acento o que está escrito com acento', () => {
    expect(combinaComTermo(item(), 'pokemon')).toBe(true);
  });

  it('acha com acento o que está escrito sem', () => {
    expect(combinaComTermo(item({ title: 'Colecao Especial' }), 'coleção')).toBe(true);
  });

  it('palavras em qualquer ordem', () => {
    const l = item({ title: 'Hot Wheels Ferrari Testarossa 1:64' });
    expect(combinaComTermo(l, 'ferrari hot wheels')).toBe(true);
    // Todas as palavras precisam aparecer: só uma bater não basta.
    expect(combinaComTermo(l, 'ferrari lamborghini')).toBe(false);
  });

  it('procura também na marca, na linha e no vendedor', () => {
    expect(combinaComTermo(item({ brand: 'Mattel' }), 'mattel')).toBe(true);
    expect(combinaComTermo(item({ sellerName: 'RODA RARA DIECAST' }), 'roda rara')).toBe(true);
  });

  it('procura no SKU, que é como o lojista acha o próprio item', () => {
    expect(combinaComTermo(item({ sku: 'HW-2026-011' }), 'hw-2026-011')).toBe(true);
  });

  it('termo vazio não filtra nada', () => {
    expect(combinaComTermo(item(), '   ')).toBe(true);
  });
});

describe('filtrarPorTermo', () => {
  it('devolve só o que casa', () => {
    const lista = [
      item({ id: 'poke', title: 'Pokémon Coleção' }),
      item({ id: 'hw', title: 'Hot Wheels Camaro' }),
    ];
    expect(filtrarPorTermo(lista, 'pokemon').map((l) => l.id)).toEqual(['poke']);
  });

  it('sem termo, devolve a lista inteira', () => {
    const lista = [item(), item()];
    expect(filtrarPorTermo(lista, '')).toHaveLength(2);
  });
});

import { describe, it, expect } from 'vitest';
import { maxQtd } from '@/contexts/CartContext';
import type { Product } from '@/lib/mock-data';

/**
 * O carrinho travava tudo em 1 unidade. Agora o teto é o estoque do anúncio:
 * peça única segue 1, item com estoque libera até o que tem. O backend revalida.
 */
const prod = (over: Partial<Product>): Product => ({ id: 'p', ...over } as Product);

describe('maxQtd (teto do carrinho pelo estoque)', () => {
  it('peça única (stock null/ausente) trava em 1', () => {
    expect(maxQtd(prod({ stock: null }))).toBe(1);
    expect(maxQtd(prod({}))).toBe(1);
  });

  it('item com estoque libera até o estoque', () => {
    expect(maxQtd(prod({ stock: 99 }))).toBe(99);
    expect(maxQtd(prod({ stock: 3 }))).toBe(3);
  });

  it('estoque zerado não deixa adicionar (teto 1 de fallback, backend barra)', () => {
    expect(maxQtd(prod({ stock: 0 }))).toBe(1);
  });
});

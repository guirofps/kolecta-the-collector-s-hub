import { describe, it, expect } from 'vitest';
import { toProduct } from '@/lib/home-sections';
import type { Listing } from '@/lib/api';

/**
 * O selo do frete compartilhado no card.
 *
 * É o maior ativo de conversão da política e sai de graça: o subsídio é uma
 * fração do PREÇO DO ITEM, então o número existe sem CEP — que a listagem não
 * tem. (Na escada estudada antes isso era impossível, e por isso o selo era "a
 * parte mais cara de implementar".)
 *
 * O valor chega PRONTO do backend. Estes testes prendem só a tradução: centavos
 * viram reais, e ausência vira ausência de selo. A regra em si é do servidor —
 * recalculá-la aqui é o erro que fez o front mostrar 11% para fundador de 9%.
 */

const base: Listing = {
  id: 'l1',
  sellerId: 's1',
  categoryId: null,
  title: 'Hot Wheels RLC',
  description: null,
  brand: null,
  line: null,
  scale: null,
  year: null,
  edition: null,
  condition: 'novo',
  type: 'direct',
  priceInCents: 30_000,
  images: null,
  status: 'active',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
} as Listing;

describe('selo do frete compartilhado', () => {
  it('traduz centavos para reais', () => {
    const p = toProduct({ ...base, shippingSubsidyMaxInCents: 1225 });
    expect(p.shippingSubsidy).toBe(12.25);
  });

  it('anúncio sem o campo não ganha selo', () => {
    expect(toProduct(base).shippingSubsidy).toBeUndefined();
  });

  it('null do backend (política off, item barato, leilão) não vira zero', () => {
    // `0` renderizaria "A Kolecta paga até R$ 0,00 do frete", que é pior do
    // que não dizer nada.
    const p = toProduct({ ...base, shippingSubsidyMaxInCents: null });
    expect(p.shippingSubsidy).toBeUndefined();
  });

  it('leilão não recebe selo nem quando o backend manda o campo', () => {
    // O backend já manda `null` em leilão — a cobertura depende do arremate,
    // que só existe no fim. Este teste documenta o contrato dos dois lados.
    const leilao = toProduct({
      ...base,
      type: 'auction',
      priceInCents: null,
      startingBidInCents: 30_000,
      shippingSubsidyMaxInCents: null,
    } as Listing);
    expect(leilao.shippingSubsidy).toBeUndefined();
  });
});

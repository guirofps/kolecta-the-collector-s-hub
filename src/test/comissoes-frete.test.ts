import { describe, it, expect } from 'vitest';
import { orderToCommission } from '@/pages/seller/Financial';
import type { Order } from '@/lib/api';

/**
 * O extrato de comissões do vendedor mostrava um percentual que oscilava sem
 * explicação — 14%, 15%, 17% para quem paga 9% fixo. A coluna dividia
 * `platform_fee` (comissão + frete) pelo total do pedido (item + frete):
 *
 *     % exibido = 0,09 + 0,91 × (frete / total)
 *
 * A taxa nunca mudou; o que mudava era o peso do frete no pedido. Os seis casos
 * abaixo são os pedidos reais do extrato de 05/08/2026, com item e frete
 * reconstruídos ao centavo a partir do que a tela mostrava.
 */

function pedido(totalInCents: number, shippingInCents: number, platformFeeInCents: number): Order {
  return {
    id: 'a'.repeat(36),
    buyerId: 'b',
    sellerId: 's',
    status: 'completed',
    totalInCents,
    shippingInCents,
    platformFeeInCents,
    sellerNetInCents: totalInCents - platformFeeInCents,
    createdAt: '2026-08-05T12:00:00.000Z',
    updatedAt: '2026-08-05T12:00:00.000Z',
  } as Order;
}

/** [total, frete, taxa cobrada, comissão esperada] — em centavos. */
const EXTRATO_REAL: [number, number, number, number][] = [
  [21192, 1193, 2993, 1800], // #4629f04c — a tela dizia 14%
  [18692, 1193, 2768, 1575], // #4a6804fb — dizia 15%
  [21692, 1193, 3038, 1845], // #b3f34d59 — dizia 14%
  [17192, 1193, 2633, 1440], // #fa3a766a — dizia 15%
  [26207, 2208, 4368, 2160], // #a3293955 — dizia 17%, o frete mais caro da lista
  [24301, 1302, 3372, 2070], // #37918f5f — dizia 14%
];

describe('orderToCommission', () => {
  it('cobra 9% em todos os seis pedidos, onde a tela mostrava de 14% a 17%', () => {
    for (const [total, frete, taxa, comissao] of EXTRATO_REAL) {
      const c = orderToCommission(pedido(total, frete, taxa));
      expect(c.percent).toBeCloseTo(0.09, 3);
      expect(c.commission).toBeCloseTo(comissao / 100, 2);
      expect(c.shipping).toBeCloseTo(frete / 100, 2);
      expect(c.itemValue).toBeCloseTo((total - frete) / 100, 2);
    }
  });

  it('mantém o total debitado idêntico ao que o backend cobrou', () => {
    // A separação não pode mudar o dinheiro: comissão + frete = total debitado,
    // e a soma da coluna continua batendo com os R$ 191,72 do extrato.
    let somaCobrada = 0;
    for (const [total, frete, taxa] of EXTRATO_REAL) {
      const c = orderToCommission(pedido(total, frete, taxa));
      expect(c.commission! + c.shipping!).toBeCloseTo(c.charged, 2);
      expect(c.charged).toBeCloseTo(taxa / 100, 2);
      somaCobrada += c.charged;
    }
    expect(somaCobrada).toBeCloseTo(191.72, 2);
  });

  it('separa os R$ 191,72 em R$ 108,90 de comissão e R$ 82,82 de frete', () => {
    // O que o vendedor precisava saber: só 57% daquilo era comissão de fato.
    const linhas = EXTRATO_REAL.map(([t, f, taxa]) => orderToCommission(pedido(t, f, taxa)));
    expect(linhas.reduce((s, c) => s + c.commission!, 0)).toBeCloseTo(108.9, 2);
    expect(linhas.reduce((s, c) => s + c.shipping!, 0)).toBeCloseTo(82.82, 2);
  });

  it('mostra a taxa cheia sem frete quando é retirada em mãos', () => {
    // Sem frete não há o que repassar, e o percentual exibido é o real.
    const c = orderToCommission(pedido(20000, 0, 2200));
    expect(c.percent).toBeCloseTo(0.11, 3);
    expect(c.shipping).toBe(0);
    expect(c.commission).toBeCloseTo(22, 2);
  });

  it('não inventa rótulo quando a conta não fecha com taxa nenhuma', () => {
    // Pedido com desconto que não bate com 9% nem 11%: as três colunas viram
    // "—" e só o total debitado é afirmado. Chutar "comissão" aqui foi o que
    // produziu o "64%" que ninguém entendia.
    const c = orderToCommission(pedido(20000, 1000, 9000));
    expect(c.commission).toBeNull();
    expect(c.shipping).toBeNull();
    expect(c.percent).toBeNull();
    expect(c.charged).toBeCloseTo(90, 2);
  });
});

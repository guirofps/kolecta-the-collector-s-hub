import { describe, it, expect } from 'vitest';
import {
  liquidacaoPendente,
  dataLiquidacao,
  DIAS_LIQUIDACAO_CARTAO,
} from '@/lib/liquidacao-cartao';
import type { Order } from '@/lib/api';

/**
 * O caso que originou o módulo, com os números reais do banco em 04/09/2026.
 *
 * O Rock Wheels tinha R$ 748,53 de saldo DISPONÍVEL na carteira e não conseguia
 * sacar: as duas vendas eram no cartão, de 09/08 e 11/08, e a Pagar.me só libera
 * o dinheiro do cartão em D+30. A tela, que só conhecia a carteira, dizia que
 * ele precisava de R$ 53,67 e "hoje você tem R$ 748,53" — enquanto o barrava.
 */

function pedido(o: Partial<Order>): Order {
  return {
    id: 'a'.repeat(36),
    buyerId: 'b',
    sellerId: 's',
    listingId: 'l',
    status: 'completed',
    totalInCents: 60000,
    paymentInstrument: 'credit_card',
    createdAt: '2026-08-09T14:25:00.000Z',
    updatedAt: '2026-08-09T14:25:00.000Z',
    ...o,
  } as Order;
}

const HOJE = new Date('2026-09-04T12:00:00.000Z');

/** As duas vendas do Rock Wheels, como estão em produção. */
const rockWheels = [
  pedido({ createdAt: '2026-08-09T14:25:00.000Z', totalInCents: 60000, sellerNetInCents: 52266 }),
  pedido({ createdAt: '2026-08-11T17:20:00.000Z', totalInCents: 27593, sellerNetInCents: 22587 }),
];

describe('dataLiquidacao', () => {
  it('soma o prazo do cartão à data da venda', () => {
    const d = dataLiquidacao({ createdAt: '2026-08-09T14:25:00.000Z' });
    expect(d.toISOString().slice(0, 10)).toBe('2026-09-08');
  });

  it('usa o prazo declarado, não um número solto', () => {
    expect(DIAS_LIQUIDACAO_CARTAO).toBe(30);
  });
});

describe('liquidacaoPendente', () => {
  it('soma o líquido das vendas no cartão ainda dentro do prazo', () => {
    const r = liquidacaoPendente(rockWheels, HOJE);
    expect(r.vendas).toBe(2);
    expect(r.valor).toBeCloseTo(748.53, 2);
  });

  it('aponta a próxima liberação e a última', () => {
    const r = liquidacaoPendente(rockWheels, HOJE);
    expect(r.proxima?.toISOString().slice(0, 10)).toBe('2026-09-08');
    expect(r.ultima?.toISOString().slice(0, 10)).toBe('2026-09-10');
  });

  it('ignora venda no cartão que já passou do prazo', () => {
    // A venda da Besttoysale: cartão em 31/07, já liberada em 30/08.
    const r = liquidacaoPendente(
      [pedido({ createdAt: '2026-07-31T10:00:00.000Z', sellerNetInCents: 3428 })],
      HOJE,
    );
    expect(r.vendas).toBe(0);
    expect(r.valor).toBe(0);
    expect(r.proxima).toBeNull();
  });

  it('ignora PIX — cai como disponível quase na hora', () => {
    const r = liquidacaoPendente(
      [pedido({ paymentInstrument: 'pix', createdAt: '2026-09-01T10:00:00.000Z' })],
      HOJE,
    );
    expect(r.vendas).toBe(0);
  });

  it('ignora pedido ainda retido: esse dinheiro é "A receber", não disponível', () => {
    // Contar os dois juntos prometeria duas vezes o mesmo valor na tela.
    const r = liquidacaoPendente(
      [pedido({ status: 'delivered', createdAt: '2026-09-01T10:00:00.000Z' })],
      HOJE,
    );
    expect(r.vendas).toBe(0);
  });

  it('cai no bruto quando o líquido não foi gravado', () => {
    const r = liquidacaoPendente(
      [pedido({ sellerNetInCents: null, totalInCents: 10000 })],
      HOJE,
    );
    expect(r.valor).toBeCloseTo(100, 2);
  });

  it('sem vendas presas devolve zerado, sem inventar data', () => {
    const r = liquidacaoPendente([], HOJE);
    expect(r).toEqual({ valor: 0, proxima: null, ultima: null, vendas: 0 });
  });
});

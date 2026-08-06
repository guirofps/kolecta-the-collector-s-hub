import { describe, it, expect } from 'vitest';
import { orderToTransfer } from '@/pages/seller/Financial';
import type { Order } from '@/lib/api';

/**
 * O tab Repasses mostrava bruto, descontos e líquido — e a linha não fechava:
 * faltava a taxa da Pagar.me, que o backend subtrai em `seller_net_in_cents` mas
 * a tela não exibia. A diferença ficava sem dono, e o vendedor só via sumir.
 *
 * Os casos abaixo são pedidos reais lidos do banco de produção em 05/08/2026.
 */

function pedido(o: Partial<Order>): Order {
  return {
    id: 'a'.repeat(36),
    buyerId: 'b',
    sellerId: 's',
    status: 'completed',
    createdAt: '2026-08-05T12:00:00.000Z',
    updatedAt: '2026-08-05T12:00:00.000Z',
    ...o,
  } as Order;
}

/** [total, comissão+frete, taxa gateway, líquido] em centavos — dados de prod. */
const REPASSES_REAIS: [number, number, number, number][] = [
  [21192, 2993, 231, 17968], // #4629f04c — PIX 1,09%
  [18692, 2768, 204, 15720], // #4a6804fb — PIX
  [21692, 3038, 236, 18418], // #b3f34d59 — PIX
  [17192, 2633, 187, 14372], // #fa3a766a — PIX
  [26207, 4368, 286, 21553], // #a3293955 — PIX
  [24301, 3372, 265, 20664], // #37918f5f — PIX
  [5209, 1578, 203, 3428], // #99e99de1 — cartão 3,89%, a primeira venda real
];

describe('orderToTransfer — taxa da Pagar.me', () => {
  it('fecha a conta: bruto − comissão+frete − taxa = líquido', () => {
    for (const [total, taxaKolecta, taxaGateway, liquido] of REPASSES_REAIS) {
      const t = orderToTransfer(
        pedido({
          totalInCents: total,
          platformFeeInCents: taxaKolecta,
          gatewayFeeInCents: taxaGateway,
          sellerNetInCents: liquido,
        }),
      );
      expect(t.gross - t.commission! - t.gatewayFee!).toBeCloseTo(t.net!, 2);
      expect(t.gatewayFee).toBeCloseTo(taxaGateway / 100, 2);
    }
  });

  it('mostra "—" em vez de R$ 0,00 quando a taxa não foi registrada', () => {
    // Pedidos anteriores à conta nova: as taxas do contrato ainda não estavam
    // no ambiente, então gravaram zero. A Pagar.me cobrou mesmo assim
    // (charge_processing_fee no split) — dizer "R$ 0,00" seria mentira.
    const t = orderToTransfer(
      pedido({
        totalInCents: 2527,
        platformFeeInCents: 1637,
        gatewayFeeInCents: 0,
        sellerNetInCents: 890,
      }),
    );
    expect(t.gatewayFee).toBeNull();
  });

  it('trata taxa ausente como não registrada', () => {
    const t = orderToTransfer(
      pedido({ totalInCents: 10000, platformFeeInCents: 1100, sellerNetInCents: 8900 }),
    );
    expect(t.gatewayFee).toBeNull();
  });

  it('não deixa a taxa do gateway mexer na comissão nem no líquido', () => {
    // A coluna nova só EXIBE o que o backend já descontou; se ela passasse a
    // participar do cálculo, o líquido sairia diferente do saldo da carteira.
    const t = orderToTransfer(
      pedido({
        totalInCents: 21192,
        platformFeeInCents: 2993,
        gatewayFeeInCents: 231,
        sellerNetInCents: 17968,
      }),
    );
    expect(t.commission).toBeCloseTo(29.93, 2);
    expect(t.net).toBeCloseTo(179.68, 2);
  });
});

import { describe, it, expect } from 'vitest';
import { montarExtrato } from '@/lib/order-breakdown';

/**
 * A tela do vendedor mostrava "Comissão Kolecta (64%)". O número saía de
 * dividir TUDO que foi descontado pelo total do pedido COM frete, misturando a
 * comissão (que incide só sobre o item) com o custo da etiqueta.
 */

describe('montarExtrato', () => {
  it('separa item e frete, que a tela somava num "valor bruto" só', () => {
    const e = montarExtrato({ totalInCents: 5000, shippingInCents: 3000 });
    expect(e.itemInCents).toBe(2000);
    expect(e.freteInCents).toBe(3000);
    expect(e.totalInCents).toBe(5000);
  });

  it('explica os descontos quando incluem a etiqueta', () => {
    // Caso do pedido teste: item R$ 20, frete R$ 30, e o vendedor arca com a
    // etiqueta. Descontos = 2,20 de comissão + 30 de frete = 32,20.
    const e = montarExtrato({
      totalInCents: 5000,
      shippingInCents: 3000,
      platformFeeInCents: 3220,
      sellerNetInCents: 1780,
    });
    expect(e.detalhe).not.toBeNull();
    expect(e.detalhe!.comissaoInCents).toBe(220);
    expect(e.detalhe!.etiquetaInCents).toBe(3000);
    // 11% sobre o ITEM, não os 64% sobre o total que a tela mostrava.
    expect(e.detalhe!.taxaSobreItem).toBeCloseTo(0.11);
  });

  it('explica os descontos quando são só comissão', () => {
    const e = montarExtrato({
      totalInCents: 5000,
      shippingInCents: 3000,
      platformFeeInCents: 220,
      sellerNetInCents: 4780,
    });
    expect(e.detalhe).toMatchObject({ comissaoInCents: 220, etiquetaInCents: 0 });
  });

  it('não inventa rótulo quando os números não fecham', () => {
    // Chutar "comissão" para um desconto que não é comissão foi o que criou o
    // 64%. Sem explicação, a tela mostra só o total dos descontos.
    const e = montarExtrato({
      totalInCents: 5000,
      shippingInCents: 3000,
      platformFeeInCents: 4000,
      sellerNetInCents: 1000,
    });
    expect(e.detalhe).toBeNull();
    expect(e.descontosInCents).toBe(4000);
  });

  it('pedido sem frete continua fazendo sentido', () => {
    const e = montarExtrato({
      totalInCents: 10000,
      shippingInCents: 0,
      platformFeeInCents: 1100,
      sellerNetInCents: 8900,
    });
    expect(e.itemInCents).toBe(10000);
    expect(e.detalhe).toMatchObject({ comissaoInCents: 1100, etiquetaInCents: 0 });
  });

  it('aguenta pedido sem os campos financeiros', () => {
    // GET de lista não popula platformFee/sellerNet: a tela não pode quebrar.
    const e = montarExtrato({ totalInCents: 5000 });
    expect(e.itemInCents).toBe(5000);
    expect(e.descontosInCents).toBe(0);
    expect(e.liquidoInCents).toBe(5000);
    expect(e.detalhe).toBeNull();
  });

  it('frete maior que o total não gera item negativo', () => {
    // Dado inconsistente do backend não pode virar "item: -R$ 10,00" na tela.
    const e = montarExtrato({ totalInCents: 2000, shippingInCents: 3000 });
    expect(e.itemInCents).toBe(0);
  });

  it('usa o líquido do backend, não o recalculado', () => {
    // Se o backend cobrou algo que não sabemos explicar, quem manda é ele.
    const e = montarExtrato({
      totalInCents: 5000,
      platformFeeInCents: 1000,
      sellerNetInCents: 3500,
    });
    expect(e.liquidoInCents).toBe(3500);
  });
});

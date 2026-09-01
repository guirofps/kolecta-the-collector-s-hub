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

  /**
   * Reportado por um vendedor em 12/08, com razão: a tela mostrava item
   * R$ 200,00, comissão de R$ 18,00 e líquido de R$ 174,22. Faltavam R$ 7,78
   * sem nenhuma linha que os explicasse — a taxa da operadora não existia no
   * modelo, então os descontos exibidos não somavam o líquido logo abaixo.
   */
  it('mostra a taxa do gateway, que sumia da conta (arremate de R$ 200)', () => {
    const e = montarExtrato({
      totalInCents: 20000,
      shippingInCents: 0,
      platformFeeInCents: 1800, // 9% — vendedor Membro Fundador
      gatewayFeeInCents: 778,
      sellerNetInCents: 17422,
    });

    expect(e.detalhe).toMatchObject({
      comissaoInCents: 1800,
      etiquetaInCents: 0,
      gatewayInCents: 778,
    });
    expect(e.detalhe!.taxaSobreItem).toBeCloseTo(0.09);
    // E agora a conta FECHA: 200,00 − 18,00 − 7,78 = 174,22.
    expect(e.descontosInCents).toBe(2578);
    expect(e.totalInCents - e.descontosInCents).toBe(e.liquidoInCents);
  });

  it('gateway convive com comissão e etiqueta na mesma venda', () => {
    // Item R$ 100 + frete R$ 15,50; comissão 11% + etiqueta = 2650; gateway 449.
    const e = montarExtrato({
      totalInCents: 11550,
      shippingInCents: 1550,
      platformFeeInCents: 2650,
      gatewayFeeInCents: 449,
      sellerNetInCents: 8451,
    });

    expect(e.detalhe).toMatchObject({
      comissaoInCents: 1100,
      etiquetaInCents: 1550,
      gatewayInCents: 449,
    });
    expect(e.totalInCents - e.descontosInCents).toBe(e.liquidoInCents);
  });

  /**
   * A regra estrutural: as linhas TÊM que somar os descontos. Antes bastava a
   * comissão bater com uma taxa conhecida, e o resto podia sumir da soma — foi
   * exatamente assim que a taxa do gateway desapareceu da tela.
   */
  it('cai no agregado quando sobra desconto sem linha própria', () => {
    const e = montarExtrato({
      totalInCents: 20000,
      shippingInCents: 0,
      platformFeeInCents: 1800,
      gatewayFeeInCents: 0, // backend antigo, sem o campo
      sellerNetInCents: 17422, // mas o líquido já embute a taxa
    });

    // 1800 != 2578 → não fecha → não inventa linhas.
    expect(e.detalhe).toBeNull();
    expect(e.descontosInCents).toBe(2578);
    expect(e.totalInCents - e.descontosInCents).toBe(e.liquidoInCents);
  });

  it('o extrato SEMPRE fecha, tenha detalhe ou não', () => {
    const casos = [
      { totalInCents: 20000, platformFeeInCents: 1800, gatewayFeeInCents: 778, sellerNetInCents: 17422 },
      { totalInCents: 5000, shippingInCents: 3000, platformFeeInCents: 4000, sellerNetInCents: 1000 },
      { totalInCents: 5000 },
      { totalInCents: 11550, shippingInCents: 1550, platformFeeInCents: 2650, gatewayFeeInCents: 449, sellerNetInCents: 8451 },
    ];

    for (const caso of casos) {
      const e = montarExtrato(caso);
      expect(e.totalInCents - e.descontosInCents).toBe(e.liquidoInCents);
      if (e.detalhe) {
        const soma =
          e.detalhe.comissaoInCents +
          e.detalhe.etiquetaInCents +
          e.detalhe.gatewayInCents;
        expect(soma).toBe(e.descontosInCents);
      }
    }
  });

  /**
   * Frete compartilhado: o extrato do VENDEDOR não muda.
   *
   * O subsídio sai inteiro da comissão da Kolecta — é a promessa da política, e
   * é a que não pode quebrar. `shipping_in_cents` continua sendo o frete
   * COBRADO do comprador, então o extrato lê os mesmos campos de sempre e
   * fecha do mesmo jeito.
   */
  describe('pedido com frete subsidiado', () => {
    // Item R$ 165,23, etiqueta R$ 13,76, a Kolecta bancou R$ 11,57.
    // Comprador paga 165,23 + 2,19 = 167,42.
    // Split da plataforma = comissão 18,18 + frete cobrado 2,19 = 20,37.
    const ITEM = 16523;
    const FRETE_COBRADO = 219;
    const subsidiado = {
      totalInCents: ITEM + FRETE_COBRADO,
      shippingInCents: FRETE_COBRADO,
      platformFeeInCents: 1818 + FRETE_COBRADO,
      sellerNetInCents: ITEM - 1818,
    };

    it('o vendedor recebe item menos comissão, como sempre', () => {
      const e = montarExtrato(subsidiado);
      expect(e.itemInCents).toBe(ITEM);
      expect(e.liquidoInCents).toBe(ITEM - 1818);
    });

    it('a comissão continua sendo 11% sobre o item, não um número estranho', () => {
      const e = montarExtrato(subsidiado);
      expect(e.detalhe).not.toBeNull();
      expect(e.detalhe!.comissaoInCents).toBe(1818);
      expect(e.detalhe!.taxaSobreItem).toBeCloseTo(0.11);
    });

    it('frete 100% grátis: o extrato não quebra e o líquido não muda', () => {
      // A Kolecta cobriu os R$ 13,76 inteiros: o comprador paga só o item.
      const gratis = {
        totalInCents: ITEM,
        shippingInCents: 0,
        platformFeeInCents: 1818,
        sellerNetInCents: ITEM - 1818,
      };
      const e = montarExtrato(gratis);
      expect(e.itemInCents).toBe(ITEM);
      expect(e.freteInCents).toBe(0);
      expect(e.liquidoInCents).toBe(ITEM - 1818);
      expect(e.detalhe!.comissaoInCents).toBe(1818);
      // O que a Kolecta gastou de etiqueta não é desconto do vendedor.
      expect(e.detalhe!.etiquetaInCents).toBe(0);
    });
  });
});

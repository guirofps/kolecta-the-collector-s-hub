import { describe, it, expect } from 'vitest';
import { montarExtrato } from '@/lib/order-breakdown';
import {
  COMMISSION_RATE,
  FOUNDER_COMMISSION_RATE,
  commissionLabel,
  sellerNet,
} from '@/lib/fees';

/**
 * A taxa do Membro Fundador (9%) no que o vendedor VÊ.
 *
 * O backend sempre cobrou certo — conferido contra a produção em 05/08/2026:
 * dos 12 pedidos pagos, os de fundador ativo saíram a 9% e os demais a 11%. O
 * furo era só de exibição, e em dois lugares:
 *
 *  1. `order-breakdown` reconhecia a comissão comparando com 11% FIXO, com
 *     tolerância de 1 ponto. Um pedido a 9% dá |0.09 - 0.11| = 0.02 e falhava
 *     as duas hipóteses: o extrato caía no `null` e o fundador via um bolo de
 *     "descontos" sem a linha de comissão — justamente quem tem a melhor taxa.
 *  2. O wizard de anúncio calculava o repasse com 11% para todo mundo, ou seja,
 *     mostrava o número errado no lugar em que o vendedor decide o preço.
 *
 * Os casos abaixo usam números REAIS de produção.
 */

describe('extrato do pedido reconhece a taxa do fundador', () => {
  // RA/AP. Diecast (#6), pedido de 01/08/2026: item R$ 229,99, comissão
  // R$ 20,70 (9%), sem frete embutido.
  it('pedido de fundador a 9% deixa de cair no "sem detalhe"', () => {
    const extrato = montarExtrato({
      totalInCents: 22999,
      shippingInCents: 0,
      platformFeeInCents: 2070,
      sellerNetInCents: 20929,
    });

    // Era exatamente isto que quebrava: `detalhe` vinha null.
    expect(extrato.detalhe).not.toBeNull();
    expect(extrato.detalhe!.comissaoInCents).toBe(2070);
    expect(extrato.detalhe!.taxaSobreItem).toBeCloseTo(FOUNDER_COMMISSION_RATE, 4);
  });

  it('pedido de fundador com frete embutido separa comissão e etiqueta', () => {
    // Item R$ 159,99 a 9% = R$ 14,40, mais R$ 18,50 de etiqueta.
    const extrato = montarExtrato({
      totalInCents: 17849,
      shippingInCents: 1850,
      platformFeeInCents: 1440 + 1850,
      sellerNetInCents: 14559,
    });

    expect(extrato.detalhe).not.toBeNull();
    expect(extrato.detalhe!.comissaoInCents).toBe(1440);
    expect(extrato.detalhe!.etiquetaInCents).toBe(1850);
    expect(extrato.detalhe!.taxaSobreItem).toBeCloseTo(FOUNDER_COMMISSION_RATE, 4);
  });

  it('pedido na taxa cheia continua funcionando como antes', () => {
    // Daniel Salgado, 25/07: item R$ 20,00, comissão R$ 2,20 (11%).
    const extrato = montarExtrato({
      totalInCents: 2000,
      shippingInCents: 0,
      platformFeeInCents: 220,
      sellerNetInCents: 1780,
    });

    expect(extrato.detalhe).not.toBeNull();
    expect(extrato.detalhe!.taxaSobreItem).toBeCloseTo(COMMISSION_RATE, 4);
  });

  it('desconto que não bate com nenhuma taxa conhecida ainda vira null', () => {
    // A proteção original continua de pé: rotular errado um desconto de 60% foi
    // o que produziu o "Comissão Kolecta (64%)" que ninguém entendia.
    const extrato = montarExtrato({
      totalInCents: 10000,
      shippingInCents: 0,
      platformFeeInCents: 6000,
      sellerNetInCents: 4000,
    });

    expect(extrato.detalhe).toBeNull();
    expect(extrato.descontosInCents).toBe(6000);
  });
});

describe('previsão de repasse usa a taxa de quem está anunciando', () => {
  it('fundador recebe mais que a taxa cheia no mesmo preço', () => {
    const preco = 100;
    const cheia = sellerNet(preco, COMMISSION_RATE);
    const fundador = sellerNet(preco, FOUNDER_COMMISSION_RATE);

    expect(cheia).toBeCloseTo(87, 2); // 100 - 11 - 2 (taxa operacional)
    expect(fundador).toBeCloseTo(89, 2); // 100 - 9 - 2
    expect(fundador).toBeGreaterThan(cheia);
  });

  it('sem taxa informada, assume a cheia — errar para menos é o lado seguro', () => {
    expect(sellerNet(100)).toBeCloseTo(sellerNet(100, COMMISSION_RATE), 6);
  });

  it('rótulo acompanha a taxa, em vez de dizer 11% para todo mundo', () => {
    expect(commissionLabel(COMMISSION_RATE)).toBe('11%');
    expect(commissionLabel(FOUNDER_COMMISSION_RATE)).toBe('9%');
  });

  it('a taxa do fundador espelha o backend (FOUNDER_COMMISSION_PERCENT = 9)', () => {
    expect(FOUNDER_COMMISSION_RATE).toBe(0.09);
  });
});

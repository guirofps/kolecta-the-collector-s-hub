import { describe, it, expect } from 'vitest';
import type { MyBid } from '@/lib/api';
import { getBidStatus } from '@/pages/account/MyBids';

/**
 * Este arquivo testava uma CÓPIA COLADA de `getBidStatus`, não a função da tela.
 *
 * A cópia nem lia `bid.status`, e o ramo de leilão encerrado comparava
 * `currentWinnerId === auctionId` — id de usuário contra id de leilão, que nunca
 * é igual. Ficava verde provando nada: quando a tela ganhou o status do LANCE, o
 * teste não acompanhou, e o caso `released` chegou em produção mostrando
 * "Escolha o frete" a quem não tinha arrematado nada (01/09/2026).
 *
 * Agora importa a função de verdade. Se a tela mudar, isto quebra junto.
 */

const baseBid: MyBid = {
  id: 'bid_001',
  auctionId: 'auction_001',
  amountInCents: 10000,
  createdAt: new Date().toISOString(),
  status: 'active',
  auctionStatus: 'active',
  auctionEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  currentBidInCents: 10000,
  currentWinnerId: null,
  listingId: 'listing_001',
  title: 'Hot Wheels RLC Exclusivo',
  images: null,
};

describe('getBidStatus', () => {
  describe('o status do LANCE manda quando existe', () => {
    it('"won" é arremate já pago — não volta a pedir ação', () => {
      expect(
        getBidStatus({ ...baseBid, status: 'won', auctionStatus: 'ended' }),
      ).toBe('won_paid');
    });

    it('"lost" é perdido ou prazo vencido, mesmo sendo o maior lance', () => {
      expect(
        getBidStatus({
          ...baseBid,
          status: 'lost',
          auctionStatus: 'ended',
          amountInCents: 10000,
          currentBidInCents: 10000,
        }),
      ).toBe('lost');
    });

    /**
     * O caso que travou Carlos Neandro e Christian Rios.
     *
     * Reserva não atingida: o backend encerra sem venda, libera a retenção no
     * cartão e marca o lance como 'released'. Não existe pedido — logo não há
     * frete a escolher. Sem este ramo o lance caía na dedução por leilão e, por
     * ser o maior num leilão 'ended', virava `won_pending`: a tela dizia
     * "Escolha o frete" e o botão levava a uma lista de pedidos vazia.
     */
    it('"released" = reserva não atingida, NUNCA "escolha o frete"', () => {
      const bid: MyBid = {
        ...baseBid,
        status: 'released',
        auctionStatus: 'ended',
        amountInCents: 1100,
        currentBidInCents: 1100, // era o maior lance, e mesmo assim não arrematou
        currentWinnerId: 'user_carlos',
      };

      expect(getBidStatus(bid)).toBe('reserve_not_met');
      expect(getBidStatus(bid)).not.toBe('won_pending');
    });
  });

  describe('leilão ativo', () => {
    it('bate o lance atual → "leading"', () => {
      expect(
        getBidStatus({
          ...baseBid,
          auctionStatus: 'active',
          amountInCents: 50000,
          currentBidInCents: 50000,
        }),
      ).toBe('leading');
    });

    it('abaixo do lance atual → "outbid"', () => {
      expect(
        getBidStatus({
          ...baseBid,
          auctionStatus: 'active',
          amountInCents: 8000,
          currentBidInCents: 10000,
        }),
      ).toBe('outbid');
    });

    it('sem lance atual no leilão → "outbid" (null nunca casa)', () => {
      expect(
        getBidStatus({
          ...baseBid,
          auctionStatus: 'active',
          amountInCents: 10000,
          currentBidInCents: null,
        }),
      ).toBe('outbid');
    });
  });

  describe('leilão encerrado, lance ainda vivo', () => {
    it('maior lance → "won_pending": falta escolher entrega e pagar', () => {
      expect(
        getBidStatus({
          ...baseBid,
          status: 'active',
          auctionStatus: 'ended',
          amountInCents: 20000,
          currentBidInCents: 20000,
        }),
      ).toBe('won_pending');
    });

    it('lance superado → "lost"', () => {
      expect(
        getBidStatus({
          ...baseBid,
          status: 'outbid',
          auctionStatus: 'ended',
          amountInCents: 5000,
          currentBidInCents: 20000,
        }),
      ).toBe('lost');
    });
  });

  describe('leilão cancelado', () => {
    it('é sempre "lost", mesmo liderando', () => {
      expect(
        getBidStatus({
          ...baseBid,
          auctionStatus: 'cancelled',
          amountInCents: 50000,
          currentBidInCents: 50000,
          currentWinnerId: 'auction_001',
        }),
      ).toBe('lost');
    });
  });
});

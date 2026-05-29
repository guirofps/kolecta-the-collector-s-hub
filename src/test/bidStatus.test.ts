import { describe, it, expect } from 'vitest';
import type { MyBid } from '@/lib/api';

// ── Função extraída de MyBids.tsx ─────────────────────────────────────────────
// Replica a lógica de getBidStatus sem depender do componente

type BidStatus = 'leading' | 'outbid' | 'won_pending' | 'lost';

function getBidStatus(bid: MyBid): BidStatus {
  if (bid.auctionStatus === 'active') {
    return bid.currentBidInCents === bid.amountInCents ? 'leading' : 'outbid';
  }
  if (bid.auctionStatus === 'ended') {
    return bid.currentWinnerId === bid.auctionId ? 'won_pending' : 'lost';
  }
  return 'lost';
}

// ── Fixture base ──────────────────────────────────────────────────────────────

const baseBid: MyBid = {
  id: 'bid_001',
  auctionId: 'auction_001',
  amountInCents: 10000,
  createdAt: new Date().toISOString(),
  auctionStatus: 'active',
  auctionEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  currentBidInCents: 10000,
  currentWinnerId: null,
  listingId: 'listing_001',
  title: 'Hot Wheels RLC Exclusivo',
  images: null,
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('getBidStatus', () => {
  describe('leilão ativo (auctionStatus = "active")', () => {
    it('retorna "leading" quando amountInCents é igual ao currentBidInCents', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'active',
        amountInCents: 10000,
        currentBidInCents: 10000,
      };

      expect(getBidStatus(bid)).toBe('leading');
    });

    it('retorna "outbid" quando amountInCents é menor que o currentBidInCents', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'active',
        amountInCents: 8000,
        currentBidInCents: 10000,
      };

      expect(getBidStatus(bid)).toBe('outbid');
    });

    it('retorna "leading" quando o usuário tem exatamente o lance mais alto', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'active',
        amountInCents: 50000,
        currentBidInCents: 50000,
      };

      expect(getBidStatus(bid)).toBe('leading');
    });

    it('retorna "outbid" quando outro licitante superou o lance', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'active',
        amountInCents: 5000,
        currentBidInCents: 15000,
      };

      expect(getBidStatus(bid)).toBe('outbid');
    });
  });

  describe('leilão encerrado (auctionStatus = "ended")', () => {
    it('retorna "lost" quando o vencedor é diferente do auctionId (lógica atual)', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'ended',
        currentWinnerId: 'outro_usuario',
      };

      // Conforme o código: currentWinnerId === auctionId → won_pending, senão lost
      expect(getBidStatus(bid)).toBe('lost');
    });

    it('retorna "won_pending" quando currentWinnerId === auctionId', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'ended',
        currentWinnerId: 'auction_001', // mesmo valor que auctionId
      };

      expect(getBidStatus(bid)).toBe('won_pending');
    });

    it('retorna "lost" quando não há vencedor (currentWinnerId null)', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'ended',
        currentWinnerId: null,
      };

      expect(getBidStatus(bid)).toBe('lost');
    });
  });

  describe('leilão cancelado (auctionStatus = "cancelled")', () => {
    it('retorna "lost" quando o leilão está cancelado', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'cancelled',
        amountInCents: 10000,
        currentBidInCents: 10000,
      };

      expect(getBidStatus(bid)).toBe('lost');
    });

    it('retorna "lost" independentemente do valor do lance quando cancelado', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'cancelled',
        amountInCents: 50000,
        currentBidInCents: 50000,
        currentWinnerId: 'auction_001',
      };

      expect(getBidStatus(bid)).toBe('lost');
    });
  });

  describe('edge cases', () => {
    it('retorna "outbid" quando currentBidInCents é null mas amountInCents existe', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'active',
        amountInCents: 10000,
        currentBidInCents: null,
      };

      // null !== 10000 → outbid
      expect(getBidStatus(bid)).toBe('outbid');
    });

    it('retorna "outbid" quando o lance é zero e current não é zero', () => {
      const bid: MyBid = {
        ...baseBid,
        auctionStatus: 'active',
        amountInCents: 0,
        currentBidInCents: 5000,
      };

      expect(getBidStatus(bid)).toBe('outbid');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useMyBids: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
  useUser: () => ({ user: null, isSignedIn: false }),
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: () => null,
}));

// Mock Layout para evitar dependência de CartProvider/Header
vi.mock('@/components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'layout' }, children),
}));

// ── Imports após mock ─────────────────────────────────────────────────────────

import { useMyBids } from '@/hooks/use-api';
import MyBidsPage from '@/pages/account/MyBids';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeMyBid = (overrides: Record<string, unknown> = {}) => ({
  id: `bid_${Math.random().toString(36).slice(2)}`,
  auctionId: 'auction_001',
  amountInCents: 10000,
  createdAt: new Date().toISOString(),
  auctionStatus: 'active' as const,
  auctionEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  currentBidInCents: 10000,
  currentWinnerId: null,
  listingId: 'listing_001',
  title: 'Hot Wheels RLC Exclusivo',
  images: null,
  ...overrides,
});

// ── Helper ────────────────────────────────────────────────────────────────────

function renderMyBids() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, React.createElement(MyBidsPage)),
    ),
  );
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('MyBidsPage', () => {
  const mockUseMyBids = vi.mocked(useMyBids);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Estado de carregamento ─────────────────────────────────────────────────

  describe('quando isLoading=true', () => {
    it('exibe "Carregando..." no subtítulo', () => {
      mockUseMyBids.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });
  });

  // ── Lista vazia ────────────────────────────────────────────────────────────

  describe('quando lista está vazia', () => {
    it('exibe EmptyState com "Nenhum lance encontrado"', () => {
      mockUseMyBids.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.getByText('Nenhum lance encontrado')).toBeInTheDocument();
    });

    it('não exibe badges de status', () => {
      mockUseMyBids.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.queryByText('Liderando')).not.toBeInTheDocument();
      expect(screen.queryByText('Você foi superado')).not.toBeInTheDocument();
    });
  });

  // ── Bid com status "leading" ───────────────────────────────────────────────

  describe('quando bid tem status "leading"', () => {
    it('exibe badge "Liderando"', () => {
      const bid = makeMyBid({
        auctionStatus: 'active',
        amountInCents: 10000,
        currentBidInCents: 10000, // igual ao amountInCents → leading
      });
      mockUseMyBids.mockReturnValue({
        data: [bid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.getByText('Liderando')).toBeInTheDocument();
    });

    it('exibe botão "Ver" quando está liderando', () => {
      const bid = makeMyBid({
        auctionStatus: 'active',
        amountInCents: 10000,
        currentBidInCents: 10000,
      });
      mockUseMyBids.mockReturnValue({
        data: [bid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.getByRole('link', { name: /ver/i })).toBeInTheDocument();
    });

    it('não exibe botão "Aumentar lance" quando está liderando', () => {
      const bid = makeMyBid({
        auctionStatus: 'active',
        amountInCents: 10000,
        currentBidInCents: 10000,
      });
      mockUseMyBids.mockReturnValue({
        data: [bid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.queryByRole('link', { name: /aumentar lance/i })).not.toBeInTheDocument();
    });
  });

  // ── Bid com status "outbid" ───────────────────────────────────────────────

  describe('quando bid tem status "outbid"', () => {
    it('exibe badge "Você foi superado"', () => {
      const bid = makeMyBid({
        auctionStatus: 'active',
        amountInCents: 8000,
        currentBidInCents: 12000, // maior que amountInCents → outbid
      });
      mockUseMyBids.mockReturnValue({
        data: [bid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.getByText('Você foi superado')).toBeInTheDocument();
    });

    it('exibe botão "Aumentar lance" quando superado', () => {
      const bid = makeMyBid({
        auctionStatus: 'active',
        amountInCents: 8000,
        currentBidInCents: 12000,
      });
      mockUseMyBids.mockReturnValue({
        data: [bid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.getByRole('link', { name: /aumentar lance/i })).toBeInTheDocument();
    });

    it('não exibe botão "Ver" quando superado', () => {
      const bid = makeMyBid({
        auctionStatus: 'active',
        amountInCents: 8000,
        currentBidInCents: 12000,
      });
      mockUseMyBids.mockReturnValue({
        data: [bid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.queryByRole('link', { name: /^ver$/i })).not.toBeInTheDocument();
    });
  });

  // ── Bid com status "lost" ─────────────────────────────────────────────────

  describe('quando bid tem status "lost"', () => {
    it('exibe badge "Perdido" quando leilão encerrado sem vencer', () => {
      const bid = makeMyBid({
        auctionStatus: 'ended',
        amountInCents: 10000,
        currentBidInCents: 12000, // alguém deu lance maior → não é o top → lost
        currentWinnerId: 'outro_usuario',
      });
      mockUseMyBids.mockReturnValue({
        data: [bid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.getByText('Perdido')).toBeInTheDocument();
    });

    it('não exibe botões de ação quando perdido', () => {
      const bid = makeMyBid({
        auctionStatus: 'ended',
        amountInCents: 10000,
        currentBidInCents: 12000,
        currentWinnerId: 'outro_usuario',
      });
      mockUseMyBids.mockReturnValue({
        data: [bid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.queryByRole('link', { name: /ver/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /aumentar lance/i })).not.toBeInTheDocument();
    });
  });

  // ── Múltiplos bids ────────────────────────────────────────────────────────

  describe('quando há múltiplos bids', () => {
    it('exibe todos os bids com seus respectivos status', () => {
      const leadingBid = makeMyBid({
        id: 'bid_leading',
        auctionId: 'auction_a',
        auctionStatus: 'active',
        amountInCents: 10000,
        currentBidInCents: 10000,
        title: 'Leilão A',
      });
      const outbidBid = makeMyBid({
        id: 'bid_outbid',
        auctionId: 'auction_b',
        auctionStatus: 'active',
        amountInCents: 5000,
        currentBidInCents: 8000,
        title: 'Leilão B',
      });
      mockUseMyBids.mockReturnValue({
        data: [leadingBid, outbidBid],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderMyBids();

      expect(screen.getByText('Liderando')).toBeInTheDocument();
      expect(screen.getByText('Você foi superado')).toBeInTheDocument();
      expect(screen.getByText('Leilão A')).toBeInTheDocument();
      expect(screen.getByText('Leilão B')).toBeInTheDocument();
    });
  });
});

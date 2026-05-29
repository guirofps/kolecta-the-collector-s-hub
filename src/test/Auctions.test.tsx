import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useAuctions: vi.fn(),
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

import { useAuctions } from '@/hooks/use-api';
import AuctionsPage from '@/pages/Auctions';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeAuction = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: `auction_${Math.random().toString(36).slice(2)}`,
  listingId: 'listing_001',
  startingBidInCents: 5000,
  minIncrementInCents: 1000,
  currentBidInCents: 5000,
  reservePriceInCents: null,
  currentWinnerId: null,
  durationHours: 48,
  endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  antiSniper: true,
  status: 'active',
  title: 'Hot Wheels RLC Exclusivo',
  images: null,
  condition: 'lacrado',
  sellerId: 'seller_001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ── Helper ────────────────────────────────────────────────────────────────────

function renderAuctions() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, React.createElement(AuctionsPage)),
    ),
  );
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AuctionsPage', () => {
  const mockUseAuctions = vi.mocked(useAuctions);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Estado de carregamento ─────────────────────────────────────────────────

  describe('quando isLoading=true', () => {
    it('exibe skeletons e não renderiza cards de leilão', () => {
      mockUseAuctions.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      const { container } = renderAuctions();

      // Skeleton usa classe animate-pulse
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);

      // Sem cards de leilão durante loading
      const auctionLinks = container.querySelectorAll('a[href*="modo-lance"]');
      expect(auctionLinks.length).toBe(0);
    });

    it('exibe "Carregando..." na descrição', () => {
      mockUseAuctions.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      renderAuctions();

      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });
  });

  // ── Lista vazia ────────────────────────────────────────────────────────────

  describe('quando lista está vazia', () => {
    it('exibe EmptyState com texto "Nenhum leilão ativo"', () => {
      mockUseAuctions.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderAuctions();

      expect(screen.getByText('Nenhum leilão ativo')).toBeInTheDocument();
    });

    it('não exibe cards de leilão', () => {
      mockUseAuctions.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const { container } = renderAuctions();

      const auctionLinks = container.querySelectorAll('a[href*="modo-lance"]');
      expect(auctionLinks.length).toBe(0);
    });
  });

  // ── Lista com leilões ──────────────────────────────────────────────────────

  describe('quando há leilões', () => {
    it('exibe 2 cards com os títulos corretos', () => {
      const auction1 = makeAuction({ title: 'Hot Wheels RLC 2024', id: 'a1' });
      const auction2 = makeAuction({ title: 'Matchbox Collectors Edition', id: 'a2' });
      mockUseAuctions.mockReturnValue({
        data: [auction1, auction2],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderAuctions();

      expect(screen.getByText('Hot Wheels RLC 2024')).toBeInTheDocument();
      expect(screen.getByText('Matchbox Collectors Edition')).toBeInTheDocument();
    });

    it('renderiza links para a página de detalhes de cada leilão', () => {
      const auction1 = makeAuction({ title: 'Leilão A', id: 'leilao_a' });
      const auction2 = makeAuction({ title: 'Leilão B', id: 'leilao_b' });
      mockUseAuctions.mockReturnValue({
        data: [auction1, auction2],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const { container } = renderAuctions();

      const link1 = container.querySelector('a[href="/modo-lance/leilao_a"]');
      const link2 = container.querySelector('a[href="/modo-lance/leilao_b"]');
      expect(link1).toBeInTheDocument();
      expect(link2).toBeInTheDocument();
    });

    it('exibe contagem de leilões no subtítulo', () => {
      const auctions = [makeAuction(), makeAuction(), makeAuction()];
      mockUseAuctions.mockReturnValue({
        data: auctions,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderAuctions();

      expect(screen.getByText('3 leilões ativos')).toBeInTheDocument();
    });

    it('não exibe EmptyState quando há leilões', () => {
      mockUseAuctions.mockReturnValue({
        data: [makeAuction()],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderAuctions();

      expect(screen.queryByText('Nenhum leilão ativo')).not.toBeInTheDocument();
    });
  });
});

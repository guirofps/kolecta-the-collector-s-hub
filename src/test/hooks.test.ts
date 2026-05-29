import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock @clerk/clerk-react antes dos imports
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: async () => 'test-token',
    isSignedIn: true,
  }),
}));

// Mock @/lib/api
vi.mock('@/lib/api', () => ({
  api: {
    auctions: {
      getAll: vi.fn(),
      getMyBids: vi.fn(),
      getSellerAuctions: vi.fn(),
      placeBid: vi.fn(),
      end: vi.fn(),
    },
    admin: {
      getStats: vi.fn(),
      getUsers: vi.fn(),
      updateUserRole: vi.fn(),
      getSellers: vi.fn(),
      verifySeller: vi.fn(),
      getDisputes: vi.fn(),
      resolveDispute: vi.fn(),
      getListings: vi.fn(),
      updateListingStatus: vi.fn(),
    },
  },
}));

// Mock @/hooks/use-toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ── Imports após mock ─────────────────────────────────────────────────────────

import { api } from '@/lib/api';
import {
  useAuctions,
  useMyBids,
  usePlaceBid,
  useAdminStats,
  useAdminUsers,
  useResolveDispute,
} from '@/hooks/use-api';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAuction = {
  id: 'auction_001',
  title: 'Hot Wheels RLC',
  startingBidInCents: 5000,
  currentBidInCents: 5000,
  status: 'active',
  endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
};

const mockBid = {
  id: 'bid_001',
  auctionId: 'auction_001',
  amountInCents: 6500,
  auctionStatus: 'active',
  currentBidInCents: 6500,
};

const mockStats = {
  totalUsers: 42,
  totalListings: 10,
  totalOrders: 5,
  totalRevenueInCents: 150000,
  openDisputes: 2,
};

// ── Helper ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Hooks de API', () => {
  const mockedApi = api as unknown as {
    auctions: {
      getAll: ReturnType<typeof vi.fn>;
      getMyBids: ReturnType<typeof vi.fn>;
      placeBid: ReturnType<typeof vi.fn>;
    };
    admin: {
      getStats: ReturnType<typeof vi.fn>;
      getUsers: ReturnType<typeof vi.fn>;
      getDisputes: ReturnType<typeof vi.fn>;
      resolveDispute: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── useAuctions ───────────────────────────────────────────────────────────

  describe('useAuctions', () => {
    it('chama api.auctions.getAll e retorna dados', async () => {
      mockedApi.auctions.getAll.mockResolvedValue([mockAuction]);

      const { result } = renderHook(() => useAuctions(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.auctions.getAll).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual([mockAuction]);
    });

    it('retorna array vazio quando a API retorna []', async () => {
      mockedApi.auctions.getAll.mockResolvedValue([]);

      const { result } = renderHook(() => useAuctions(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('usa queryKey ["auctions"]', async () => {
      mockedApi.auctions.getAll.mockResolvedValue([mockAuction]);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useAuctions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cachedData = queryClient.getQueryData(['auctions']);
      expect(cachedData).toEqual([mockAuction]);
    });
  });

  // ── useMyBids ─────────────────────────────────────────────────────────────

  describe('useMyBids', () => {
    it('chama api.auctions.getMyBids com token e retorna dados', async () => {
      mockedApi.auctions.getMyBids.mockResolvedValue([mockBid]);

      const { result } = renderHook(() => useMyBids(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.auctions.getMyBids).toHaveBeenCalledWith('test-token');
      expect(result.current.data).toEqual([mockBid]);
    });
  });

  // ── usePlaceBid ───────────────────────────────────────────────────────────

  describe('usePlaceBid', () => {
    it('chama api.auctions.placeBid com token, auctionId e amountInCents', async () => {
      const mockCreatedBid = { id: 'bid_new', amountInCents: 7000 };
      mockedApi.auctions.placeBid.mockResolvedValue(mockCreatedBid);
      mockedApi.auctions.getAll.mockResolvedValue([]);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => usePlaceBid(), { wrapper });

      result.current.mutate({ auctionId: 'auction_001', amountInCents: 7000 });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.auctions.placeBid).toHaveBeenCalledWith(
        'test-token',
        'auction_001',
        7000,
      );
    });
  });

  // ── useAdminStats ─────────────────────────────────────────────────────────

  describe('useAdminStats', () => {
    it('chama api.admin.getStats com token e retorna stats', async () => {
      mockedApi.admin.getStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useAdminStats(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.admin.getStats).toHaveBeenCalledWith('test-token');
      expect(result.current.data).toEqual(mockStats);
    });
  });

  // ── useAdminUsers ─────────────────────────────────────────────────────────

  describe('useAdminUsers', () => {
    it('chama api.admin.getUsers com token, limit e offset', async () => {
      const mockUsers = [{ id: 'user_001', email: 'admin@kolecta.com', role: 'admin' }];
      mockedApi.admin.getUsers.mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAdminUsers(10, 5), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.admin.getUsers).toHaveBeenCalledWith('test-token', 10, 5);
      expect(result.current.data).toEqual(mockUsers);
    });
  });

  // ── useResolveDispute ─────────────────────────────────────────────────────

  describe('useResolveDispute', () => {
    it('após mutação bem-sucedida, invalida queryKey ["admin", "disputes"]', async () => {
      const mockResolved = { id: 'dispute_001', status: 'resolved' };
      mockedApi.admin.resolveDispute.mockResolvedValue(mockResolved);
      mockedApi.admin.getDisputes.mockResolvedValue([]);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useResolveDispute(), { wrapper });

      result.current.mutate({
        disputeId: 'dispute_001',
        body: { status: 'resolved' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['admin', 'disputes'] }),
      );
    });

    it('chama api.admin.resolveDispute com os parâmetros corretos', async () => {
      const mockResolved = { id: 'dispute_001', status: 'resolved' };
      mockedApi.admin.resolveDispute.mockResolvedValue(mockResolved);

      const { result } = renderHook(() => useResolveDispute(), {
        wrapper: makeWrapper(),
      });

      result.current.mutate({
        disputeId: 'dispute_001',
        body: { status: 'resolved', resolution: 'Reembolso efetuado' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.admin.resolveDispute).toHaveBeenCalledWith(
        'test-token',
        'dispute_001',
        { status: 'resolved', resolution: 'Reembolso efetuado' },
      );
    });
  });
});

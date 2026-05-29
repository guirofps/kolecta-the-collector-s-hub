import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useAdminDisputes: vi.fn(),
  useResolveDispute: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
}));

// Mock AdminLayout para simplificar o teste (renderiza apenas os filhos)
vi.mock('@/components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'admin-layout' }, children),
}));

// ── Imports após mock ─────────────────────────────────────────────────────────

import { useAdminDisputes, useResolveDispute } from '@/hooks/use-api';
import AdminDisputesPage from '@/pages/admin/Disputes';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeDispute = (overrides: Record<string, unknown> = {}) => ({
  id: `dispute_${Math.random().toString(36).slice(2)}`,
  orderId: 'order_001',
  reporterId: 'user_003',
  reason: 'Item não chegou',
  description: 'Esperando há 30 dias',
  status: 'open' as const,
  resolvedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockMutateFn = vi.fn();

// ── Helper ────────────────────────────────────────────────────────────────────

function renderDisputes() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, React.createElement(AdminDisputesPage)),
    ),
  );
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AdminDisputesPage', () => {
  const mockUseAdminDisputes = vi.mocked(useAdminDisputes);
  const mockUseResolveDispute = vi.mocked(useResolveDispute);

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock padrão do useResolveDispute
    mockUseResolveDispute.mockReturnValue({
      mutate: mockMutateFn,
      isPending: false,
      isSuccess: false,
      isError: false,
    } as any);
  });

  // ── Estado de carregamento ─────────────────────────────────────────────────

  describe('quando isLoading=true', () => {
    it('exibe Skeletons', () => {
      mockUseAdminDisputes.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
      } as any);

      const { container } = renderDisputes();

      // Skeleton usa classe animate-pulse
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('não exibe tabela durante o carregamento', () => {
      mockUseAdminDisputes.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
      } as any);

      renderDisputes();

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  // ── Tabela com disputas ────────────────────────────────────────────────────

  describe('quando há disputas', () => {
    it('exibe tabela com 2 linhas para 2 disputes', () => {
      const dispute1 = makeDispute({ id: 'dispute_aaa111', reason: 'Produto danificado' });
      const dispute2 = makeDispute({ id: 'dispute_bbb222', reason: 'Item não chegou' });
      mockUseAdminDisputes.mockReturnValue({
        data: [dispute1, dispute2],
        isLoading: false,
        isError: false,
      } as any);

      const { container } = renderDisputes();

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('exibe os motivos das disputas na tabela', () => {
      const dispute1 = makeDispute({ reason: 'Produto danificado' });
      const dispute2 = makeDispute({ reason: 'Item não chegou' });
      mockUseAdminDisputes.mockReturnValue({
        data: [dispute1, dispute2],
        isLoading: false,
        isError: false,
      } as any);

      renderDisputes();

      expect(screen.getByText('Produto danificado')).toBeInTheDocument();
      expect(screen.getByText('Item não chegou')).toBeInTheDocument();
    });

    it('exibe botão "Ver" para cada disputa', () => {
      const disputes = [makeDispute(), makeDispute()];
      mockUseAdminDisputes.mockReturnValue({
        data: disputes,
        isLoading: false,
        isError: false,
      } as any);

      renderDisputes();

      const verButtons = screen.getAllByRole('button', { name: /ver/i });
      expect(verButtons.length).toBe(2);
    });

    it('exibe os IDs abreviados das disputas', () => {
      const dispute = makeDispute({ id: 'dispute_abc12345' });
      mockUseAdminDisputes.mockReturnValue({
        data: [dispute],
        isLoading: false,
        isError: false,
      } as any);

      renderDisputes();

      // ID abreviado para 8 chars: 'dispute_'
      expect(screen.getByText('dispute_')).toBeInTheDocument();
    });
  });

  // ── Interação com o dialog ────────────────────────────────────────────────

  describe('ao clicar em "Ver" em uma disputa', () => {
    it('abre o dialog com detalhes da disputa', async () => {
      const dispute = makeDispute({
        id: 'dispute_zzz999',
        reason: 'Fraude detectada',
        description: 'O item é definitivamente falso',
      });
      mockUseAdminDisputes.mockReturnValue({
        data: [dispute],
        isLoading: false,
        isError: false,
      } as any);

      renderDisputes();

      const verButton = screen.getByRole('button', { name: /ver/i });
      fireEvent.click(verButton);

      await waitFor(() => {
        // description aparece apenas no dialog (não na tabela)
        expect(screen.getByText('O item é definitivamente falso')).toBeInTheDocument();
      });
    });

    it('exibe botão "Resolver" no dialog para disputas abertas', async () => {
      const dispute = makeDispute({ status: 'open' });
      mockUseAdminDisputes.mockReturnValue({
        data: [dispute],
        isLoading: false,
        isError: false,
      } as any);

      renderDisputes();

      const verButton = screen.getByRole('button', { name: /ver/i });
      fireEvent.click(verButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resolver/i })).toBeInTheDocument();
      });
    });

    it('chama resolveDispute.mutate com status="resolved" ao clicar em "Resolver"', async () => {
      const dispute = makeDispute({ id: 'dispute_test_resolve', status: 'open' });
      mockUseAdminDisputes.mockReturnValue({
        data: [dispute],
        isLoading: false,
        isError: false,
      } as any);

      renderDisputes();

      // Abre o dialog
      const verButton = screen.getByRole('button', { name: /ver/i });
      fireEvent.click(verButton);

      // Espera o dialog abrir
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resolver/i })).toBeInTheDocument();
      });

      // Clica em Resolver
      const resolverButton = screen.getByRole('button', { name: /resolver/i });
      fireEvent.click(resolverButton);

      expect(mockMutateFn).toHaveBeenCalledWith(
        {
          disputeId: dispute.id,
          body: { status: 'resolved' },
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it('não exibe botão "Resolver" para disputas já resolvidas', async () => {
      const dispute = makeDispute({ status: 'resolved' });
      mockUseAdminDisputes.mockReturnValue({
        data: [dispute],
        isLoading: false,
        isError: false,
      } as any);

      renderDisputes();

      const verButton = screen.getByRole('button', { name: /ver/i });
      fireEvent.click(verButton);

      await waitFor(() => {
        // O dialog deve abrir mas sem botão de Resolver
        expect(screen.queryByRole('button', { name: /resolver/i })).not.toBeInTheDocument();
      });
    });
  });

  // ── Lista vazia ────────────────────────────────────────────────────────────

  describe('quando não há disputas', () => {
    it('exibe tabela vazia (sem linhas no tbody)', () => {
      mockUseAdminDisputes.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as any);

      const { container } = renderDisputes();

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(0);
    });

    it('exibe "0 pendentes" quando não há disputas', () => {
      mockUseAdminDisputes.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as any);

      renderDisputes();

      expect(screen.getByText('0 pendentes')).toBeInTheDocument();
    });
  });
});

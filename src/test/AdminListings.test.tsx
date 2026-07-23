import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useAdminListings: vi.fn(),
  useUpdateListingStatus: vi.fn(),
  useCategories: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
}));

vi.mock('@/components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'admin-layout' }, children),
}));

// ── Imports após mock ─────────────────────────────────────────────────────────

import { useAdminListings, useUpdateListingStatus, useCategories } from '@/hooks/use-api';
import AdminListingsPage from '@/pages/admin/Listings';

const mutate = vi.fn();

const makeListing = (overrides: Record<string, unknown> = {}) => ({
  id: 'lst_1',
  sellerId: 'seller_1',
  sellerName: 'StopGames',
  categoryId: 'cat_1',
  title: 'Funko Pop Teddiursa 985 Pokemon',
  description: 'Lacrado, caixa perfeita.',
  brand: 'Funko',
  line: null,
  scale: null,
  year: null,
  edition: null,
  condition: 'novo-lacrado',
  type: 'direct' as const,
  priceInCents: 16179,
  images: JSON.stringify(['a.jpg', 'b.jpg', 'c.jpg']),
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * A tela faz DUAS consultas (`pending_review` e `draft`), então o mock precisa
 * responder diferente para cada uma. Devolver a mesma lista nas duas duplicava
 * todo anúncio na tela.
 */
function renderFila(emAnalise: unknown[], rascunhos: unknown[] = []) {
  (useAdminListings as ReturnType<typeof vi.fn>).mockImplementation((status: string) => ({
    data: status === 'pending_review' ? emAnalise : rascunhos,
    isLoading: false,
    isError: false,
  }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, React.createElement(AdminListingsPage)),
    ),
  );
}

describe('AdminListings (fila de aprovação)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUpdateListingStatus as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate, isPending: false,
    });
    (useCategories as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ id: 'cat_1', name: 'Funko Pop', slug: 'funko-pop', icon: null, parentId: null }],
    });
  });

  // Regressão do bug mais grave: o banco tem DOIS status de espera
  // (`pending_review`, 358 anúncios, e `draft`, 251). A fila buscava só `draft`
  // e deixava 358 invisíveis: o vendedor via "em análise" no painel dele e o
  // anúncio nunca chegava na moderação.
  it('traz as duas filas, em análise e rascunho, não só uma', () => {
    renderFila(
      [makeListing({ id: 'a', title: 'Veio de pending_review', status: 'pending_review' })],
      [makeListing({ id: 'b', title: 'Veio de draft', status: 'draft' })],
    );
    expect(screen.getByText('Veio de pending_review')).toBeInTheDocument();
    expect(screen.getByText('Veio de draft')).toBeInTheDocument();
    expect(screen.getByText(/2 anúncios aguardando revisão/)).toBeInTheDocument();
  });

  it('mostra a quebra por origem quando as duas filas têm item', () => {
    renderFila(
      [makeListing({ id: 'a' })],
      [makeListing({ id: 'b' }), makeListing({ id: 'c' })],
    );
    expect(screen.getByText(/1 em análise, 2 em rascunho/)).toBeInTheDocument();
  });

  it('avisa quando parte da fila falhou, para não aprovar lista incompleta', () => {
    (useAdminListings as ReturnType<typeof vi.fn>).mockImplementation((status: string) => ({
      data: status === 'pending_review' ? [] : [makeListing()],
      isLoading: false,
      isError: status === 'pending_review',
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(MemoryRouter, null, React.createElement(AdminListingsPage)),
      ),
    );
    expect(screen.getByText(/lista abaixo está incompleta/i)).toBeInTheDocument();
  });

  it('mostra a condição legível, não o código cru do banco', () => {
    renderFila([makeListing()]);
    expect(screen.getByText('Novo na embalagem')).toBeInTheDocument();
    expect(screen.queryByText('novo-lacrado')).not.toBeInTheDocument();
  });

  it('mostra a categoria e a contagem de fotos na linha', () => {
    renderFila([makeListing()]);
    expect(screen.getByText('Funko Pop')).toBeInTheDocument();
    expect(screen.getByText('3 fotos')).toBeInTheDocument();
  });

  // Regressão: leilão tem priceInCents nulo, então a fila mostrava só um traço
  // e o admin aprovava sem ver valor nenhum.
  it('em leilão mostra o lance inicial no lugar do preço', () => {
    renderFila([makeListing({
      type: 'auction', priceInCents: null, startingBidInCents: 25000,
    })]);
    expect(screen.getByText(/Inicial/)).toBeInTheDocument();
    expect(screen.getByText(/25,00|250,00/)).toBeInTheDocument();
  });

  it('grita quando o anúncio não tem valor nenhum', () => {
    renderFila([makeListing({ type: 'auction', priceInCents: null })]);
    expect(screen.getByText('Sem valor')).toBeInTheDocument();
  });

  it('avisa que a config do leilão não veio do backend, em vez de ficar mudo', () => {
    renderFila([makeListing({ type: 'auction', priceInCents: null })]);
    fireEvent.click(screen.getAllByRole('button')[0]); // abre o detalhe
    expect(screen.getByText(/não envia a configuração do leilão/i)).toBeInTheDocument();
  });

  it('mostra a config do leilão quando ela chega', () => {
    renderFila([makeListing({
      type: 'auction', priceInCents: null,
      startingBidInCents: 25000, minIncrementInCents: 1000,
      reservePriceInCents: 50000, durationHours: 168, antiSniper: true,
    })]);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getByText('Incremento mínimo')).toBeInTheDocument();
    expect(screen.getByText('Preço de reserva')).toBeInTheDocument();
    expect(screen.getByText('7 dias')).toBeInTheDocument();
    expect(screen.getByText('Ligado')).toBeInTheDocument();
  });

  it('marca em vermelho o anúncio sem dados de frete', () => {
    renderFila([makeListing()]);
    fireEvent.click(screen.getAllByRole('button')[0]);
    // O valor fica na mesma linha do rótulo, então buscamos a partir dele
    // (só "Não informado" é ambíguo: vários campos vazios usam esse texto).
    const linha = screen.getByText('Peso e medidas').parentElement!;
    const valor = linha.querySelector('span:last-child')!;
    expect(valor.textContent).toBe('Não informado');
    expect(valor.className).toContain('text-destructive');
  });

  it('mostra peso e medidas quando o vendedor preencheu', () => {
    renderFila([makeListing({ weightGrams: 300, widthCm: 10, heightCm: 15, lengthCm: 8 })]);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getByText('300 g, 10 x 15 x 8 cm')).toBeInTheDocument();
  });

  it('envia o motivo escolhido junto com a reprovação', () => {
    renderFila([makeListing()]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.click(screen.getByText('Fotos insuficientes ou de baixa qualidade'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        reason: expect.stringContaining('Fotos insuficientes'),
      }),
      expect.anything(),
    );
  });
});

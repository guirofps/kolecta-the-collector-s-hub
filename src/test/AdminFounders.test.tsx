import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/use-api', () => ({
  useFounderCandidates: vi.fn(),
  useGrantFounder: vi.fn(),
  useAdminUsers: vi.fn(),
  useListings: vi.fn(),
}));

vi.mock('@/components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

import {
  useFounderCandidates, useGrantFounder, useAdminUsers, useListings,
} from '@/hooks/use-api';
import AdminFounders from '@/pages/admin/Founders';

const listing = (over: Record<string, unknown>) => ({
  id: `l${Math.random()}`, sellerId: 's', sellerName: 'Loja', status: 'active',
  type: 'direct', condition: 'novo', images: null, title: 'x', createdAt: '2026-07-01',
  ...over,
});

function renderPage(listings: unknown[]) {
  (useFounderCandidates as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { candidates: [], nextNumber: 51 }, isLoading: false,
  });
  (useGrantFounder as ReturnType<typeof vi.fn>).mockReturnValue({ mutate: vi.fn(), isPending: false });
  (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  (useListings as ReturnType<typeof vi.fn>).mockReturnValue({ data: listings });
  return render(React.createElement(MemoryRouter, null, React.createElement(AdminFounders)));
}

/**
 * O painel de fundadores passou a: (1) calcular o próximo número dos anúncios,
 * não do backend, que ainda vinha de 51; (2) listar os fundadores atuais, para
 * a gestão de quem é e quem sai.
 */
describe('AdminFounders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('próximo número livre sai dos concedidos, não do 51 do backend', () => {
    // #001..#010 concedidos → o próximo é #011, mesmo com a API dizendo 51.
    const listings = Array.from({ length: 10 }, (_, i) =>
      listing({ sellerId: `s${i}`, sellerFounderNumber: i + 1 }),
    );
    renderPage(listings);
    expect(screen.getByText('#011')).toBeInTheDocument();
    expect(screen.queryByText('#051')).toBeNull();
  });

  it('lista os fundadores atuais com número e loja', () => {
    renderPage([
      listing({ sellerId: 'a', sellerName: 'Alfa Diecast', sellerFounderNumber: 1 }),
      listing({ sellerId: 'b', sellerName: 'Beta TCG', sellerFounderNumber: 2 }),
    ]);
    expect(screen.getByText('Fundadores atuais')).toBeInTheDocument();
    expect(screen.getByText('Alfa Diecast')).toBeInTheDocument();
    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(screen.getByText('#002')).toBeInTheDocument();
  });

  it('mostra o placar de concedidos sobre o total', () => {
    renderPage([listing({ sellerFounderNumber: 1 }), listing({ sellerId: 'b', sellerFounderNumber: 2 })]);
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('sem fundador ainda, não mostra a seção nem quebra', () => {
    expect(() => renderPage([listing({ sellerFounderNumber: null })])).not.toThrow();
    expect(screen.queryByText('Fundadores atuais')).toBeNull();
    // O primeiro número livre é #001.
    expect(screen.getByText('#001')).toBeInTheDocument();
  });

  it('fundador sem anúncio no ar aparece marcado (0 no ar)', () => {
    renderPage([listing({ sellerId: 'z', sellerName: 'Parado', sellerFounderNumber: 3, status: 'paused' })]);
    expect(screen.getByText('Parado')).toBeInTheDocument();
    expect(screen.getByText('0 no ar')).toBeInTheDocument();
  });
});

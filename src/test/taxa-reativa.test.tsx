import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * A taxa é REATIVA de verdade? Fundador vê 9%, usuário comum vê 11%?
 *
 * Os testes de `taxa-fundador.test.ts` cobrem a matemática pura. Estes aqui
 * cobrem a corrente inteira, que é onde o bug morava:
 *
 *   GET /api/founder/me → useMyFounder → useCommissionRate → o que a tela pinta
 *
 * Antes, o último elo não existia: `fees.ts` tinha 0.11 cravado e a tela nunca
 * perguntava nada ao backend. Renderizar de verdade é a única forma de provar
 * que o número na tela mudou, e não só a constante no módulo.
 *
 * A página escolhida é "Taxas e Comissões" — é onde um fundador iria conferir
 * quanto paga.
 */

const getMe = vi.fn();

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
  useUser: () => ({ user: null, isSignedIn: false }),
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));

vi.mock('@/components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/lib/api', () => ({
  api: { founder: { getMe: (...args: unknown[]) => getMe(...args) } },
}));

import FeesPage from '@/pages/Fees';

/** Resposta de /api/founder/me. `pct` é a taxa efetiva do vendedor. */
const respostaFounder = (pct: number, status: string) => ({
  founderNumber: status === 'active' ? 6 : null,
  founderStatus: status,
  founderSince: status === 'active' ? '2026-07-25T23:29:39.000Z' : null,
  listingsSubmitted: 5,
  listingsRequired: 5,
  remaining: 0,
  benefitEndsAt: status === 'active' ? '2027-01-25T23:29:39.000Z' : null,
  commissionPercent: pct,
  baseCommissionPercent: 11,
  credits: null,
});

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(MemoryRouter, null, React.createElement(FeesPage)),
    ),
  );
}

describe('a taxa exibida acompanha quem está logado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FUNDADOR ativo vê 9% na calculadora', async () => {
    getMe.mockResolvedValue(respostaFounder(9, 'active'));

    renderizar();

    // A linha da calculadora: "Comissão (9%)".
    await waitFor(() => {
      expect(screen.getByText(/Comissão \(9%\)/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Comissão \(11%\)/)).not.toBeInTheDocument();
  });

  it('FUNDADOR vê o aviso de taxa reduzida, com o "de/por"', async () => {
    getMe.mockResolvedValue(respostaFounder(9, 'active'));

    renderizar();

    await waitFor(() => {
      expect(screen.getByText(/Sua taxa de Membro Fundador/)).toBeInTheDocument();
    });
  });

  it('FUNDADOR: sobre R$ 500 a comissão vira R$ 45,00, não R$ 55,00', async () => {
    getMe.mockResolvedValue(respostaFounder(9, 'active'));

    renderizar();

    // 500 é o valor inicial da calculadora. 9% = 45,00; 11% seriam 55,00.
    await waitFor(() => {
      expect(screen.getByText('R$ 45.00')).toBeInTheDocument();
    });
    expect(screen.queryByText('R$ 55.00')).not.toBeInTheDocument();
  });

  it('USUÁRIO COMUM vê 11%', async () => {
    getMe.mockResolvedValue(respostaFounder(11, 'none'));

    renderizar();

    await waitFor(() => {
      expect(screen.getByText(/Comissão \(11%\)/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Comissão \(9%\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sua taxa de Membro Fundador/)).not.toBeInTheDocument();
  });

  it('USUÁRIO COMUM: sobre R$ 500 a comissão é R$ 55,00', async () => {
    getMe.mockResolvedValue(respostaFounder(11, 'none'));

    renderizar();

    await waitFor(() => {
      expect(screen.getByText('R$ 55.00')).toBeInTheDocument();
    });
  });

  // Candidato ainda não escolhido paga cheio. Em produção havia 128 'pending' e
  // 46 'qualified' — mostrar 9% para eles seria prometer o que não existe.
  it('QUALIFICADO (ainda não é fundador) vê 11%', async () => {
    getMe.mockResolvedValue(respostaFounder(11, 'qualified'));

    renderizar();

    await waitFor(() => {
      expect(screen.getByText(/Comissão \(11%\)/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Sua taxa de Membro Fundador/)).not.toBeInTheDocument();
  });

  it('backend fora do ar → cai na taxa cheia, nunca promete 9% sem base', async () => {
    getMe.mockRejectedValue(new Error('500'));

    renderizar();

    await waitFor(() => {
      expect(screen.getByText(/Comissão \(11%\)/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Comissão \(9%\)/)).not.toBeInTheDocument();
  });

  it('enquanto a requisição não volta, mostra 11% (e não pisca 9%)', async () => {
    // Promessa que nunca resolve: é o primeiro render, antes de qualquer dado.
    getMe.mockReturnValue(new Promise(() => {}));

    renderizar();

    expect(screen.getByText(/Comissão \(11%\)/)).toBeInTheDocument();
  });
});

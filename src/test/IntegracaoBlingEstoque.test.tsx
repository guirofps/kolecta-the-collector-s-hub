import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Card do Bling na tela de Integrações, com a sincronização de estoque.
 *
 * O que estes testes prendem é o que enganou de verdade: "Conectado" sozinho
 * não prova nada. Duas lojas ficaram conectadas por dias sem que uma única
 * chamada de dado passasse, porque o host da API estava errado, e a tela
 * mostrava tudo verde. O número de anúncios ligados existe para isso, e não
 * pode sumir nem virar "0" silencioso quando o lojista importou coisas.
 */

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
  useUser: () => ({ user: null, isSignedIn: false }),
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));

vi.mock('@/components/layout/SellerLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

const sincronizar = vi.fn();

vi.mock('@/hooks/use-api', async () => {
  const real = await vi.importActual<any>('@/hooks/use-api');
  return {
    ...real,
    useBlingStatus: () => ({ data: (globalThis as any).__bling, isLoading: false }),
    useBlingConnect: () => ({ mutate: vi.fn(), isPending: false }),
    useBlingDisconnect: () => ({ mutate: vi.fn(), isPending: false }),
    useBlingSincronizarEstoque: () => ({ mutate: sincronizar, isPending: false }),
  };
});

import IntegrationsPage from '@/pages/seller/Integrations';

function montar(status: Record<string, unknown>) {
  (globalThis as any).__bling = status;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null,
        React.createElement(IntegrationsPage, null))),
  );
}

describe('Bling: sincronização de estoque na tela de Integrações', () => {
  beforeEach(() => sincronizar.mockClear());

  it('desconectado não oferece sincronizar estoque', () => {
    montar({ connected: false });
    expect(
      screen.queryByRole('button', { name: /Sincronizar estoque/i }),
    ).not.toBeInTheDocument();
  });

  it('token expirado também não oferece: sincronizar ali só daria erro', () => {
    montar({ connected: true, expired: true, anunciosVinculados: 40 });
    expect(
      screen.queryByRole('button', { name: /Sincronizar estoque/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Reconectar Bling/i)).toBeInTheDocument();
  });

  it('conectado mostra quantos anúncios seguem o estoque', async () => {
    montar({ connected: true, expired: false, anunciosVinculados: 42 });
    await waitFor(() => {
      expect(screen.getByText('42 anúncio(s)')).toBeInTheDocument();
    });
    expect(screen.getByText(/seguindo o estoque do seu Bling/i)).toBeInTheDocument();
  });

  it('conectado sem nada importado diz o que fazer, e não finge que funciona', async () => {
    // O caso que enganou: conectado, verde, e nenhuma peça sendo seguida.
    montar({ connected: true, expired: false, anunciosVinculados: 0 });
    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum anúncio ligado ao Bling ainda/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/seguindo o estoque/i)).not.toBeInTheDocument();
  });

  it('o botão dispara a sincronização', async () => {
    montar({ connected: true, expired: false, anunciosVinculados: 42 });
    const botao = await screen.findByRole('button', { name: /Sincronizar estoque agora/i });
    fireEvent.click(botao);
    expect(sincronizar).toHaveBeenCalledTimes(1);
  });

  it('o atalho de importar continua na tela', async () => {
    // Já ficou órfão uma vez: a tela de importação existia sem link nenhum.
    montar({ connected: true, expired: false, anunciosVinculados: 3 });
    const link = await screen.findByRole('link', { name: /Importar catálogo do Bling/i });
    expect(link).toHaveAttribute('href', '/painel/anuncios/importar-bling');
  });
});

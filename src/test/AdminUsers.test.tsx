import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useAdminUsers: vi.fn(),
  useUpdateUserRole: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
}));

vi.mock('@/components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'admin-layout' }, children),
}));

// ── Imports após mock ─────────────────────────────────────────────────────────

import { useAdminUsers, useUpdateUserRole } from '@/hooks/use-api';
import AdminUsersPage from '@/pages/admin/Users';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: `user_${Math.random().toString(36).slice(2)}`,
  name: 'Fulano de Tal',
  email: 'fulano@email.com',
  role: 'user' as const,
  createdAt: new Date().toISOString(),
  ...overrides,
});

function renderUsers() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, React.createElement(AdminUsersPage)),
    ),
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUpdateUserRole as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(), isPending: false,
    });
  });

  const comUsuarios = (users: unknown[]) =>
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: users, isLoading: false,
    });

  // Regressão: existia um cadastro com nome em string vazia no banco
  // (lojasafaritcg@gmail.com). O `??` não pega string vazia, então o código
  // fazia `''[0].toUpperCase()` e derrubava a página inteira com tela branca.
  it('não quebra quando o usuário está sem nome', () => {
    comUsuarios([makeUser({ name: '', email: 'semnome@email.com' })]);
    expect(() => renderUsers()).not.toThrow();
    expect(screen.getByText('semnome@email.com', { exact: false })).toBeInTheDocument();
  });

  it('cai para a inicial do e-mail quando não há nome', () => {
    comUsuarios([makeUser({ name: '', email: 'zeca@email.com' })]);
    renderUsers();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('também aguenta nome nulo e nome só com espaços', () => {
    comUsuarios([
      makeUser({ name: null, email: 'nulo@email.com' }),
      makeUser({ name: '   ', email: 'espacos@email.com' }),
    ]);
    expect(() => renderUsers()).not.toThrow();
  });

  it('marca visualmente quem está sem nome em vez de deixar em branco', () => {
    comUsuarios([makeUser({ name: '', email: 'semnome@email.com' })]);
    renderUsers();
    expect(screen.getByText('Sem nome')).toBeInTheDocument();
  });

  it('usa a inicial do nome quando ele existe', () => {
    comUsuarios([makeUser({ name: 'Raquel Ferreira', email: 'r@email.com' })]);
    renderUsers();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('Raquel Ferreira')).toBeInTheDocument();
  });

  it('mostra recado quando a busca não encontra ninguém', () => {
    comUsuarios([]);
    renderUsers();
    expect(screen.getByText(/nenhum usuário/i)).toBeInTheDocument();
  });
});

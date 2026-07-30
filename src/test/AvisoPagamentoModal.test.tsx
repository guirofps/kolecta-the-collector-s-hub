import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ── Mock da sessão: o aviso só existe para quem tem conta ────────────────────

const mockAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

import AvisoPagamentoModal from '@/components/AvisoPagamentoModal';
import { AVISO_CAMPANHA, jaViuAviso } from '@/lib/aviso-pagamento';

function setSessao({ isAuthenticated = true, isLoading = false, id = 'user_A' } = {}) {
  mockAuth.mockReturnValue({ isAuthenticated, isLoading, user: { id } });
}

function renderEm(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AvisoPagamentoModal />
    </MemoryRouter>,
  );
}

const titulo = /Estamos melhorando os meios de pagamento/i;

describe('AvisoPagamentoModal', () => {
  beforeEach(() => {
    localStorage.clear();
    setSessao();
  });

  it('aparece para quem tem conta e ainda não viu o aviso', async () => {
    renderEm();
    expect(await screen.findByText(titulo)).toBeInTheDocument();
  });

  it('não aparece para visitante deslogado', () => {
    setSessao({ isAuthenticated: false });
    renderEm();
    expect(screen.queryByText(titulo)).not.toBeInTheDocument();
  });

  it('espera a sessão carregar antes de decidir', () => {
    // Durante o carregamento isAuthenticated ainda é falso; decidir agora
    // esconderia o aviso de quem está logado.
    setSessao({ isAuthenticated: false, isLoading: true });
    const { rerender } = renderEm();
    expect(screen.queryByText(titulo)).not.toBeInTheDocument();

    setSessao({ isAuthenticated: true, isLoading: false });
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <AvisoPagamentoModal />
      </MemoryRouter>,
    );
    expect(screen.getByText(titulo)).toBeInTheDocument();
  });

  it('some ao confirmar e não volta na visita seguinte', async () => {
    const { unmount } = renderEm();

    fireEvent.click(await screen.findByRole('button', { name: /entendi/i }));
    expect(screen.queryByText(titulo)).not.toBeInTheDocument();
    expect(jaViuAviso('user_A')).toBe(true);

    unmount();
    renderEm();
    expect(screen.queryByText(titulo)).not.toBeInTheDocument();
  });

  it('não tem X de fechar — a única saída é confirmar', async () => {
    renderEm();
    await screen.findByText(titulo);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('cede a vez em /criar-conta, onde o modal de termos pode estar aberto', () => {
    renderEm('/criar-conta');
    expect(screen.queryByText(titulo)).not.toBeInTheDocument();
    // E não grava aceite: quem acabou de se cadastrar ainda verá o aviso.
    expect(jaViuAviso('user_A')).toBe(false);
  });

  it('aparece em /conta, para onde o cadastro redireciona', async () => {
    renderEm('/conta');
    expect(await screen.findByText(titulo)).toBeInTheDocument();
  });

  it('conta nova no MESMO navegador também vê, mesmo se outra ja aceitou', async () => {
    // O caso que uma chave unica por navegador deixaria passar: computador
    // compartilhado, ou segunda conta do mesmo vendedor.
    const { unmount } = renderEm('/conta');
    fireEvent.click(await screen.findByRole('button', { name: /entendi/i }));
    expect(jaViuAviso('user_A')).toBe(true);
    unmount();

    setSessao({ id: 'user_B' });
    renderEm('/conta');
    expect(await screen.findByText(titulo)).toBeInTheDocument();
    expect(jaViuAviso('user_B')).toBe(false);
  });

  it('um aviso novo (outra campanha) volta a aparecer para quem viu o antigo', async () => {
    localStorage.setItem('kolecta_aviso_visto:user_A', 'campanha-antiga');
    expect(AVISO_CAMPANHA).not.toBe('campanha-antiga');

    renderEm();
    expect(await screen.findByText(titulo)).toBeInTheDocument();
  });
});

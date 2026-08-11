import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { LaunchGateState } from '@/hooks/use-launch-gate';

/**
 * O menu de gaveta do celular escondia a seção Vendedor inteira antes do
 * lançamento. Mas `/painel` é rota ABERTA de propósito: é onde o Fundador monta
 * a vitrine agora. Quem entrava pelo celular não achava "Criar Anúncio" nem
 * "Meus Anúncios" e teria que saber a URL de cabeça.
 *
 * A regra que vale: o menu mostra o que `isOpenRoute` deixa passar, a mesma
 * função que o gate usa para redirecionar. Menu e gate não podem divergir.
 */

const mockGate = vi.fn<() => LaunchGateState>();
vi.mock('@/hooks/use-launch-gate', () => ({ useLaunchGate: () => mockGate() }));

// Clerk ligado, com um usuário logado: é o cenário do vendedor no celular.
vi.mock('@/lib/clerk', () => ({ CLERK_ENABLED: true }));
vi.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: () => null,
  UserButton: Object.assign(() => null, { MenuItems: () => null, Action: () => null, Link: () => null }),
  useUser: () => ({ user: { id: 'user_abc123', fullName: 'Vendedor Teste', imageUrl: '', primaryEmailAddress: { emailAddress: 'v@teste.com' } } }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ totalItems: 0, openCart: vi.fn() }),
}));

import Header from '@/components/layout/Header';

function setGate(gateActive: boolean) {
  mockGate.mockReturnValue({ isLoading: false, isPreLaunch: gateActive, isAdmin: !gateActive, gateActive });
}

function abrirGaveta() {
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
  // A gaveta abre pelo botão "Conta" da barra inferior do celular.
  const botao = screen.getAllByText('Conta')[0].closest('button');
  fireEvent.click(botao!);
}

beforeEach(() => vi.clearAllMocks());

describe('menu de gaveta no pré-lançamento', () => {
  beforeEach(() => setGate(true));

  it('mostra a seção Vendedor, porque /painel está liberado', () => {
    abrirGaveta();
    expect(screen.getByText('Vendedor')).toBeInTheDocument();
    expect(screen.getByText('Criar Anúncio')).toBeInTheDocument();
    expect(screen.getByText('Meus Anúncios')).toBeInTheDocument();
  });

  it('continua escondendo o que o gate bloqueia', () => {
    abrirGaveta();
    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.queryByText('Categorias')).toBeNull();
    expect(screen.queryByText('Comunidade')).toBeNull();
  });

  it('mantém a conta do comprador, que também é rota aberta', () => {
    abrirGaveta();
    expect(screen.getByText('Meus Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Endereços')).toBeInTheDocument();
  });

  it('esconde "Meu Perfil", porque /vendedor é rota fechada antes do lançamento', () => {
    abrirGaveta();
    expect(screen.queryByText('Meu Perfil')).toBeNull();
  });
});

describe('barra inferior do celular', () => {
  const render1 = () => render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );

  it('no pré-lançamento aponta para o painel, não para prateleira fechada', () => {
    // Busca e leilão estão bloqueados: os dois lugares ficavam vazios num
    // momento em que o vendedor só tem uma coisa a fazer, que é anunciar.
    setGate(true);
    render1();
    expect(screen.getByText('Anunciar')).toBeInTheDocument();
    expect(screen.getByText('Anúncios')).toBeInTheDocument();
    expect(screen.queryByText('Busca')).toBeNull();
    expect(screen.queryByText('Lances')).toBeNull();
  });

  it('depois do lançamento volta a busca e leilão', () => {
    setGate(false);
    render1();
    expect(screen.getByText('Busca')).toBeInTheDocument();
    expect(screen.getByText('Lances')).toBeInTheDocument();
    expect(screen.queryByText('Anunciar')).toBeNull();
  });

  it('Início e Mensagens ficam nos dois casos', () => {
    setGate(true);
    render1();
    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getAllByText('Mensagens').length).toBeGreaterThan(0);
  });
});

describe('menu de gaveta depois do lançamento', () => {
  beforeEach(() => setGate(false));

  it('libera a vitrine junto do resto', () => {
    abrirGaveta();
    // getAllBy: com o site aberto estes rótulos aparecem também na navegação
    // do topo, não só na gaveta.
    expect(screen.getAllByText('Explorar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Modo Lance').length).toBeGreaterThan(0);
    expect(screen.getByText('Vendedor')).toBeInTheDocument();
  });

  /**
   * "Meu Perfil" é a vitrine pública do próprio usuário — o único jeito de ver
   * a loja como o comprador vê. O link tem que ser /vendedor/:id com o id do
   * Clerk (o backend espelha em users.id no user.created); qualquer outra coisa
   * abre perfil de outra pessoa ou /vendedor/undefined.
   */
  it('leva "Meu Perfil" para a vitrine do próprio usuário', () => {
    abrirGaveta();
    const link = screen.getByText('Meu Perfil').closest('a');
    expect(link).toHaveAttribute('href', '/vendedor/user_abc123');
  });
});

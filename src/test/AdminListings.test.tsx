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

const CATEGORIAS = [
  { id: 'cat_1', name: 'Funko Pop', slug: 'funko-pop', icon: null, parentId: null },
  { id: 'cat_2', name: 'Cards Colecionáveis', slug: 'cards-colecionaveis', icon: null, parentId: null },
];

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

/** Abre o detalhe do primeiro anúncio pelo nome acessível do botão. */
function abrirDetalhe() {
  fireEvent.click(screen.getAllByRole('button', { name: /^Ver detalhes de/ })[0]);
}

describe('AdminListings (fila de aprovação)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUpdateListingStatus as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate, isPending: false,
    });
    (useCategories as ReturnType<typeof vi.fn>).mockReturnValue({ data: CATEGORIAS });
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

  it('mostra a contagem de fotos na linha', () => {
    renderFila([makeListing()]);
    expect(screen.getByText('3 fotos')).toBeInTheDocument();
  });

  // Regressão: leilão tem priceInCents nulo, então a fila mostrava só um traço
  // e o admin aprovava sem ver valor nenhum.
  it('em leilão mostra o lance inicial no lugar do preço', () => {
    renderFila([makeListing({
      type: 'auction', priceInCents: null, startingBidInCents: 25000,
    })]);
    expect(screen.getByText(/Inicial/)).toBeInTheDocument();
  });

  it('grita quando o anúncio não tem valor nenhum', () => {
    renderFila([makeListing({ type: 'auction', priceInCents: null })]);
    expect(screen.getByText('Sem valor')).toBeInTheDocument();
  });

  it('avisa que a config do leilão não veio do backend, em vez de ficar mudo', () => {
    renderFila([makeListing({ type: 'auction', priceInCents: null })]);
    abrirDetalhe();
    expect(screen.getByText(/não envia a configuração do leilão/i)).toBeInTheDocument();
  });

  it('mostra a config do leilão quando ela chega', () => {
    renderFila([makeListing({
      type: 'auction', priceInCents: null,
      startingBidInCents: 25000, minIncrementInCents: 1000,
      reservePriceInCents: 50000, durationHours: 168, antiSniper: true,
    })]);
    abrirDetalhe();
    expect(screen.getByText('Incremento mínimo')).toBeInTheDocument();
    expect(screen.getByText('Preço de reserva')).toBeInTheDocument();
    expect(screen.getByText('7 dias')).toBeInTheDocument();
    expect(screen.getByText('Ligado')).toBeInTheDocument();
  });

  it('marca em vermelho o anúncio sem dados de frete', () => {
    renderFila([makeListing()]);
    abrirDetalhe();
    const linha = screen.getByText('Peso e medidas').parentElement!;
    const valor = linha.querySelector('span:last-child')!;
    expect(valor.textContent).toBe('Não informado');
    expect(valor.className).toContain('text-destructive');
  });

  it('mostra peso e medidas quando o vendedor preencheu', () => {
    renderFila([makeListing({ weightGrams: 300, widthCm: 10, heightCm: 15, lengthCm: 8 })]);
    abrirDetalhe();
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

  // ── Motivo da reprovação ───────────────────────────────────────────────────
  // O texto vai inteiro para o vendedor, no painel e no e-mail. Com centenas de
  // anúncios na fila, escolher à mão a cada reprovação leva a clicar sempre no
  // primeiro da lista, então a tela sugere a partir do que já detectou.

  it('oferece motivo sobre peso e dimensões', () => {
    renderFila([makeListing()]);
    fireEvent.click(screen.getByText('Reprovar'));
    expect(screen.getByText(/Peso ou dimensões faltando/)).toBeInTheDocument();
  });

  it('sugere o motivo de frete quando é isso que falta', () => {
    // Anúncio completo, menos peso e medidas.
    renderFila([makeListing({
      attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
    })]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining('Peso ou dimensões') }),
      expect.anything(),
    );
  });

  it('sugere o motivo de fotos quando faltam fotos', () => {
    renderFila([makeListing({
      images: JSON.stringify(['so-uma.jpg']),
      weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
      attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
    })]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining('Fotos insuficientes') }),
      expect.anything(),
    );
  });

  it('a sugestão é editável: o admin pode trocar', () => {
    renderFila([makeListing()]);
    fireEvent.click(screen.getByText('Reprovar'));
    // Vem sugerido frete, mas o admin escolhe outro.
    fireEvent.click(screen.getByText('Suspeita de falsificação ou item não autêntico'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining('falsificação') }),
      expect.anything(),
    );
  });

  // ── Campos por categoria ───────────────────────────────────────────────────
  // Regressão: o painel mostrava as colunas cruas do banco, então carta
  // colecionável aparecia com "Escala: não informada" em vermelho, sendo que
  // escala nem é perguntada para carta, e o campo que a categoria exige (jogo)
  // não aparecia em lugar nenhum.

  it('não cobra escala de carta colecionável', () => {
    renderFila([makeListing({
      categoryId: 'cat_2',
      attributes: JSON.stringify({ jogo: 'Pokémon', raridade: 'Rara' }),
    })]);
    abrirDetalhe();
    expect(screen.queryByText('Escala')).not.toBeInTheDocument();
  });

  it('mostra os campos que a categoria realmente pergunta', () => {
    renderFila([makeListing({
      categoryId: 'cat_2',
      attributes: JSON.stringify({ jogo: 'Pokémon', raridade: 'Rara' }),
    })]);
    abrirDetalhe();
    expect(screen.getByText('Jogo / Universo')).toBeInTheDocument();
    expect(screen.getByText('Pokémon')).toBeInTheDocument();
    expect(screen.getByText('Raridade')).toBeInTheDocument();
  });

  it('marca em vermelho só o obrigatório da categoria que está vazio', () => {
    renderFila([makeListing({ categoryId: 'cat_2', attributes: JSON.stringify({}) })]);
    abrirDetalhe();
    const jogo = screen.getByText('Jogo / Universo').parentElement!;
    expect(jogo.querySelector('span:last-child')!.className).toContain('text-destructive');
    // Raridade é opcional, então não pode aparecer como problema.
    const raridade = screen.getByText('Raridade').parentElement!;
    expect(raridade.querySelector('span:last-child')!.className).not.toContain('text-destructive');
  });

  // ── Filtros ────────────────────────────────────────────────────────────────

  it('filtra por categoria', () => {
    renderFila([
      makeListing({ id: 'a', title: 'Funko do teste', categoryId: 'cat_1' }),
      makeListing({ id: 'b', title: 'Carta do teste', categoryId: 'cat_2' }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /^Cards Colecionáveis \(1\)$/ }));
    expect(screen.getByText('Carta do teste')).toBeInTheDocument();
    expect(screen.queryByText('Funko do teste')).not.toBeInTheDocument();
  });

  it('filtra só os que têm pendência', () => {
    renderFila([
      makeListing({ id: 'ok', title: 'Completo', weightGrams: 300, widthCm: 1, heightCm: 1, lengthCm: 1, attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }) }),
      makeListing({ id: 'ruim', title: 'Faltando coisa', images: JSON.stringify(['a.jpg']) }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Com pendência/ }));
    expect(screen.getByText('Faltando coisa')).toBeInTheDocument();
    expect(screen.queryByText('Completo')).not.toBeInTheDocument();
  });

  // ── Data de envio ──────────────────────────────────────────────────────────
  // Com 600 anúncios na fila, quem enviou primeiro tem que ser revisado
  // primeiro, senão o anúncio antigo some no fundo enquanto os novos empilham
  // por cima.

  const diasAtras = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

  /** Títulos na ordem em que aparecem na tela. */
  const tituloNaOrdem = () =>
    [...document.querySelectorAll('h3')].map((h) => h.textContent);

  it('começa pelo mais antigo, que é a ordem justa da fila', () => {
    renderFila([
      makeListing({ id: 'novo', title: 'Chegou hoje', createdAt: diasAtras(0) }),
      makeListing({ id: 'velho', title: 'Espera ha 20 dias', createdAt: diasAtras(20) }),
      makeListing({ id: 'meio', title: 'Espera ha 3 dias', createdAt: diasAtras(3) }),
    ]);
    expect(tituloNaOrdem()).toEqual(['Espera ha 20 dias', 'Espera ha 3 dias', 'Chegou hoje']);
  });

  it('inverte para o mais recente quando pedido', () => {
    renderFila([
      makeListing({ id: 'novo', title: 'Chegou hoje', createdAt: diasAtras(0) }),
      makeListing({ id: 'velho', title: 'Espera ha 20 dias', createdAt: diasAtras(20) }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Mais recentes/ }));
    expect(tituloNaOrdem()).toEqual(['Chegou hoje', 'Espera ha 20 dias']);
  });

  it('filtra os encalhados ha mais de 7 dias', () => {
    renderFila([
      makeListing({ id: 'a', title: 'Chegou hoje', createdAt: diasAtras(0) }),
      makeListing({ id: 'b', title: 'Espera ha 20 dias', createdAt: diasAtras(20) }),
      makeListing({ id: 'c', title: 'Espera ha 10 dias', createdAt: diasAtras(10) }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /^Mais de 7 dias \(2\)$/ }));
    expect(tituloNaOrdem()).toEqual(['Espera ha 20 dias', 'Espera ha 10 dias']);
  });

  it('filtra só o que chegou hoje', () => {
    renderFila([
      makeListing({ id: 'a', title: 'Chegou hoje', createdAt: new Date().toISOString() }),
      makeListing({ id: 'b', title: 'Ontem', createdAt: diasAtras(1) }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /^Hoje \(1\)$/ }));
    expect(tituloNaOrdem()).toEqual(['Chegou hoje']);
  });

  it('a contagem de cada periodo bate com a fila inteira', () => {
    renderFila([
      makeListing({ id: 'a', createdAt: new Date().toISOString() }),
      makeListing({ id: 'b', createdAt: diasAtras(3) }),
      makeListing({ id: 'c', createdAt: diasAtras(30) }),
    ]);
    expect(screen.getByRole('button', { name: /^Qualquer data \(3\)$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Hoje \(1\)$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Últimos 7 dias \(2\)$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Mais de 7 dias \(1\)$/ })).toBeInTheDocument();
  });

  it('não descarta anúncio com data corrompida na visão geral', () => {
    renderFila([makeListing({ id: 'x', title: 'Data quebrada', createdAt: 'nao-e-data' })]);
    expect(screen.getByText('Data quebrada')).toBeInTheDocument();
  });

  it('busca por título', () => {
    renderFila([
      makeListing({ id: 'a', title: 'Funko do teste' }),
      makeListing({ id: 'b', title: 'Carta do teste' }),
    ]);
    fireEvent.change(screen.getByPlaceholderText(/Buscar por título/), {
      target: { value: 'carta' },
    });
    expect(screen.getByText('Carta do teste')).toBeInTheDocument();
    expect(screen.queryByText('Funko do teste')).not.toBeInTheDocument();
  });
});

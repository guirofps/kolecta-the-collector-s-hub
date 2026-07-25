import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useAdminListings: vi.fn(),
  useUpdateListingStatus: vi.fn(),
  useBulkUpdateListingStatus: vi.fn(),
  useCategories: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
}));

vi.mock('@/components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'admin-layout' }, children),
}));

// ── Imports após mock ─────────────────────────────────────────────────────────

import {
  useAdminListings,
  useUpdateListingStatus,
  useBulkUpdateListingStatus,
  useCategories,
} from '@/hooks/use-api';
import AdminListingsPage from '@/pages/admin/Listings';

const mutate = vi.fn();
const bulkMutate = vi.fn();

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
    (useBulkUpdateListingStatus as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: bulkMutate, isPending: false,
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

  // O mínimo caiu de 3 para 2 (lib/photos). Duas fotos param de ser pendência:
  // fixa o limite aqui para que voltar a exigir 3 quebre no teste, e não numa
  // reprovação injusta na fila.
  it('duas fotos deixam de ser pendência', () => {
    renderFila([makeListing({
      images: JSON.stringify(['uma.jpg', 'duas.jpg']),
      weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
      attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
    })]);
    fireEvent.click(screen.getByText('Reprovar'));
    // Nada sugerido: sem motivo marcado, o botão nasce travado.
    const confirmar = screen.getByText('Confirmar Reprovação').closest('button')!;
    expect(confirmar.disabled).toBe(true);
  });

  it('a sugestão é editável: o admin acrescenta outro motivo', () => {
    renderFila([makeListing()]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.click(screen.getByText('Suspeita de falsificação ou item não autêntico'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining('falsificação') }),
      expect.anything(),
    );
  });

  // ── Detalhe do motivo ──────────────────────────────────────────────────────
  // "Faltam informações obrigatórias da categoria" não diz o que preencher. A
  // tela sabe quais campos são, e sem passar isso adiante o vendedor reenvia
  // no chute e leva a mesma reprovação.

  it('diz QUAIS campos da categoria faltam', () => {
    renderFila([makeListing({
      images: JSON.stringify(['a.jpg', 'b.jpg']),
      weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
      attributes: JSON.stringify({}),
    })]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));

    const enviado = mutate.mock.calls[0][0].reason as string;
    expect(enviado).toContain('Faltam informações obrigatórias da categoria:');
    // Os campos que a categoria de teste exige entram no texto.
    expect(enviado).toMatch(/número|linha/i);
  });

  it('diz quantas fotos tem e quantas precisa', () => {
    renderFila([makeListing({
      images: JSON.stringify(['so-uma.jpg']),
      weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
      attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
    })]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));

    const enviado = mutate.mock.calls[0][0].reason as string;
    expect(enviado).toContain('tem 1 foto');
    expect(enviado).toContain('mínimo é 2');
  });

  it('diz se falta peso, dimensões ou os dois', () => {
    renderFila([makeListing({
      images: JSON.stringify(['a.jpg', 'b.jpg']),
      weightGrams: 300, // tem peso, faltam as medidas
      attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
    })]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));

    const enviado = mutate.mock.calls[0][0].reason as string;
    expect(enviado).toContain('falta dimensões');
    expect(enviado).not.toContain('falta peso');
  });

  it('o detalhe aparece no diálogo antes de confirmar', () => {
    renderFila([makeListing({
      images: JSON.stringify(['a.jpg', 'b.jpg']),
      weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
      attributes: JSON.stringify({}),
    })]);
    fireEvent.click(screen.getByText('Reprovar'));
    // O admin confere o que vai ser mandado, não confirma no escuro.
    expect(screen.getAllByText(/número|linha/i).length).toBeGreaterThan(0);
  });

  // ── Vários motivos de uma vez ──────────────────────────────────────────────
  // Anúncio de importação costuma ter mais de um problema. Mandar um motivo por
  // vez faria o vendedor corrigir, reenviar e levar outra reprovação em seguida.

  it('envia todos os motivos marcados, um por linha', () => {
    // Este anúncio tem 1 foto, sem frete e sem os campos que Funko exige:
    // três faltas detectadas, mais o preço que o admin marca à mão.
    renderFila([makeListing({ images: JSON.stringify(['a.jpg']) })]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.click(screen.getByText('Preço fora dos padrões de mercado'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));

    const enviado = mutate.mock.calls[0][0].reason as string;
    expect(enviado).toContain('Fotos insuficientes');
    expect(enviado).toContain('Peso ou dimensões');
    expect(enviado).toContain('informações obrigatórias da categoria');
    expect(enviado).toContain('Preço fora dos padrões');
    // Cada motivo numa linha, para virar lista no painel e no e-mail.
    expect(enviado.split('\n').filter((l) => l.startsWith('- ')).length).toBe(4);
  });

  it('desmarcar tira o motivo da lista', () => {
    renderFila([makeListing({ images: JSON.stringify(['a.jpg']) })]);
    fireEvent.click(screen.getByText('Reprovar'));
    // Vem sugerido; clicar de novo desmarca.
    fireEvent.click(screen.getByText('Fotos insuficientes ou de baixa qualidade'));
    fireEvent.click(screen.getByText('Confirmar Reprovação'));

    const enviado = mutate.mock.calls[0][0].reason as string;
    expect(enviado).not.toContain('Fotos insuficientes');
    expect(enviado).toContain('Peso ou dimensões');
  });

  it('não deixa reprovar sem nenhum motivo marcado', () => {
    // Anúncio completo: nada é sugerido, então o botão nasce travado.
    renderFila([makeListing({
      weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
      attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
    })]);
    fireEvent.click(screen.getByText('Reprovar'));
    const confirmar = screen.getByText('Confirmar Reprovação').closest('button')!;
    expect(confirmar.disabled).toBe(true);
  });

  it('a observação livre vai junto dos motivos', () => {
    renderFila([makeListing()]);
    fireEvent.click(screen.getByText('Reprovar'));
    fireEvent.change(screen.getByPlaceholderText(/Observações adicionais/i), {
      target: { value: 'A terceira foto está desfocada.' },
    });
    fireEvent.click(screen.getByText('Confirmar Reprovação'));
    expect(mutate.mock.calls[0][0].reason).toContain('A terceira foto está desfocada.');
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

/**
 * Moderação em lote. Com centenas de anúncios na fila, um a um é inviável.
 * O risco é o inverso: um clique errado publicar catálogo inteiro sem revisão,
 * ou a seleção alcançar anúncio que o admin nem está vendo.
 */
describe('AdminListings (moderação em lote)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUpdateListingStatus as ReturnType<typeof vi.fn>).mockReturnValue({ mutate, isPending: false });
    (useBulkUpdateListingStatus as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: bulkMutate, isPending: false,
    });
    (useCategories as ReturnType<typeof vi.fn>).mockReturnValue({ data: CATEGORIAS });
  });

  const marcar = (titulo: string) =>
    fireEvent.click(screen.getByRole('checkbox', { name: `Selecionar ${titulo}` }));

  const doisAnuncios = () => [
    makeListing({ id: 'a', title: 'Primeiro anúncio da fila' }),
    makeListing({ id: 'b', title: 'Segundo anúncio da fila' }),
  ];

  it('a barra de ações só aparece com algo marcado', () => {
    renderFila(doisAnuncios());
    expect(screen.queryByText(/selecionado/)).toBeNull();
    marcar('Primeiro anúncio da fila');
    expect(screen.getByText('1 selecionado')).toBeInTheDocument();
  });

  it('o que sai do filtro deixa de contar, e a tela avisa', () => {
    // Marcar 2, filtrar para 1: o botão não pode prometer 2 e agir em 1.
    renderFila([
      makeListing({ id: 'a', title: 'Funko marcado', categoryId: 'cat_1' }),
      makeListing({ id: 'b', title: 'Carta marcada', categoryId: 'cat_2' }),
    ]);
    fireEvent.click(screen.getByText(/Selecionar os 2 desta lista/));
    expect(screen.getByText('2 selecionados')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/^Funko Pop \(1\)$/));
    expect(screen.getByText('1 selecionado')).toBeInTheDocument();
    expect(screen.getByText(/1 fora do filtro atual/)).toBeInTheDocument();
  });

  it('aprova em lote só o que foi marcado', () => {
    renderFila(doisAnuncios());
    marcar('Primeiro anúncio da fila');
    fireEvent.click(screen.getByText(/^Aprovar 1$/));
    // Confirmação antes: aprovar publica na hora e não desfaz em lote.
    fireEvent.click(screen.getAllByText(/^Aprovar 1$/)[1]);

    const arg = bulkMutate.mock.calls[0][0];
    expect(arg.status).toBe('active');
    expect(arg.itens.map((i: { id: string }) => i.id)).toEqual(['a']);
  });

  it('não aprova sem passar pela confirmação', () => {
    renderFila(doisAnuncios());
    marcar('Primeiro anúncio da fila');
    fireEvent.click(screen.getByText(/^Aprovar 1$/));
    // Só abriu o diálogo; nada foi enviado ainda.
    expect(bulkMutate).not.toHaveBeenCalled();
  });

  it('avisa quantos dos marcados têm pendência antes de aprovar', () => {
    renderFila([
      makeListing({ id: 'a', title: 'Anúncio sem foto', images: JSON.stringify(['so-uma.jpg']) }),
    ]);
    marcar('Anúncio sem foto');
    fireEvent.click(screen.getByText(/^Aprovar 1$/));
    expect(screen.getByText(/tem pendência/)).toBeInTheDocument();
  });

  it('selecionar todos alcança só a lista visível, e o mesmo clique desmarca', () => {
    renderFila(doisAnuncios());
    const botao = screen.getByText(/Selecionar os 2 desta lista/);
    fireEvent.click(botao);
    expect(screen.getByText('2 selecionados')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Selecionar os 2 desta lista/));
    expect(screen.queryByText('2 selecionados')).toBeNull();
  });

  // ── Reprovação em lote ────────────────────────────────────────────────────
  // Reprovar 271 anúncios com o MESMO texto estaria errado na maioria: um está
  // sem foto, outro sem frete, outro sem a marca. A tela já detecta a pendência
  // de cada um, então é isso que vai para cada vendedor.

  const doisProblemasDiferentes = () => [
    makeListing({
      id: 'sem-foto', title: 'Só tem uma foto',
      images: JSON.stringify(['x.jpg']),
      weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
      attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
    }),
    makeListing({
      id: 'sem-frete', title: 'Fotos ok, falta frete',
      images: JSON.stringify(['x.jpg', 'y.jpg']),
      attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
    }),
  ];

  it('reprova sem o admin escolher nada, usando o motivo de cada anúncio', () => {
    renderFila(doisProblemasDiferentes());
    fireEvent.click(screen.getByText(/Selecionar os 2 desta lista/));
    fireEvent.click(screen.getByText(/^Reprovar 2$/));
    // Nada marcado à mão e o botão já libera: o motivo vem da detecção.
    fireEvent.click(screen.getAllByText(/^Reprovar 2$/)[1]);

    const itens = bulkMutate.mock.calls[0][0].itens;
    const porId = Object.fromEntries(itens.map((i: { id: string; reason: string }) => [i.id, i.reason]));

    // Cada um recebe o SEU problema, não um texto genérico compartilhado.
    expect(porId['sem-foto']).toContain('Fotos insuficientes');
    expect(porId['sem-foto']).not.toContain('Peso ou dimensões');
    expect(porId['sem-frete']).toContain('Peso ou dimensões');
    expect(porId['sem-frete']).not.toContain('Fotos insuficientes');
  });

  it('o detalhe também é o do anúncio de cada um', () => {
    renderFila(doisProblemasDiferentes());
    fireEvent.click(screen.getByText(/Selecionar os 2 desta lista/));
    fireEvent.click(screen.getByText(/^Reprovar 2$/));
    fireEvent.click(screen.getAllByText(/^Reprovar 2$/)[1]);

    const itens = bulkMutate.mock.calls[0][0].itens;
    const porId = Object.fromEntries(itens.map((i: { id: string; reason: string }) => [i.id, i.reason]));
    expect(porId['sem-foto']).toContain('tem 1 foto e o mínimo é 2');
    expect(porId['sem-frete']).toContain('falta peso e dimensões');
  });

  it('mostra a composição do lote antes de disparar', () => {
    renderFila(doisProblemasDiferentes());
    fireEvent.click(screen.getByText(/Selecionar os 2 desta lista/));
    fireEvent.click(screen.getByText(/^Reprovar 2$/));
    // Um de cada tipo: o admin vê que não são o mesmo problema.
    expect(screen.getByText(/1× Fotos insuficientes/)).toBeInTheDocument();
    expect(screen.getByText(/1× Peso ou dimensões faltando/)).toBeInTheDocument();
  });

  it('anúncio sem pendência fica de fora, e a tela avisa', () => {
    renderFila([
      makeListing({
        id: 'ok', title: 'Anúncio completo',
        images: JSON.stringify(['a.jpg', 'b.jpg']),
        weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
        attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
      }),
      makeListing({
        id: 'ruim', title: 'Anúncio sem foto',
        images: JSON.stringify(['a.jpg']),
        weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 10,
        attributes: JSON.stringify({ numero: '#1', line: 'Marvel' }),
      }),
    ]);
    fireEvent.click(screen.getByText(/Selecionar os 2 desta lista/));
    fireEvent.click(screen.getByText(/^Reprovar 2$/));

    // O botão promete 1, não 2: reprovar sem motivo trava o vendedor.
    expect(screen.getByText(/1 ficam de fora|1 ficam/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByText(/^Reprovar 1$/)[0]);

    const itens = bulkMutate.mock.calls[0][0].itens;
    expect(itens.map((i: { id: string }) => i.id)).toEqual(['ruim']);
  });

  it('motivo marcado à mão entra em todos, junto do detectado', () => {
    renderFila(doisProblemasDiferentes());
    fireEvent.click(screen.getByText(/Selecionar os 2 desta lista/));
    fireEvent.click(screen.getByText(/^Reprovar 2$/));
    fireEvent.click(screen.getByText('Suspeita de falsificação ou item não autêntico'));
    fireEvent.click(screen.getAllByText(/^Reprovar 2$/)[1]);

    const itens = bulkMutate.mock.calls[0][0].itens;
    for (const item of itens) {
      expect(item.reason).toContain('falsificação');
    }
    // E o detectado continua lá: o marcado é acréscimo, não substituição.
    const porId = Object.fromEntries(itens.map((i: { id: string; reason: string }) => [i.id, i.reason]));
    expect(porId['sem-foto']).toContain('Fotos insuficientes');
  });

  it('a observação livre vai junto de todos', () => {
    renderFila(doisProblemasDiferentes());
    fireEvent.click(screen.getByText(/Selecionar os 2 desta lista/));
    fireEvent.click(screen.getByText(/^Reprovar 2$/));
    fireEvent.change(screen.getByPlaceholderText(/vão para todos/i), {
      target: { value: 'Reenviem com foto do verso.' },
    });
    fireEvent.click(screen.getAllByText(/^Reprovar 2$/)[1]);

    for (const item of bulkMutate.mock.calls[0][0].itens) {
      expect(item.reason).toContain('Reenviem com foto do verso.');
    }
  });
});

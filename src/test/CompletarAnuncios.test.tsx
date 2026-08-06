import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Completar anúncios em massa.
 *
 * O que estes testes prendem é a parte que engana. A tela existe para preencher
 * buraco, então listar um anúncio que JÁ tem o campo é oferecer trabalho que não
 * precisa ser feito, e pior, é o começo de sobrescrever dado bom. A lista some
 * conforme o campo escolhido, e o pedido só sai com os ids marcados.
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

const CAT_MINI = 'cat-mini';
const CAT_CARTA = 'cat-carta';

const categorias = [
  { id: CAT_MINI, name: 'Miniaturas', slug: 'miniaturas-diecast', icon: null, parentId: null },
  { id: CAT_CARTA, name: 'Cards', slug: 'cards-colecionaveis', icon: null, parentId: null },
];

const anuncios = [
  // Vieram do Bling: marca e escala preenchidas, linha vazia.
  { id: 'a1', title: 'Nissan Skyline', categoryId: CAT_MINI, brand: 'Hot Wheels', line: null, scale: '1:64', year: null, edition: null, attributes: null },
  { id: 'a2', title: 'Toyota Supra', categoryId: CAT_MINI, brand: 'Hot Wheels', line: '', scale: '1:64', year: null, edition: null, attributes: null },
  // Este o vendedor já corrigiu na mão. Não pode aparecer para preencher.
  { id: 'a3', title: 'Porsche 911', categoryId: CAT_MINI, brand: 'Hot Wheels', line: 'Car Culture', scale: '1:64', year: null, edition: null, attributes: null },
  // Outra categoria: não entra na conta de jeito nenhum.
  { id: 'b1', title: 'Charizard', categoryId: CAT_CARTA, brand: null, line: null, scale: null, year: null, edition: null, attributes: null },
];

const completar = vi.fn();

vi.mock('@/hooks/use-api', async () => {
  const real = await vi.importActual<any>('@/hooks/use-api');
  return {
    ...real,
    useMyListings: () => ({ data: anuncios, isLoading: false }),
    useCategories: () => ({ data: categorias, isLoading: false }),
    useCompletarEmLote: () => ({ mutate: completar, isPending: false }),
  };
});

import CompletarAnunciosPage from '@/pages/seller/CompletarAnuncios';

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null,
        React.createElement(CompletarAnunciosPage, null))),
  );
}

/** Radix Select não abre com clique sintético: teclado é o caminho confiável. */
async function escolher(rotulo: string, opcao: string) {
  const gatilho = screen.getByLabelText(rotulo);
  fireEvent.keyDown(gatilho, { key: 'Enter' });
  const item = await screen.findByRole('option', { name: opcao });
  fireEvent.click(item);
}

describe('Completar anúncios em massa', () => {
  beforeEach(() => {
    completar.mockClear();
  });

  it('não mostra lista nenhuma antes de escolher o campo', () => {
    montar();
    expect(screen.queryByText('Nissan Skyline')).not.toBeInTheDocument();
  });

  it('lista só os anúncios da categoria a que falta o campo', async () => {
    montar();
    await escolher('Categoria', 'Miniaturas');
    await escolher('Campo', 'Linha / Série');

    await waitFor(() => {
      expect(screen.getByText('Nissan Skyline')).toBeInTheDocument();
    });
    // String vazia conta como faltando, igual a null.
    expect(screen.getByText('Toyota Supra')).toBeInTheDocument();
    // Já tem "Car Culture": preencher aqui seria apagar dado bom.
    expect(screen.queryByText('Porsche 911')).not.toBeInTheDocument();
    // Outra categoria.
    expect(screen.queryByText('Charizard')).not.toBeInTheDocument();
  });

  it('some da lista quem já tem o campo, campo a campo', async () => {
    montar();
    await escolher('Categoria', 'Miniaturas');
    // Escala está preenchida nos três, então não sobra nada a fazer.
    await escolher('Campo', 'Escala');

    await waitFor(() => {
      expect(screen.getByText(/Nenhum anúncio precisa disso/i)).toBeInTheDocument();
    });
  });

  it('manda só os ids marcados e o campo escolhido', async () => {
    montar();
    await escolher('Categoria', 'Miniaturas');
    await escolher('Campo', 'Linha / Série');
    await waitFor(() => expect(screen.getByText('Nissan Skyline')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Ex: Mainline'), {
      target: { value: 'Mainline' },
    });

    // Marca só o primeiro.
    const linha = screen.getByText('Nissan Skyline').closest('label')!;
    fireEvent.click(within(linha).getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Preencher/i }));

    expect(completar).toHaveBeenCalledTimes(1);
    expect(completar.mock.calls[0][0]).toMatchObject({
      ids: ['a1'],
      valores: { line: 'Mainline' },
      sobrescrever: false,
    });
  });

  it('não deixa aplicar sem valor digitado', async () => {
    montar();
    await escolher('Categoria', 'Miniaturas');
    await escolher('Campo', 'Linha / Série');
    await waitFor(() => expect(screen.getByText('Nissan Skyline')).toBeInTheDocument());

    const linha = screen.getByText('Nissan Skyline').closest('label')!;
    fireEvent.click(within(linha).getByRole('checkbox'));

    expect(screen.getByRole('button', { name: /Preencher/i })).toBeDisabled();
  });

  it('não deixa aplicar sem nada marcado', async () => {
    montar();
    await escolher('Categoria', 'Miniaturas');
    await escolher('Campo', 'Linha / Série');
    await waitFor(() => expect(screen.getByText('Nissan Skyline')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Ex: Mainline'), {
      target: { value: 'Mainline' },
    });

    expect(screen.getByRole('button', { name: /Preencher/i })).toBeDisabled();
  });

  it('marcar todos pega exatamente os que faltam, não o catálogo', async () => {
    montar();
    await escolher('Categoria', 'Miniaturas');
    await escolher('Campo', 'Linha / Série');
    await waitFor(() => expect(screen.getByText('Nissan Skyline')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Ex: Mainline'), {
      target: { value: 'Mainline' },
    });
    fireEvent.click(screen.getByText('Marcar todos os 2').closest('label')!.querySelector('button')!);
    fireEvent.click(screen.getByRole('button', { name: /Preencher/i }));

    expect(completar.mock.calls[0][0].ids.sort()).toEqual(['a1', 'a2']);
  });

  it('com sobrescrever ligado, o anúncio que já tem valor volta para a lista', async () => {
    montar();
    await escolher('Categoria', 'Miniaturas');
    await escolher('Campo', 'Linha / Série');
    await waitFor(() => expect(screen.getByText('Nissan Skyline')).toBeInTheDocument());
    expect(screen.queryByText('Porsche 911')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(screen.getByText('Porsche 911')).toBeInTheDocument();
    });
    // E o vendedor vê o que vai perder antes de perder.
    expect(screen.getByText(/tem: Car Culture/)).toBeInTheDocument();
  });

  it('trocar de categoria zera o campo escolhido', async () => {
    montar();
    await escolher('Categoria', 'Miniaturas');
    await escolher('Campo', 'Linha / Série');
    await waitFor(() => expect(screen.getByText('Nissan Skyline')).toBeInTheDocument());

    await escolher('Categoria', 'Cards');

    // Sem campo escolhido não há lista: os campos de miniatura não valem para
    // carta, e manter "line" selecionado mandaria o vendedor preencher um campo
    // que a categoria nem pergunta.
    await waitFor(() => {
      expect(screen.queryByText('Nissan Skyline')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Charizard')).not.toBeInTheDocument();
  });
});

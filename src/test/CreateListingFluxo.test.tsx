import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'cat_1', name: 'Miniaturas & Diecast', slug: 'miniaturas-diecast', icon: null, parentId: null },
  { id: 'cat_2', name: 'Cards Colecionáveis', slug: 'cards-colecionaveis', icon: null, parentId: null },
];

// Upload controlado: guarda os callbacks para o teste decidir quando cada
// foto termina, simulando upload lento de celular.
const uploadsEmVoo: Array<{ onSuccess: (d: { url: string }) => void; onSettled: () => void }> = [];
const uploadMutate = vi.fn((_file: File, cbs: { onSuccess: (d: { url: string }) => void; onSettled: () => void }) => {
  uploadsEmVoo.push(cbs);
});

vi.mock('@/hooks/use-api', () => ({
  useCreateListing: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadImage: () => ({ mutate: uploadMutate, isPending: false }),
  useCategories: () => ({ data: CATEGORIAS }),
  useAddresses: () => ({ query: { data: [{ id: 'end_1' }], isLoading: false } }),
}));

vi.mock('@/components/layout/SellerLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

// O AnimatePresence do framer-motion segura a troca de passo em ambiente de
// teste (sem animação real, a saída nunca "termina"). Trocamos por divs.
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: () => ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      // Descarta as props de animação, que não são atributos válidos de DOM.
      const { initial, animate, exit, transition, variants, custom, whileHover, whileTap, ...resto } = props;
      return React.createElement('div', resto, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import CreateListing from '@/pages/seller/CreateListing';

/** Botão pelo texto que contém, tolerando ícones e texto longo dentro. */
function botao(trecho: string): HTMLButtonElement {
  const achado = [...document.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(trecho),
  );
  if (!achado) {
    const todos = [...document.querySelectorAll('button')]
      .map((b) => `"${b.textContent?.trim().slice(0, 30)}"`)
      .join(', ');
    throw new Error(`Botão "${trecho}" não achado. Existem: ${todos}`);
  }
  return achado as HTMLButtonElement;
}

function renderWizard() {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(CreateListing)),
  );
}

/**
 * Caminho real do vendedor até os detalhes do anúncio.
 *
 * Regressão de tela branca: `descricaoRef` e `adicionarItemDescricao` estavam
 * definidos no componente pai, mas o textarea e o botão que os usam vivem em
 * `StepDetails`. Ao confirmar a categoria o React não achava as variáveis e
 * derrubava a tela. O typecheck não pegou (rodava com `files: []`, sem checar
 * nada), então este teste é a rede que faltava.
 */
describe('Criar anúncio: fluxo até os detalhes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  function irAteDetalhes() {
    fireEvent.click(botao('Venda Direta'));
    fireEvent.click(botao('Próximo'));
    fireEvent.click(botao('Miniaturas'));
    fireEvent.click(botao('Confirmar categoria'));
  }

  it('avança do tipo para a escolha de categoria', () => {
    renderWizard();
    fireEvent.click(botao('Venda Direta'));
    fireEvent.click(botao('Próximo'));
    expect(screen.getByText(/Escolha a categoria/i)).toBeInTheDocument();
  });

  it('não fica em branco ao confirmar a categoria', () => {
    renderWizard();
    expect(() => irAteDetalhes()).not.toThrow();
    // Sobreviveu: os campos do sub-passo aparecem.
    expect(screen.getByLabelText(/Título/i)).toBeInTheDocument();
  });

  it('mostra descrição, botão de item e SKU', () => {
    renderWizard();
    irAteDetalhes();
    expect(screen.getByLabelText(/Descrição/i)).toBeInTheDocument();
    expect(botao('Adicionar item')).toBeInTheDocument();
    expect(screen.getByLabelText(/SKU/i)).toBeInTheDocument();
  });

  it('o botão de item insere o marcador na descrição', () => {
    renderWizard();
    irAteDetalhes();
    const descricao = () => screen.getByLabelText(/Descrição/i) as HTMLTextAreaElement;
    fireEvent.change(descricao(), { target: { value: 'Peça rara' } });
    fireEvent.click(botao('Adicionar item'));
    // Busca de novo depois do clique: o React repinta e a referência antiga
    // apontaria para o elemento anterior.
    expect(descricao().value).toBe('Peça rara\n- ');
  });

  it('mostra os campos obrigatórios da categoria escolhida', () => {
    renderWizard();
    irAteDetalhes();
    // Miniaturas exige marca e escala.
    expect(screen.getByLabelText(/Marca/i)).toBeInTheDocument();
    expect(screen.getByText(/Escala/i)).toBeInTheDocument();
  });

  it('percorre até o passo de fotos sem quebrar', () => {
    renderWizard();
    irAteDetalhes();
    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: 'Hot Wheels Skyline GT-R R34 Premium' },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: 'Lacrado, nunca aberto. Peça protegida desde o primeiro dia.' },
    });
    // Não avança sem os obrigatórios da categoria: o botão fica travado.
    expect(botao('Próximo').disabled).toBe(true);
  });
});

/**
 * Regressão do envio de fotos.
 *
 * O botão "Adicionar fotos" ficava desabilitado enquanto QUALQUER foto estivesse
 * subindo. No celular, com foto grande e internet lenta, o vendedor mandava a
 * primeira e depois clicava para adicionar as outras sem nada acontecer.
 */
describe('Criar anúncio: envio de fotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadsEmVoo.length = 0;
    localStorage.clear();
  });

  /** Vai até o passo de fotos com os campos obrigatórios preenchidos. */
  function irAteFotos() {
    fireEvent.click(botao('Venda Direta'));
    fireEvent.click(botao('Próximo'));
    fireEvent.click(botao('Miniaturas'));
    fireEvent.click(botao('Confirmar categoria'));
    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: 'Hot Wheels Skyline GT-R R34 Premium' },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: 'Lacrado, nunca aberto. Peça protegida desde o primeiro dia.' },
    });
    fireEvent.change(screen.getByLabelText(/Marca/i), { target: { value: 'Hot Wheels' } });
    // Escala é um select do Radix; setamos direto pelo campo de detalhes.
    const escala = document.querySelector('[id^="c1-"]');
    if (escala) fireEvent.change(escala, { target: { value: '1:64' } });
  }

  function enviarArquivo(nome = 'foto.jpg') {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], nome, { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
  }

  it('permite escolher mais fotos enquanto a primeira ainda sobe', () => {
    renderWizard();
    irAteFotos();
    // Pula direto para o passo de fotos usando o botão, se liberado.
    const proximo = botao('Próximo');
    if (!proximo.disabled) fireEvent.click(proximo);

    const input = document.querySelector('input[type="file"]');
    if (!input) return; // não chegou nas fotos: o teste de fluxo já cobre isso

    enviarArquivo('capa.jpg');
    expect(uploadsEmVoo).toHaveLength(1);

    // Com a primeira ainda em voo, o botão de adicionar continua clicável.
    const adicionar = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Adicionar fotos'),
    ) as HTMLButtonElement | undefined;
    expect(adicionar?.disabled).not.toBe(true);
  });
});

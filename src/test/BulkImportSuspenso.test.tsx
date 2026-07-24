import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mutate = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useBulkImport: () => ({ mutate, isPending: false }),
  useImportJobStatus: () => ({ data: null }),
}));

vi.mock('@/components/layout/SellerLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/lib/api', () => ({
  api: { listings: { getImportTemplate: vi.fn() } },
}));

import BulkImportPage from '@/pages/seller/BulkImport';

function renderPagina() {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(BulkImportPage)),
  );
}

/**
 * A importação por planilha está suspensa: o modelo usa o vocabulário antigo de
 * condição (lacrado/novo/mint/usado) e o sistema hoje grava novo-lacrado e
 * afins, então todo anúncio importado nascia inválido. Um único vendedor entrou
 * com 358 anúncios por essa porta.
 *
 * Tirar o botão não basta: quem já usou pode ter a URL salva.
 */
describe('Importação por planilha suspensa', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explica ao vendedor que está indisponível', () => {
    renderPagina();
    expect(screen.getByText(/Importação temporariamente indisponível/i)).toBeInTheDocument();
  });

  it('oferece o caminho que funciona, em vez de deixar sem saída', () => {
    renderPagina();
    const link = screen.getByRole('link', { name: /Criar anúncio/i });
    expect(link).toHaveAttribute('href', '/painel/anuncios/novo');
  });

  it('não mostra a área de envio nem o campo de arquivo', () => {
    renderPagina();
    expect(screen.queryByText(/Arraste ou clique para selecionar/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('não oferece o template desatualizado para download', () => {
    renderPagina();
    expect(screen.queryByText(/Baixar template/i)).not.toBeInTheDocument();
  });

  it('bloqueia o envio mesmo se algo disparar o upload', () => {
    const { container } = renderPagina();
    // Arrastar arquivo na tela é o caminho que sobra quando o input some.
    const alvo = container.querySelector('div');
    if (alvo) {
      fireEvent.drop(alvo, { dataTransfer: { files: [new File(['x'], 'a.csv')] } });
    }
    expect(mutate).not.toHaveBeenCalled();
  });
});

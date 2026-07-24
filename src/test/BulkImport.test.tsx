import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

import BulkImportPage from '@/pages/seller/BulkImport';

function renderPagina() {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(BulkImportPage)),
  );
}

/** Simula o vendedor escolhendo um arquivo CSV. */
function escolherCsv(container: HTMLElement, conteudo: string, nome = 'anuncios.csv') {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([conteudo], nome, { type: 'text/csv' });
  // jsdom não implementa File.text(); o componente usa isso para ler o arquivo.
  Object.defineProperty(file, 'text', { value: async () => conteudo });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

const CABECALHO =
  'title,category,condition,description,price,images,brand,scale,weight_grams,width_cm,height_cm,length_cm';
const LINHA_OK =
  'Hot Wheels Skyline GT-R R34,miniaturas-diecast,novo-lacrado,'
  + '"Lacrado, nunca aberto. Peca protegida desde o primeiro dia.",149.90,'
  + '"https://s.com/1.jpg, https://s.com/2.jpg, https://s.com/3.jpg",Hot Wheels,1:64,150,15,10,5';

/**
 * A importação criava anúncio incompleto porque o modelo não pedia categoria,
 * fotos nem dados de frete. Um vendedor subiu 363 anúncios assim. Agora a
 * planilha é conferida ANTES de qualquer anúncio ser criado.
 */
describe('Importação por planilha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('oferece o modelo e lista as colunas obrigatórias', () => {
    renderPagina();
    expect(screen.getByText(/Baixar modelo/i)).toBeInTheDocument();
    // A coluna que faltava e causou o estrago.
    expect(screen.getByText('category')).toBeInTheDocument();
    expect(screen.getByText('weight_grams')).toBeInTheDocument();
  });

  it('aponta o erro com o número da linha, sem criar nada', async () => {
    const { container } = renderPagina();
    // Sem categoria e sem fotos.
    escolherCsv(container, `${CABECALHO}\nItem sem nada,,novo-lacrado,desc,10,,,,,,,\n`);

    await waitFor(() => {
      expect(screen.getByText(/Corrija a planilha antes de subir/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Linha 2/).length).toBeGreaterThan(0);
    // O ponto principal: nenhum anúncio foi criado.
    expect(mutate).not.toHaveBeenCalled();
  });

  it('libera o envio quando a planilha está correta', async () => {
    const { container } = renderPagina();
    escolherCsv(container, `${CABECALHO}\n${LINHA_OK}\n`);

    await waitFor(() => {
      expect(screen.getByText(/Planilha conferida/i)).toBeInTheDocument();
    });
    const botao = screen.getByRole('button', { name: /Importar 1 anúncios/i });
    fireEvent.click(botao);
    expect(mutate).toHaveBeenCalled();
  });

  it('pede CSV quando o vendedor manda XLSX, para a conferência acontecer', async () => {
    const { container } = renderPagina();
    escolherCsv(container, 'qualquer', 'planilha.xlsx');
    await waitFor(() => {
      expect(screen.getByText(/Salvar como > CSV UTF-8/i)).toBeInTheDocument();
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});

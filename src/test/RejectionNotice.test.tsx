import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import RejectionNotice from '@/components/RejectionNotice';

const r = (motivo: string | null | undefined) =>
  render(React.createElement(RejectionNotice, { motivo }));

/**
 * O vendedor via só o selo "Reprovado" e nenhum motivo. O texto existia no
 * banco (`rejectionReason`) e ia no e-mail, mas quem apagasse o e-mail ficava
 * sem saber o que corrigir.
 */
describe('RejectionNotice', () => {
  it('mostra o motivo que o admin escreveu', () => {
    r('Fotos insuficientes ou de baixa qualidade. Refaça com boa luz.');
    expect(screen.getByText(/Fotos insuficientes/)).toBeInTheDocument();
    expect(screen.getByText('Motivo da reprovação')).toBeInTheDocument();
  });

  // Anúncio reprovado antes de o campo existir, ou motivo não preenchido.
  it('assume a falta em vez de deixar o vendedor procurando', () => {
    r(null);
    expect(screen.getByText('Anúncio reprovado')).toBeInTheDocument();
    expect(screen.getByText(/não foi registrado/)).toBeInTheDocument();
    expect(screen.getByText(/suporte/)).toBeInTheDocument();
  });

  it('trata motivo em branco como ausente', () => {
    r('   ');
    expect(screen.getByText(/não foi registrado/)).toBeInTheDocument();
  });

  // A moderação manda vários motivos de uma vez, um por linha. Num parágrafo
  // corrido o vendedor lê o primeiro e ignora o resto.
  it('mostra vários motivos como lista, não como parágrafo', () => {
    const { container } = r(
      '- Fotos insuficientes ou de baixa qualidade\n'
      + '- Peso ou dimensões faltando\n'
      + '- Faltam informações obrigatórias da categoria',
    );
    const itens = container.querySelectorAll('li');
    expect(itens).toHaveLength(3);
    expect(itens[1].textContent).toContain('Peso ou dimensões');
  });

  it('mantém a observação do admin junto da lista', () => {
    const { container } = r(
      '- Fotos insuficientes\n- Peso faltando\n\nA terceira foto está desfocada.',
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.textContent).toContain('A terceira foto está desfocada.');
  });

  it('não interpreta o texto da moderação como HTML', () => {
    const { container } = r('Motivo <b>com marcação</b>');
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<b>');
  });
});

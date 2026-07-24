import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProductDescription from '@/components/ProductDescription';

const r = (texto: string | null | undefined) =>
  render(React.createElement(ProductDescription, { texto }));

describe('ProductDescription', () => {
  it('mostra os itens como lista de verdade, não texto corrido', () => {
    const { container } = r('Diferenciais:\n- Lacrado\n- Caixa perfeita\n- Com certificado');
    const itens = container.querySelectorAll('li');
    expect(itens).toHaveLength(3);
    expect(itens[0].textContent).toBe('Lacrado');
  });

  it('separa parágrafo de lista', () => {
    const { container } = r('Peça linda.\n\n- Item um\n- Item dois');
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelectorAll('ul')).toHaveLength(1);
  });

  it('avisa quando não há descrição em vez de deixar vazio', () => {
    r('');
    expect(screen.getByText('Sem descrição disponível.')).toBeInTheDocument();
  });

  it('aguenta nulo', () => {
    r(null);
    expect(screen.getByText('Sem descrição disponível.')).toBeInTheDocument();
  });

  it('não interpreta o texto do vendedor como HTML', () => {
    // Texto do vendedor é dado, não markup: precisa aparecer escapado.
    const { container } = r('Item <script>alert(1)</script> raro');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>');
  });
});

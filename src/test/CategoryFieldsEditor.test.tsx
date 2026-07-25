import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryFieldsEditor from '@/components/CategoryFieldsEditor';
import { CATEGORY_FIELDS } from '@/lib/category-fields';

const noop = () => {};

describe('CategoryFieldsEditor', () => {
  // O bug de origem: a edição tinha cinco caixas fixas (Marca/Linha/Escala/
  // Ano/Edição) para toda categoria. Um card reprovado por falta de
  // "Jogo / Universo" não tinha onde ser corrigido.

  it.each(Object.keys(CATEGORY_FIELDS))(
    'mostra TODOS os campos de %s',
    (slug) => {
      render(
        <CategoryFieldsEditor categorySlug={slug} values={{}} onChange={noop} />,
      );

      // Campo dependente só aparece quando a condição bate — fora do check.
      const esperados = CATEGORY_FIELDS[slug].filter((c) => !c.dependeDe);
      for (const campo of esperados) {
        expect(
          screen.getByText(new RegExp(campo.label, 'i')),
        ).toBeInTheDocument();
      }
    },
  );

  it('carta mostra Jogo / Universo e NÃO pede escala', () => {
    render(
      <CategoryFieldsEditor
        categorySlug="cards-colecionaveis"
        values={{}}
        onChange={noop}
      />,
    );

    expect(screen.getByText(/Jogo \/ Universo/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Escala$/i)).toBeNull();
  });

  it('campo com lista fechada vira seleção, não texto livre', () => {
    // Texto livre foi o que gerou Hotweels / Hot wells / HOT WELLS no banco.
    render(
      <CategoryFieldsEditor
        categorySlug="miniaturas-diecast"
        values={{}}
        onChange={noop}
      />,
    );
    expect(screen.getByLabelText(/Fabricante da miniatura/i)).toHaveAttribute(
      'role',
      'combobox',
    );
  });

  it('marca com * o que é obrigatório', () => {
    render(
      <CategoryFieldsEditor
        categorySlug="funko-pop"
        values={{}}
        onChange={noop}
      />,
    );
    // numero e line são obrigatórios em funko-pop
    expect(screen.getByText(/Número do Pop/i).textContent).toContain('*');
  });

  it('campo dependente só aparece quando a condição bate', () => {
    const semGrading = render(
      <CategoryFieldsEditor
        categorySlug="cards-colecionaveis"
        values={{ gradada: 'Não' }}
        onChange={noop}
      />,
    );
    expect(screen.queryByText(/Nota do grading/i)).toBeNull();
    semGrading.unmount();

    render(
      <CategoryFieldsEditor
        categorySlug="cards-colecionaveis"
        values={{ gradada: 'Sim' }}
        onChange={noop}
      />,
    );
    expect(screen.getByText(/Nota do grading/i)).toBeInTheDocument();
  });

  it('devolve a chave e o valor ao editar', () => {
    const onChange = vi.fn();
    render(
      <CategoryFieldsEditor
        categorySlug="action-figures"
        values={{}}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Personagem/i), {
      target: { value: 'Goku' },
    });
    expect(onChange).toHaveBeenCalledWith('personagem', 'Goku');
  });

  it('categoria desconhecida não renderiza nada, em vez de quebrar', () => {
    const { container } = render(
      <CategoryFieldsEditor categorySlug="xpto" values={{}} onChange={noop} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

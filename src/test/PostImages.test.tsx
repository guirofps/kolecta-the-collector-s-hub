import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import PostImages from '@/components/PostImages';

/**
 * Foto de post ficava pequena, cortada em quadrado, sem como ampliar. No
 * celular sumia o detalhe. Agora clicar abre a foto inteira em tela cheia.
 */

const tres = ['a.jpg', 'b.jpg', 'c.jpg'];
const cinco = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'];

describe('PostImages', () => {
  it('sem foto, não renderiza nada', () => {
    const { container } = render(<PostImages images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('cada foto do grid abre o lightbox', () => {
    render(<PostImages images={tres} />);
    // Não há lightbox antes do clique.
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByLabelText('Ampliar foto 1 de 3'));
    expect(screen.getByRole('dialog', { name: /foto ampliada/i })).toBeInTheDocument();
  });

  it('abre já na foto que foi clicada', () => {
    render(<PostImages images={tres} />);
    fireEvent.click(screen.getByLabelText('Ampliar foto 2 de 3'));
    // O contador mostra a posição da foto aberta.
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('navega entre as fotos e volta ao início (circular)', () => {
    render(<PostImages images={tres} />);
    fireEvent.click(screen.getByLabelText('Ampliar foto 1 de 3'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText('Próxima foto'));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    // Da última, "próxima" volta para a primeira.
    fireEvent.click(within(dialog).getByLabelText('Próxima foto'));
    fireEvent.click(within(dialog).getByLabelText('Próxima foto'));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('as setas do teclado navegam', () => {
    render(<PostImages images={tres} />);
    fireEvent.click(screen.getByLabelText('Ampliar foto 1 de 3'));
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('Esc fecha o lightbox', () => {
    render(<PostImages images={tres} />);
    fireEvent.click(screen.getByLabelText('Ampliar foto 1 de 3'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clicar no fundo fecha, clicar na imagem não', () => {
    render(<PostImages images={tres} />);
    fireEvent.click(screen.getByLabelText('Ampliar foto 1 de 3'));
    const dialog = screen.getByRole('dialog');
    // Clique na própria imagem não deve fechar. `alt=""` é decorativa (role de
    // apresentação, não 'img'), então busca pelo elemento direto.
    const imagem = dialog.querySelector('img')!;
    fireEvent.click(imagem);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Clique no fundo (o dialog é o overlay) fecha.
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('foto única não mostra setas nem contador', () => {
    render(<PostImages images={['so-uma.jpg']} />);
    fireEvent.click(screen.getByLabelText('Ampliar foto 1 de 1'));
    expect(screen.queryByLabelText('Próxima foto')).toBeNull();
    expect(screen.queryByText('1 / 1')).toBeNull();
  });

  it('com mais de 3 fotos, a terceira mostra "+N" e todas ficam acessíveis', () => {
    render(<PostImages images={cinco} />);
    // Grid mostra 3, com "+2" na última.
    expect(screen.getByText('+2')).toBeInTheDocument();
    // Abrindo pela terceira e navegando, chega-se à quarta e à quinta.
    fireEvent.click(screen.getByLabelText('Ampliar foto 3 de 5'));
    fireEvent.click(within(screen.getByRole('dialog')).getByLabelText('Próxima foto'));
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
  });
});

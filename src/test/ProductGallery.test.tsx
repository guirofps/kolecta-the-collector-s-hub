import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductGallery from '@/components/ProductGallery';

const TRES = [
  'https://s.com/frente.jpg',
  'https://s.com/verso.jpg',
  'https://s.com/caixa.jpg',
];

const principal = () => screen.getByAltText('Skyline R34') as HTMLImageElement;

describe('ProductGallery', () => {
  it('mostra a primeira foto como capa', () => {
    render(<ProductGallery images={TRES} title="Skyline R34" />);
    expect(principal().src).toBe(TRES[0]);
  });

  it('clicar na miniatura troca a imagem principal', () => {
    // O motivo do componente existir: as telas mostravam só images[0] e as
    // outras fotos do vendedor eram carregadas e descartadas.
    render(<ProductGallery images={TRES} title="Skyline R34" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Foto 3 de 3' }));
    expect(principal().src).toBe(TRES[2]);

    fireEvent.click(screen.getByRole('tab', { name: 'Foto 2 de 3' }));
    expect(principal().src).toBe(TRES[1]);
  });

  it('marca a miniatura ativa para leitor de tela', () => {
    render(<ProductGallery images={TRES} title="Skyline R34" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Foto 2 de 3' }));

    expect(screen.getByRole('tab', { name: 'Foto 2 de 3' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Foto 1 de 3' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('as setas circulam nas pontas', () => {
    render(<ProductGallery images={TRES} title="Skyline R34" />);

    // Da primeira para trás → última (sem beco sem saída).
    fireEvent.click(screen.getByLabelText('Foto anterior'));
    expect(principal().src).toBe(TRES[2]);

    fireEvent.click(screen.getByLabelText('Próxima foto'));
    expect(principal().src).toBe(TRES[0]);
  });

  it('com uma foto só, não mostra miniaturas nem setas', () => {
    render(<ProductGallery images={[TRES[0]]} title="Skyline R34" />);

    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByLabelText('Próxima foto')).toBeNull();
  });

  it('sem foto nenhuma, cai no placeholder em vez de quebrar', () => {
    render(<ProductGallery images={[]} title="Skyline R34" />);
    expect(principal().src).toContain('/placeholder.svg');
  });

  it('mostra o contador de fotos', () => {
    render(<ProductGallery images={TRES} title="Skyline R34" />);
    expect(screen.getByText('1/3')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Próxima foto'));
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { definirCapa, moverFoto, removerFoto } from '@/lib/fotos-anuncio';

/**
 * A capa é sempre `images[0]`, e a única forma de definir qual seria era a ordem
 * de upload. Para trocar a capa, o vendedor precisava apagar todas as fotos e
 * subir de novo na ordem certa.
 */

const FOTOS = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'];

describe('definirCapa', () => {
  it('traz a foto escolhida para a frente', () => {
    expect(definirCapa(FOTOS, 2)).toEqual(['c.jpg', 'a.jpg', 'b.jpg', 'd.jpg']);
  });

  it('preserva a ordem relativa das outras', () => {
    // O vendedor escolheu a capa, não pediu para embaralhar o resto.
    expect(definirCapa(FOTOS, 3)).toEqual(['d.jpg', 'a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('clicar na que já é capa não muda nada', () => {
    expect(definirCapa(FOTOS, 0)).toEqual(FOTOS);
  });

  it('índice inválido devolve a lista intacta', () => {
    expect(definirCapa(FOTOS, 99)).toEqual(FOTOS);
    expect(definirCapa(FOTOS, -1)).toEqual(FOTOS);
  });

  it('não altera o array original', () => {
    const original = [...FOTOS];
    definirCapa(original, 2);
    expect(original).toEqual(FOTOS);
  });
});

describe('moverFoto', () => {
  it('troca com a vizinha da esquerda', () => {
    expect(moverFoto(FOTOS, 2, -1)).toEqual(['a.jpg', 'c.jpg', 'b.jpg', 'd.jpg']);
  });

  it('troca com a vizinha da direita', () => {
    expect(moverFoto(FOTOS, 0, 1)).toEqual(['b.jpg', 'a.jpg', 'c.jpg', 'd.jpg']);
  });

  it('nas bordas não faz nada, em vez de embaralhar', () => {
    expect(moverFoto(FOTOS, 0, -1)).toEqual(FOTOS);
    expect(moverFoto(FOTOS, 3, 1)).toEqual(FOTOS);
  });

  it('mover a segunda para a esquerda faz dela a capa', () => {
    expect(moverFoto(FOTOS, 1, -1)[0]).toBe('b.jpg');
  });
});

describe('removerFoto', () => {
  it('tira só a escolhida', () => {
    expect(removerFoto(FOTOS, 1)).toEqual(['a.jpg', 'c.jpg', 'd.jpg']);
  });

  it('apagando a capa, a seguinte assume', () => {
    // Era o que já acontecia; fica travado para não regredir.
    expect(removerFoto(FOTOS, 0)[0]).toBe('b.jpg');
  });
});

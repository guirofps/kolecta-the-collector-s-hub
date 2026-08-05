import { describe, it, expect } from 'vitest';
import { dimensaoAlvo, deveComprimir, LADO_MAXIMO, COMPRIMIR_ACIMA_DE } from '@/lib/comprimir-imagem';

// Blob/File falso só com o que a decisão olha (type e size). Evita depender do
// canvas, que o jsdom não implementa.
const arquivo = (type: string, size: number): File =>
  ({ type, size, name: 'Imagem.jpeg' } as File);

describe('dimensaoAlvo', () => {
  it('reduz o maior lado até o limite, mantendo a proporção', () => {
    // Foto de iPad tipica: 4032x3024. Cabe em 1600 no maior lado.
    const d = dimensaoAlvo(4032, 3024);
    expect(Math.max(d.largura, d.altura)).toBe(LADO_MAXIMO);
    // Proporção 4:3 preservada (tolerância de arredondamento).
    expect(Math.abs(d.largura / d.altura - 4032 / 3024)).toBeLessThan(0.01);
  });

  it('respeita o maior lado quando a altura é que manda (retrato)', () => {
    const d = dimensaoAlvo(3024, 4032);
    expect(Math.max(d.largura, d.altura)).toBe(LADO_MAXIMO);
    expect(d.altura).toBeGreaterThan(d.largura);
  });

  it('NÃO amplia imagem menor que o limite', () => {
    const d = dimensaoAlvo(800, 600);
    expect(d).toEqual({ largura: 800, altura: 600 });
  });
});

describe('deveComprimir', () => {
  it('comprime JPEG grande (foto de celular)', () => {
    expect(deveComprimir(arquivo('image/jpeg', 5 * 1024 * 1024))).toBe(true);
  });

  it('deixa passar imagem já leve', () => {
    expect(deveComprimir(arquivo('image/jpeg', 200 * 1024))).toBe(false);
  });

  it('deixa passar tipo que o canvas não trata (gif, svg, heic cru)', () => {
    expect(deveComprimir(arquivo('image/gif', 5 * 1024 * 1024))).toBe(false);
    expect(deveComprimir(arquivo('image/heic', 5 * 1024 * 1024))).toBe(false);
  });

  it('o piso é configurável', () => {
    expect(deveComprimir(arquivo('image/png', 1024), 500)).toBe(true);
    expect(COMPRIMIR_ACIMA_DE).toBeGreaterThan(0);
  });
});

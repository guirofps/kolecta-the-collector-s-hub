import { describe, it, expect } from 'vitest';
import { resolucaoBaixa, LADO_MINIMO_RECOMENDADO } from '@/lib/qualidade-imagem';

/**
 * Um vendedor subiu 41 de 42 anúncios com fotos de 140×140 px (thumbnails), e
 * isso passava na aprovação. O aviso de baixa resolução mede o menor lado.
 */
describe('resolucaoBaixa', () => {
  it('thumbnail (140×140) é baixa resolução', () => {
    expect(resolucaoBaixa(140, 140)).toBe(true);
  });

  it('foto de produto boa (858×978) passa', () => {
    expect(resolucaoBaixa(858, 978)).toBe(false);
  });

  it('usa o MENOR lado: 1600×300 é baixa (300 < mínimo)', () => {
    expect(resolucaoBaixa(1600, 300)).toBe(true);
  });

  it('no limite: exatamente o mínimo não alarma', () => {
    expect(resolucaoBaixa(LADO_MINIMO_RECOMENDADO, LADO_MINIMO_RECOMENDADO)).toBe(false);
  });

  it('dimensão desconhecida (0) não alarma à toa', () => {
    expect(resolucaoBaixa(0, 0)).toBe(false);
  });
});

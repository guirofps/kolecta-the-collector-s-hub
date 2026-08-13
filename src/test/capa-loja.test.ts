import { describe, it, expect } from 'vitest';
import {
  COVER_FOCAL_DEFAULT,
  COVER_OVERLAY_DEFAULT,
  COVER_OVERLAY_MAX,
  COVER_OVERLAY_MIN,
  capaSegura,
} from '@/lib/capa-loja';
import type { StoreCoverData } from '@/lib/api';

describe('capaSegura', () => {
  it('sem imagem, não há capa', () => {
    expect(capaSegura(null)).toBeNull();
    expect(capaSegura(undefined)).toBeNull();
    expect(capaSegura({ url: '', focalY: 50, overlay: 60 })).toBeNull();
  });

  it('mantém o que o vendedor escolheu dentro da faixa', () => {
    expect(capaSegura({ url: 'x', focalY: 20, overlay: 70 })).toEqual({
      url: 'x',
      focalY: 20,
      overlay: 70,
    });
  });

  // O piso é a garantia de que o nome da loja continua legível em cima da
  // imagem. Vale mesmo com resposta velha em cache ou valor gravado antes
  // desta regra existir — por isso o front reaplica o que o backend já valida.
  it('reaplica o piso de escurecimento', () => {
    expect(capaSegura({ url: 'x', focalY: 50, overlay: 0 })?.overlay).toBe(
      COVER_OVERLAY_MIN,
    );
    expect(capaSegura({ url: 'x', focalY: 50, overlay: 999 })?.overlay).toBe(
      COVER_OVERLAY_MAX,
    );
  });

  it('limita o enquadramento a 0-100', () => {
    expect(capaSegura({ url: 'x', focalY: -30, overlay: 60 })?.focalY).toBe(0);
    expect(capaSegura({ url: 'x', focalY: 400, overlay: 60 })?.focalY).toBe(100);
  });

  it('preenche defaults quando o campo vem faltando', () => {
    // Resposta antiga, de antes destes campos existirem: só a URL.
    const r = capaSegura({ url: 'x' } as unknown as StoreCoverData);
    expect(r?.focalY).toBe(COVER_FOCAL_DEFAULT);
    expect(r?.overlay).toBe(COVER_OVERLAY_DEFAULT);
  });

  it('valor não numérico não vira NaN no estilo', () => {
    const r = capaSegura({ url: 'x', focalY: NaN, overlay: NaN });
    expect(Number.isFinite(r!.focalY)).toBe(true);
    expect(Number.isFinite(r!.overlay)).toBe(true);
  });
});

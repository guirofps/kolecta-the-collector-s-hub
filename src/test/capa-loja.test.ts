import { describe, it, expect } from 'vitest';
import {
  COVER_FOCAL_DEFAULT,
  COVER_OVERLAY_DEFAULT,
  COVER_OVERLAY_MAX,
  COVER_OVERLAY_MIN,
  capaSegura,
  variacaoDaCapaPadrao,
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

  it('sem capa própria, quem desenha é a capa padrão (não é buraco)', () => {
    // capaSegura devolve null, e é o StoreCover que troca isso pela CapaPadrao.
    // O contrato importa: null aqui significa "use a padrão", não "não mostre".
    expect(capaSegura(null)).toBeNull();
  });

  it('valor não numérico não vira NaN no estilo', () => {
    const r = capaSegura({ url: 'x', focalY: NaN, overlay: NaN });
    expect(Number.isFinite(r!.focalY)).toBe(true);
    expect(Number.isFinite(r!.overlay)).toBe(true);
  });
});

describe('variacaoDaCapaPadrao', () => {
  // Estável é o ponto: a mesma loja precisa ter sempre a mesma capa padrão, em
  // qualquer sessão e qualquer aparelho. Se variasse, a loja "mudaria de cara"
  // a cada F5.
  it('é estável para a mesma loja', () => {
    expect(variacaoDaCapaPadrao('roda-rara')).toEqual(variacaoDaCapaPadrao('roda-rara'));
  });

  it('difere entre lojas', () => {
    const a = variacaoDaCapaPadrao('roda-rara');
    const b = variacaoDaCapaPadrao('culture-tcg');
    expect(a).not.toEqual(b);
  });

  it('sem seed, cai no centro', () => {
    expect(variacaoDaCapaPadrao()).toEqual({ brilhoX: 50, angulo: 115 });
    expect(variacaoDaCapaPadrao(null)).toEqual({ brilhoX: 50, angulo: 115 });
  });

  // A faixa é estreita de propósito: variação é para as lojas não parecerem a
  // mesma página, não para alguma sair torta ou com o brilho fora da tela.
  it('nunca sai da faixa segura', () => {
    for (const seed of ['a', 'zz', 'loja-do-daniel', '123', 'x'.repeat(80), 'ç~é']) {
      const { brilhoX, angulo } = variacaoDaCapaPadrao(seed);
      expect(brilhoX).toBeGreaterThanOrEqual(20);
      expect(brilhoX).toBeLessThanOrEqual(80);
      expect(angulo).toBeGreaterThanOrEqual(95);
      expect(angulo).toBeLessThanOrEqual(145);
    }
  });
});

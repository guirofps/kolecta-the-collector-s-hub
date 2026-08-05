import { describe, it, expect } from 'vitest';
import {
  PERCENTUAIS_ENTRADA,
  TAG_PRE_VENDA,
  temTagPreVenda,
  removerTagPreVenda,
  aplicarTagPreVenda,
  tituloComPreVenda,
  limiteTitulo,
  calcularEntrada,
  percentualValido,
  normalizarPercentual,
  dadosPreVenda,
  ehPreVenda,
  resumoPreVenda,
} from '@/lib/pre-venda';

describe('percentuais oferecidos', () => {
  it('é exatamente 10/20/30/40/50', () => {
    expect([...PERCENTUAIS_ENTRADA]).toEqual([10, 20, 30, 40, 50]);
  });

  it('não passa de 50%: entrada maior que metade não é sinal, é o item quase todo', () => {
    expect(Math.max(...PERCENTUAIS_ENTRADA)).toBe(50);
  });

  it('recusa qualquer valor fora da lista', () => {
    for (const v of [0, 5, 15, 60, 100, -10, 'muito', null, undefined, NaN]) {
      expect(percentualValido(v)).toBe(false);
    }
  });
});

describe('tag no título', () => {
  it('põe a tag na frente', () => {
    expect(aplicarTagPreVenda('Nissan Skyline GT-R R34')).toBe(
      '[PRÉ-VENDA] Nissan Skyline GT-R R34',
    );
  });

  it('aplicar duas vezes dá o mesmo que aplicar uma', () => {
    const uma = aplicarTagPreVenda('Supra MK4');
    expect(aplicarTagPreVenda(uma)).toBe(uma);
  });

  it('não duplica quando o vendedor já escreveu à mão', () => {
    // Grafias que aparecem de verdade em anúncio de colecionável.
    const escritos = [
      'PRÉ-VENDA Supra MK4',
      'PRE VENDA Supra MK4',
      'pré venda - Supra MK4',
      '[PRE-VENDA] Supra MK4',
      '(Pré-Venda) Supra MK4',
      'PRÉ-VENDA: Supra MK4',
    ];
    for (const t of escritos) {
      expect(aplicarTagPreVenda(t)).toBe('[PRÉ-VENDA] Supra MK4');
    }
  });

  it('reconhece a tag em qualquer grafia', () => {
    expect(temTagPreVenda('[PRÉ-VENDA] Supra')).toBe(true);
    expect(temTagPreVenda('pre venda supra')).toBe(true);
    expect(temTagPreVenda('Supra MK4')).toBe(false);
    expect(temTagPreVenda('')).toBe(false);
    expect(temTagPreVenda(null)).toBe(false);
  });

  it('não confunde palavra parecida no meio do título', () => {
    // "venda" solta, ou pré-venda citada na descrição do item, não conta.
    expect(temTagPreVenda('Supra MK4 em pré-venda no Japão')).toBe(false);
    expect(temTagPreVenda('Lote para venda rápida')).toBe(false);
  });

  it('desligar a pré-venda tira a tag, sem sobrar resto', () => {
    expect(tituloComPreVenda('[PRÉ-VENDA] Supra MK4', false)).toBe('Supra MK4');
    expect(tituloComPreVenda('Supra MK4', true)).toBe('[PRÉ-VENDA] Supra MK4');
  });

  it('ligar e desligar volta ao título original', () => {
    const original = 'Mini GT Nissan Skyline GT-R (R34) 1:64';
    expect(tituloComPreVenda(tituloComPreVenda(original, true), false)).toBe(original);
  });

  it('título vazio não vira só a tag', () => {
    expect(aplicarTagPreVenda('')).toBe('');
    expect(aplicarTagPreVenda(null)).toBe('');
    expect(aplicarTagPreVenda('   ')).toBe('');
  });
});

describe('limite do título', () => {
  it('desconta a tag para o publicado não estourar 80', () => {
    const limite = limiteTitulo(80, true);
    expect(limite).toBe(80 - (TAG_PRE_VENDA.length + 1));

    const titulo = 'x'.repeat(limite);
    expect(aplicarTagPreVenda(titulo).length).toBeLessThanOrEqual(80);
  });

  it('sem pré-venda o limite é o cheio', () => {
    expect(limiteTitulo(80, false)).toBe(80);
  });
});

describe('cálculo da entrada', () => {
  it('o caso que o Guilherme deu: R$ 600 a 50% dá R$ 300', () => {
    const r = calcularEntrada(60000, 50);
    expect(r.entradaEmCentavos).toBe(30000);
    expect(r.restanteEmCentavos).toBe(30000);
  });

  it('30% de R$ 600 é R$ 180, sobrando R$ 420', () => {
    const r = calcularEntrada(60000, 30);
    expect(r.entradaEmCentavos).toBe(18000);
    expect(r.restanteEmCentavos).toBe(42000);
  });

  it('entrada + restante bate com o preço, mesmo com centavo quebrado', () => {
    // 10% de R$ 99,99 é R$ 9,999: arredondar os dois lados separado perderia
    // ou inventaria um centavo.
    for (const preco of [9999, 3333, 1, 7, 12345, 99991]) {
      for (const p of PERCENTUAIS_ENTRADA) {
        const r = calcularEntrada(preco, p);
        expect(r.entradaEmCentavos + r.restanteEmCentavos).toBe(preco);
        expect(r.entradaEmCentavos).toBeGreaterThanOrEqual(0);
        expect(r.restanteEmCentavos).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('a entrada nunca passa da metade do preço', () => {
    for (const preco of [100, 5000, 60000, 999999]) {
      for (const p of PERCENTUAIS_ENTRADA) {
        expect(calcularEntrada(preco, p).entradaEmCentavos).toBeLessThanOrEqual(
          Math.ceil(preco / 2),
        );
      }
    }
  });

  it('preço zerado ou inválido não quebra', () => {
    expect(calcularEntrada(0, 30).entradaEmCentavos).toBe(0);
    expect(calcularEntrada(NaN, 30).entradaEmCentavos).toBe(0);
    expect(calcularEntrada(-500, 30).entradaEmCentavos).toBe(0);
  });
});

describe('percentual vindo do banco', () => {
  it('texto do JSON vira número da lista', () => {
    expect(normalizarPercentual('30')).toBe(30);
    expect(normalizarPercentual(40)).toBe(40);
  });

  it('lixo cai no padrão em vez de virar cobrança errada', () => {
    for (const v of [null, undefined, '', 'abc', 90, 0, -1]) {
      expect(PERCENTUAIS_ENTRADA).toContain(normalizarPercentual(v));
    }
    expect(normalizarPercentual(90)).toBe(30);
  });
});

describe('leitura do anúncio salvo', () => {
  it('grava percentual e valor da entrada', () => {
    expect(dadosPreVenda(60000, 50)).toEqual({
      preVenda: true,
      preVendaPercentual: 50,
      preVendaEntradaEmCentavos: 30000,
    });
  });

  it('anúncio comum não é pré-venda', () => {
    expect(ehPreVenda({})).toBe(false);
    expect(ehPreVenda(null)).toBe(false);
    expect(resumoPreVenda({ brand: 'Mini GT' }, 60000)).toBeNull();
  });

  it('aceita o booleano vindo como texto do JSON', () => {
    expect(ehPreVenda({ preVenda: 'true' })).toBe(true);
  });

  it('preço editado depois de publicar recalcula a entrada', () => {
    // O anúncio foi salvo a R$ 600 (entrada R$ 300). O vendedor subiu para
    // R$ 800: a entrada tem que virar R$ 400, não continuar R$ 300.
    const attrs = { ...dadosPreVenda(60000, 50) } as Record<string, unknown>;
    const r = resumoPreVenda(attrs, 80000);
    expect(r?.entradaEmCentavos).toBe(40000);
    expect(r?.restanteEmCentavos).toBe(40000);
  });

  it('percentual adulterado no banco não vira entrada de 90%', () => {
    const r = resumoPreVenda({ preVenda: true, preVendaPercentual: 90 }, 60000);
    expect(r?.percentual).toBe(30);
    expect(r?.entradaEmCentavos).toBe(18000);
  });
});

import { describe, it, expect } from 'vitest';
import {
  consolidar, avaliarAnuncio, estadoDaReferencia,
  MINIMO_PARA_PUBLICAR, MESES_ATE_REVISAR, MESES_ATE_EXPIRAR,
  type AmostraPreco, type ReferenciaKPV, type ResultadoKPV,
} from '@/lib/kpv-referencia';

/** Atalho: n vendedores distintos, um preço cada. */
const amostras = (precos: number[], fonte: AmostraPreco['fonte'] = 'mercado-livre'): AmostraPreco[] =>
  precos.map((p, i) => ({ precoEmCentavos: p, fonte, vendedorId: `v${i}` }));

// Motivo da recusa, ou null quando publicou. O cast é de propósito: este
// projeto compila sem `strictNullChecks`, e sem ele o TypeScript não estreita
// a união pelo campo `publicavel`.
const motivoDe = (r: ResultadoKPV): string | null =>
  (r as { motivo?: string }).motivo ?? null;

const publicada = (r: ResultadoKPV): ReferenciaKPV => {
  if (!r.publicavel) throw new Error(`esperava publicável, veio: ${motivoDe(r)}`);
  return r as ReferenciaKPV;
};

describe('quando NÃO publicar', () => {
  it('amostra vazia', () => {
    const r = consolidar([]);
    expect(r.publicavel).toBe(false);
  });

  it('menos de 3 vendedores distintos', () => {
    for (const n of [1, 2]) {
      const r = consolidar(amostras(Array(n).fill(5000)));
      expect(r.publicavel, `n=${n}`).toBe(false);
      expect(motivoDe(r)).toMatch(/vendedor/);
    }
    expect(consolidar(amostras([5000, 5100, 5200])).publicavel).toBe(true);
  });

  it('dez anúncios do MESMO vendedor não viram amostra de dez', () => {
    // Loja com estoque grande repetiria a própria opinião dez vezes.
    const r = consolidar(
      Array.from({ length: 10 }, (_, i) => ({
        precoEmCentavos: 5000 + i, fonte: 'mercado-livre' as const, vendedorId: 'mesma-loja',
      })),
    );
    expect(r.publicavel).toBe(false);
    expect(r.amostra).toBe(1);
  });

  it('preço zerado ou inválido não conta', () => {
    const r = consolidar([
      { precoEmCentavos: 0, fonte: 'loja', vendedorId: 'a' },
      { precoEmCentavos: -100, fonte: 'loja', vendedorId: 'b' },
      { precoEmCentavos: NaN, fonte: 'loja', vendedorId: 'c' },
      { precoEmCentavos: 5000, fonte: 'loja', vendedorId: 'd' },
    ]);
    expect(r.publicavel).toBe(false);
    expect(r.amostra).toBe(1);
  });
});

describe('faixas de confiança', () => {
  it('3 a 5 vendedores é confiança baixa', () => {
    for (const n of [3, 4, 5]) {
      const r = publicada(consolidar(amostras(Array.from({ length: n }, (_, i) => 5000 + i * 10))));
      expect(r.confianca, `n=${n}`).toBe('baixa');
    }
  });

  it('6 a 14 é média', () => {
    for (const n of [6, 10, 14]) {
      const r = publicada(consolidar(amostras(Array.from({ length: n }, (_, i) => 5000 + i * 10))));
      expect(r.confianca, `n=${n}`).toBe('media');
    }
  });

  it('15+ chega em alta, mas só com mais de uma fonte', () => {
    const precos = Array.from({ length: 20 }, (_, i) => 5000 + i * 10);
    // Fonte única: trava em média.
    const soML = publicada(consolidar(amostras(precos)));
    expect(soML.confianca).toBe('media');
    expect(soML.ressalvas.join(' ')).toMatch(/uma fonte/);

    // Duas fontes: libera alta.
    const misto = [...amostras(precos.slice(0, 10), 'mercado-livre'),
      ...amostras(precos.slice(10), 'loja').map((a, i) => ({ ...a, vendedorId: `loja${i}` }))];
    expect(publicada(consolidar(misto)).confianca).toBe('alta');
  });

  it('vendedor dominante derruba a confiança alta', () => {
    // 20 vendedores distintos, mas um deles com 30 anúncios.
    const base = amostras(Array.from({ length: 20 }, (_, i) => 5000 + i * 10), 'loja');
    const inflado = [
      ...base,
      ...Array.from({ length: 30 }, () => ({ precoEmCentavos: 5000, fonte: 'ebay' as const, vendedorId: 'gigante' })),
    ];
    const r = publicada(consolidar(inflado));
    expect(r.confianca).not.toBe('alta');
    expect(r.ressalvas.join(' ')).toMatch(/um vendedor responde/);
    expect(r.concentracao).toBeGreaterThan(0.5);
  });
});

describe('remoção de extremos', () => {
  it('tira o preço muito acima, que costuma ser variante não declarada', () => {
    // 12 preços na casa dos R$ 50 e um de R$ 900: o de R$ 900 provavelmente é
    // um chase anunciado sem dizer, e puxaria a referência do comum.
    const precos = [4500, 4700, 4800, 4900, 5000, 5000, 5100, 5200, 5300, 5400, 5500, 90000];
    const r = publicada(consolidar(amostras(precos)));
    expect(r.outliersRemovidos).toContain(90000);
    expect(r.maxEmCentavos).toBeLessThan(90000);
    expect(r.ressalvas.join(' ')).toMatch(/variante não declarada/);
  });

  it('NÃO mexe em amostra pequena', () => {
    // Quartil de 5 números não descreve distribuição. Remover o extremo aí é
    // jogar fora dado real até sobrar o que confirma o esperado.
    const r = publicada(consolidar(amostras([4000, 4500, 5000, 5500, 50000])));
    expect(r.outliersRemovidos).toEqual([]);
    expect(r.maxEmCentavos).toBe(50000);
  });

  it('não deixa a limpeza destruir a amostra', () => {
    const r = publicada(consolidar(amostras([100, 200, 300, 400, 20000, 21000, 22000, 23000])));
    expect(r.amostra).toBeGreaterThanOrEqual(MINIMO_PARA_PUBLICAR);
  });
});

describe('os números da referência', () => {
  it('mediana e faixa saem certas', () => {
    const r = publicada(consolidar(amostras([1000, 2000, 3000, 4000, 5000])));
    expect(r.medianaEmCentavos).toBe(3000);
    expect(r.minEmCentavos).toBe(1000);
    expect(r.maxEmCentavos).toBe(5000);
    expect(r.p25EmCentavos).toBe(2000);
    expect(r.p75EmCentavos).toBe(4000);
  });

  it('a faixa usual não colapsa num ponto só em amostra pequena', () => {
    // O índice truncado que usei no piloto devolvia p25 == p75 aqui.
    const r = publicada(consolidar(amostras([1000, 2000, 3000])));
    expect(r.p75EmCentavos).toBeGreaterThan(r.p25EmCentavos);
  });

  it('conta quantos vendedores cada fonte deu', () => {
    const r = publicada(consolidar([
      ...amostras([1000, 1100, 1200], 'mercado-livre'),
      ...amostras([1300, 1400], 'ebay').map((a, i) => ({ ...a, vendedorId: `e${i}` })),
    ]));
    expect(r.fontes['mercado-livre']).toBe(3);
    expect(r.fontes['ebay']).toBe(2);
  });

  it('chase avisa que amostra pequena é esperada', () => {
    const r = publicada(consolidar(amostras([50000, 55000, 60000]), { variante: 'chase' }));
    expect(r.ressalvas.join(' ')).toMatch(/tiragem baixa/);
  });
});

describe('a nota embaixo do anúncio', () => {
  const ref = publicada(consolidar(amostras([8000, 9000, 10000, 11000, 12000, 13000])));

  it('usa a FAIXA, não a mediana', () => {
    // Comparar com a mediana faria metade dos anúncios honestos virar "acima
    // do mercado", o que é injusto com o vendedor e inútil para o comprador.
    expect(avaliarAnuncio(ref.medianaEmCentavos + 1, ref).nota).toBe('dentro');
    expect(avaliarAnuncio(ref.p25EmCentavos, ref).nota).toBe('dentro');
    expect(avaliarAnuncio(ref.p75EmCentavos, ref).nota).toBe('dentro');
  });

  it('marca fora da faixa nos dois sentidos', () => {
    expect(avaliarAnuncio(ref.p25EmCentavos - 1, ref).nota).toBe('abaixo');
    expect(avaliarAnuncio(ref.p75EmCentavos + 1, ref).nota).toBe('acima');
  });

  it('a diferença percentual é em relação à mediana', () => {
    expect(avaliarAnuncio(ref.medianaEmCentavos * 2, ref).diferencaPercentual).toBe(100);
    expect(avaliarAnuncio(Math.round(ref.medianaEmCentavos / 2), ref).diferencaPercentual).toBe(-50);
  });

  it('tem texto pronto para a tela', () => {
    expect(avaliarAnuncio(1, ref).texto).toMatch(/Abaixo/);
    expect(avaliarAnuncio(999999, ref).texto).toMatch(/Acima/);
  });
});

describe('validade da referência', () => {
  const HOJE = new Date(2026, 7, 5);
  const mesesAtras = (m: number) => new Date(2026, 7 - m, 5).toISOString();

  it('recente é fresca', () => {
    expect(estadoDaReferencia(mesesAtras(0), HOJE)).toBe('fresca');
    expect(estadoDaReferencia(mesesAtras(3), HOJE)).toBe('fresca');
  });

  it(`a partir de ${MESES_ATE_REVISAR} meses pede revisão`, () => {
    expect(estadoDaReferencia(mesesAtras(7), HOJE)).toBe('revisar');
  });

  it(`a partir de ${MESES_ATE_EXPIRAR} meses expira e não é mais exibida`, () => {
    expect(estadoDaReferencia(mesesAtras(13), HOJE)).toBe('expirada');
    expect(estadoDaReferencia(mesesAtras(30), HOJE)).toBe('expirada');
  });

  it('data corrompida vale como expirada, nunca como fresca', () => {
    expect(estadoDaReferencia('qualquer coisa', HOJE)).toBe('expirada');
    expect(estadoDaReferencia('', HOJE)).toBe('expirada');
  });
});

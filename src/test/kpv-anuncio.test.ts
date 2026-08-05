import { describe, it, expect } from 'vitest';
import { gravarKpv, lerKpv, rotuloFonte, explicarConfianca } from '@/lib/kpv-anuncio';
import { consolidar, type AmostraPreco, type ReferenciaKPV } from '@/lib/kpv-referencia';

const HOJE = new Date(2026, 7, 5);
const mesesAtras = (m: number) => new Date(2026, 7 - m, 5).toISOString();

const refDe = (precos: number[], fonte: AmostraPreco['fonte'] = 'mercado-livre'): ReferenciaKPV => {
  const r = consolidar(precos.map((p, i) => ({ precoEmCentavos: p, fonte, vendedorId: `v${i}` })));
  if (!r.publicavel) throw new Error('esperava publicável');
  return r;
};

const gravado = (precos = [8000, 9000, 10000, 11000, 12000, 13000], quando = mesesAtras(1)) =>
  gravarKpv(refDe(precos), quando) as unknown as Record<string, unknown>;

describe('gravar e ler', () => {
  it('o que grava é o que lê de volta', () => {
    const attrs = gravado();
    const lido = lerKpv(attrs, 10500, HOJE)!;
    expect(lido.medianaEmCentavos).toBe(Number(attrs.kpvMedianaEmCentavos));
    expect(lido.p25EmCentavos).toBe(Number(attrs.kpvP25EmCentavos));
    expect(lido.amostra).toBe(6);
    expect(lido.confianca).toBe('media');
  });

  it('convive com os outros atributos do anúncio', () => {
    // `attributes` já carrega marca, escala, pré-venda. O KPV não pode
    // atropelar nada disso.
    const attrs = { brand: 'Mini GT', scale: '1:64', preVenda: true, ...gravado() };
    expect(lerKpv(attrs, 10000, HOJE)).not.toBeNull();
    expect(attrs.brand).toBe('Mini GT');
  });

  it('devolve as fontes com a contagem', () => {
    const ref = consolidar([
      { precoEmCentavos: 1000, fonte: 'mercado-livre', vendedorId: 'a' },
      { precoEmCentavos: 1100, fonte: 'mercado-livre', vendedorId: 'b' },
      { precoEmCentavos: 1200, fonte: 'loja', vendedorId: 'c' },
    ]);
    if (!ref.publicavel) throw new Error('esperava publicável');
    const lido = lerKpv(gravarKpv(ref, mesesAtras(0)) as unknown as Record<string, unknown>, 1100, HOJE)!;
    expect(lido.fontes).toEqual([
      { nome: 'mercado-livre', vendedores: 2 },
      { nome: 'loja', vendedores: 1 },
    ]);
  });
});

describe('quando NÃO exibir', () => {
  it('anúncio sem levantamento', () => {
    expect(lerKpv({}, 10000, HOJE)).toBeNull();
    expect(lerKpv(null, 10000, HOJE)).toBeNull();
    expect(lerKpv({ brand: 'Hot Wheels' }, 10000, HOJE)).toBeNull();
  });

  it('levantamento expirado some da tela', () => {
    // Referência de mais de um ano é pior que nenhuma: o comprador confia nela
    // do mesmo jeito, sem saber que está velha.
    expect(lerKpv(gravado(undefined, mesesAtras(13)), 10000, HOJE)).toBeNull();
  });

  it('entre 6 e 12 meses ainda exibe, mas avisa', () => {
    const lido = lerKpv(gravado(undefined, mesesAtras(8)), 10000, HOJE)!;
    expect(lido.desatualizada).toBe(true);
  });

  it('dado incompleto ou corrompido não vira card', () => {
    const bom = gravado();
    for (const campo of ['kpvMedianaEmCentavos', 'kpvP25EmCentavos', 'kpvP75EmCentavos', 'kpvAmostra', 'kpvApuradoEm']) {
      const quebrado = { ...bom, [campo]: undefined };
      expect(lerKpv(quebrado, 10000, HOJE), campo).toBeNull();
    }
    // Faixa invertida é sinal de dado corrompido.
    expect(lerKpv({ ...bom, kpvP25EmCentavos: 99999 }, 10000, HOJE)).toBeNull();
    // Valor não numérico.
    expect(lerKpv({ ...bom, kpvMedianaEmCentavos: 'muito caro' }, 10000, HOJE)).toBeNull();
    expect(lerKpv({ ...bom, kpvMedianaEmCentavos: 0 }, 10000, HOJE)).toBeNull();
  });

  it('confiança desconhecida cai na mais conservadora', () => {
    const lido = lerKpv({ ...gravado(), kpvConfianca: 'altíssima' }, 10000, HOJE)!;
    expect(lido.confianca).toBe('baixa');
  });
});

describe('a avaliação do anúncio', () => {
  const attrs = gravado();

  it('anúncio sem preço não recebe nota, mas a referência aparece', () => {
    const lido = lerKpv(attrs, null, HOJE)!;
    expect(lido.avaliacao).toBeNull();
    expect(lido.medianaEmCentavos).toBeGreaterThan(0);
  });

  it('nota sai conforme a faixa', () => {
    expect(lerKpv(attrs, 1000, HOJE)!.avaliacao!.nota).toBe('abaixo');
    expect(lerKpv(attrs, 10500, HOJE)!.avaliacao!.nota).toBe('dentro');
    expect(lerKpv(attrs, 99999, HOJE)!.avaliacao!.nota).toBe('acima');
  });
});

describe('texto para a interface', () => {
  it('traduz o nome da fonte (uso interno, não vai para a vitrine)', () => {
    expect(rotuloFonte('mercado-livre')).toBe('Mercado Livre');
    expect(rotuloFonte('ebay')).toBe('eBay');
    expect(rotuloFonte('desconhecida')).toBe('desconhecida');
  });

  it('explica a confiança em vez de só rotular', () => {
    expect(explicarConfianca('baixa', 3)).toMatch(/amostra pequena/);
    expect(explicarConfianca('alta', 20)).toMatch(/mais de uma plataforma/);
    expect(explicarConfianca('media', 1)).toMatch(/1 vendedor\b/);
    expect(explicarConfianca('media', 8)).toMatch(/8 vendedores/);
  });

  it('deixa claro que a contagem é DO MERCADO, não da Kolecta', () => {
    // "62 anúncios de vendedores diferentes", sozinho, dá a entender que são
    // vendedores daqui. Tem que dizer de onde vem, sem citar concorrente.
    for (const c of ['baixa', 'media', 'alta'] as const) {
      expect(explicarConfianca(c, 12), c).toMatch(/no mercado/);
    }
  });

  it('nunca nomeia a plataforma de onde o preço veio', () => {
    for (const c of ['baixa', 'media', 'alta'] as const) {
      expect(explicarConfianca(c, 12), c).not.toMatch(/mercado livre|ebay|amazon|shopee/i);
    }
  });
});

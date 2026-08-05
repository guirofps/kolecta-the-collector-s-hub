import { describe, it, expect } from 'vitest';
import {
  LINHA_OUTRA, LINHAS_POR_MARCA, linhasDaMarca, normalizarLinha, linhaParaSalvar,
} from '@/lib/linhas';

// Os valores abaixo saíram do campo livre de linha, no catálogo de produção.

describe('grafias reais do banco', () => {
  const casos: [string, string, string][] = [
    // [linha crua, marca, esperado]
    ['Mainline', 'Hot Wheels', 'Mainline'],
    ['mainline', 'Hot Wheels', 'Mainline'],
    ['MAILINE', 'Hot Wheels', 'Mainline'],
    ['Premium', 'Hot Wheels', 'Premium'],
    ['Hot Wheels Premium ', 'Hot Wheels', 'Premium'],
    ['Hot wheels Premium ', 'Hot Wheels', 'Premium'],
    ['RLC', 'Hot Wheels', 'Red Line Club'],
    ['Red Line Club', 'Hot Wheels', 'Red Line Club'],
    ['FAST E FURIOUS ', 'Hot Wheels', 'Fast & Furious'],
    ['Fast & Furious', 'Hot Wheels', 'Fast & Furious'],
    ['Velozes e furiosos ', 'Hot Wheels', 'Fast & Furious'],
    ['F1', 'Hot Wheels', 'Formula 1'],
    ['Car Culture', 'Hot Wheels', 'Car Culture'],
    ['LBWK', 'Mini GT', 'LB-Works'],
    ['LB-Works', 'Mini GT', 'LB-Works'],
    ['SUPER GT SERIES', 'Mini GT', 'Super GT Series'],
    ['Global 64', 'Tarmac Works', 'Global64'],
    ['Coca cola', 'M2 Machines', 'Coca-Cola'],
  ];

  for (const [bruto, marca, esperado] of casos) {
    it(`"${bruto}" (${marca}) vira "${esperado}"`, () => {
      expect(normalizarLinha(bruto, marca).linha).toBe(esperado);
    });
  }

  it('linha já certa é marcada como exata', () => {
    expect(normalizarLinha('Mainline', 'Hot Wheels').origem).toBe('exata');
  });

  it('espaço sobrando conta como corrigida, não exata', () => {
    // O banco guarda a string crua: "Premium " e "Premium" são valores
    // diferentes e quebram agrupamento igual quebravam na marca.
    expect(normalizarLinha('Premium ', 'Hot Wheels').origem).toBe('corrigida');
  });
});

describe('linha dentro de texto maior — fica com a mais específica', () => {
  it('"Premium Car Culture" vira Car Culture', () => {
    // Car Culture é sub-linha de Premium. A mais específica é a que o mercado
    // usa para diferenciar preço.
    const r = normalizarLinha('Premium Car Culture', 'Hot Wheels');
    expect(r.linha).toBe('Car Culture');
    expect(r.origem).toBe('extraida');
  });

  it('"Mainline - HW Dream Garage" vira HW Dream Garage', () => {
    expect(normalizarLinha('Mainline - HW Dream Garage', 'Hot Wheels').linha).toBe('HW Dream Garage');
  });

  it('"Premium - Fast Furious" vira Fast & Furious', () => {
    expect(normalizarLinha('Premium - Fast Furious', 'Hot Wheels').linha).toBe('Fast & Furious');
  });

  it('"FAST E FURIOUS 25 YEARS" vira Fast & Furious', () => {
    expect(normalizarLinha('FAST E FURIOUS 25 YEARS', 'Hot Wheels').linha).toBe('Fast & Furious');
  });

  it('"Mainline - Ferrari" cai em Mainline, porque Ferrari não é linha', () => {
    expect(normalizarLinha('Mainline - Ferrari', 'Hot Wheels').linha).toBe('Mainline');
  });
});

describe('o que NÃO é linha', () => {
  it('a montadora do carro não vira linha', () => {
    // Foi o caso que partiu o Ferrari 365 GTB4 em dois grupos de preço.
    const r = normalizarLinha('FERRARI', 'Hot Wheels');
    expect(r.linha).toBeNull();
    expect(r.origem).toBe('montadora');
  });

  it('a marca sozinha não vira linha', () => {
    for (const [bruto, marca] of [['MINI GT', 'Mini GT'], ['Hot Wheels', 'Hot Wheels'], ['tarmac Works', 'Tarmac Works']] as const) {
      const r = normalizarLinha(bruto, marca);
      expect(r.linha, bruto).toBeNull();
      expect(r.origem, bruto).toBe('marca');
    }
  });

  it('variante não é linha: ela tem campo próprio', () => {
    // "Chase" estava cadastrado como LINHA num Kaido House. Deixar passar
    // duplicaria a informação e separaria chase de regular por fora da
    // identidade do KPV.
    for (const v of ['Chase', 'chase', 'Treasure Hunt', 'STH', 'T-Hunt']) {
      const r = normalizarLinha(v, 'Kaido House');
      expect(r.linha, v).toBeNull();
      expect(r.origem, v).toBe('variante');
    }
  });

  it('vazio não quebra', () => {
    expect(normalizarLinha('', 'Hot Wheels').origem).toBe('vazia');
    expect(normalizarLinha(null, 'Hot Wheels').linha).toBeNull();
    expect(normalizarLinha(undefined, null).linha).toBeNull();
  });
});

describe('linha desconhecida é PRESERVADA', () => {
  it('série que a lista não previu sobrevive, só aparada', () => {
    // Colaboração e exclusivo de evento aparecem o tempo todo. Apagar seria
    // pior que a grafia torta.
    const r = normalizarLinha('  Mooneyes  ', 'Tarmac Works');
    expect(r.linha).toBe('Mooneyes');
    expect(r.origem).toBe('livre');
  });

  it('exclusivo de evento sobrevive', () => {
    expect(normalizarLinha('KAIDO RACING / SALÃO DIECAST', 'Kaido House').linha)
      .toBe('KAIDO RACING / SALÃO DIECAST');
  });

  it('marca sem sugestão ainda normaliza pelo catálogo geral', () => {
    // "Kaido House" é série que atravessa fabricante.
    expect(normalizarLinha('Kaido House', 'Welly').linha).toBe('Kaido House');
  });
});

describe('lista oferecida no formulário', () => {
  it('"Outra" é sempre a última opção', () => {
    for (const m of ['Hot Wheels', 'Mini GT', 'Matchbox', 'Marca Desconhecida']) {
      const l = linhasDaMarca(m);
      expect(l[l.length - 1], m).toBe(LINHA_OUTRA);
    }
  });

  it('a lista muda conforme a marca', () => {
    expect(linhasDaMarca('Hot Wheels')).toContain('Car Culture');
    expect(linhasDaMarca('Hot Wheels')).not.toContain('QubeCarz');
    expect(linhasDaMarca('Mini GT')).toContain('QubeCarz');
  });

  it('marca sem lista própria oferece só "Outra"', () => {
    expect(linhasDaMarca('Welly')).toEqual([LINHA_OUTRA]);
  });

  it('nenhuma marca tem linha repetida', () => {
    for (const [m, ls] of Object.entries(LINHAS_POR_MARCA)) {
      expect(new Set(ls).size, m).toBe(ls.length);
    }
  });

  it('toda linha sugerida se normaliza para ela mesma', () => {
    for (const [marca, ls] of Object.entries(LINHAS_POR_MARCA)) {
      for (const l of ls) {
        expect(normalizarLinha(l, marca).linha, `${marca}/${l}`).toBe(l);
      }
    }
  });
});

describe('linhaParaSalvar', () => {
  it('normaliza na gravação', () => {
    expect(linhaParaSalvar('MAILINE', 'Hot Wheels')).toBe('Mainline');
    expect(linhaParaSalvar('Hot Wheels Premium ', 'Hot Wheels')).toBe('Premium');
  });

  it('o que não é linha vira undefined, e some do campo', () => {
    expect(linhaParaSalvar('FERRARI', 'Hot Wheels')).toBeUndefined();
    expect(linhaParaSalvar('Chase', 'Kaido House')).toBeUndefined();
    expect(linhaParaSalvar('', 'Hot Wheels')).toBeUndefined();
  });
});

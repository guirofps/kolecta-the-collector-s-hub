import { describe, it, expect } from 'vitest';
import {
  normalizarMarca, normalizarEscala, MARCAS_MINIATURA,
} from '@/lib/marcas';

// Os casos abaixo saíram do catálogo de produção: são as grafias que de fato
// entraram pelo campo livre do wizard.

describe('normalizarMarca — grafias reais do banco', () => {
  const casos: [string, string][] = [
    ['Hot Wheels', 'Hot Wheels'],
    ['Hotweels ', 'Hot Wheels'],
    ['Hotweels', 'Hot Wheels'],
    ['Hot Wheels ', 'Hot Wheels'],
    ['Hot wheels', 'Hot Wheels'],
    ['hot wheels', 'Hot Wheels'],
    ['HOTWHEELS', 'Hot Wheels'],
    ['HotWheels', 'Hot Wheels'],
    ['Hot Whells', 'Hot Wheels'],
    ['HOT WELLS ', 'Hot Wheels'],
    ['Hot wells ', 'Hot Wheels'],
    ['MINIGT', 'Mini GT'],
    ['Mini Gt', 'Mini GT'],
    ['MiniGT', 'Mini GT'],
    ['Minigt', 'Mini GT'],
    ['MIni GT', 'Mini GT'],
    ['Burago', 'Bburago'],
    ['Tarmac', 'Tarmac Works'],
    ['Tarmak Workserie', 'Tarmac Works'],
    ['matchbox', 'Matchbox'],
    ['MATCH BOX ', 'Matchbox'],
    ['M2', 'M2 Machines'],
    ['Timemicro ', 'Time Micro'],
    ['INNO64', 'Inno64'],
    ['ROBERT DESIGN', 'Robert Design'],
    ['pop race', 'Pop Race'],
    ['IXO Model', 'IXO Models'],
    ['BBR', 'BBR Models'],
  ];

  for (const [bruto, esperado] of casos) {
    it(`"${bruto}" vira "${esperado}"`, () => {
      expect(normalizarMarca(bruto).marca).toBe(esperado);
    });
  }

  it('marca já correta é marcada como exata', () => {
    expect(normalizarMarca('Hot Wheels').origem).toBe('exata');
  });

  it('espaço sobrando conta como CORRIGIDA, não como exata', () => {
    // O banco guarda a string crua: "Hot Wheels " e "Hot Wheels" são valores
    // diferentes e quebram agrupamento, filtro e comparação de preço.
    for (const bruto of ['Hot Wheels ', ' Hot Wheels', 'Kaido House ', 'Pop Race ']) {
      expect(normalizarMarca(bruto).origem).toBe('corrigida');
    }
    expect(normalizarMarca('Hot Wheels ').marca).toBe('Hot Wheels');
  });

  it('grafia torta é marcada como corrigida', () => {
    expect(normalizarMarca('Hotweels').origem).toBe('corrigida');
  });
});

describe('normalizarMarca — título inteiro colado no campo', () => {
  it('extrai a marca do começo do título', () => {
    const r = normalizarMarca('MSZ PORSCHE 911 GT2 RS AMARELO');
    expect(r.marca).toBe('MSZ');
    expect(r.origem).toBe('extraida');
  });

  it('funciona com título longo de Mini GT', () => {
    expect(
      normalizarMarca('Mini Gt Toyota Gr Supra #1103 Lb*works 1:64 Vermelho').marca,
    ).toBe('Mini GT');
  });

  it('funciona quando a marca vem por apelido no começo', () => {
    expect(normalizarMarca('Hot Wheels - 94 NSX Honda').marca).toBe('Hot Wheels');
  });
});

describe('normalizarMarca — colaborações', () => {
  it('fica com a primeira marca citada', () => {
    expect(normalizarMarca('Mini GT x Kaido House ').marca).toBe('Mini GT');
    expect(normalizarMarca('Kaido House X Mini GT').marca).toBe('Kaido House');
  });

  it('resolve colaboração com marca fora da lista na segunda posição', () => {
    expect(normalizarMarca('Kaido House x Tamiya ').marca).toBe('Kaido House');
  });
});

describe('normalizarMarca — o que NÃO pode ser adivinhado', () => {
  it('montadora de carro vai para revisão, sem chutar fabricante', () => {
    for (const m of ['Ferrari', 'Honda', 'Chevrolet', 'Nissan ', 'Mazda']) {
      const r = normalizarMarca(m);
      expect(r.marca).toBeNull();
      expect(r.origem).toBe('montadora');
    }
  });

  it('marca desconhecida volta nula em vez de virar palpite', () => {
    const r = normalizarMarca('Marca Que Nao Existe');
    expect(r.marca).toBeNull();
    expect(r.origem).toBe('desconhecida');
  });

  it('vazio não quebra', () => {
    expect(normalizarMarca('').marca).toBeNull();
    expect(normalizarMarca(null).marca).toBeNull();
    expect(normalizarMarca(undefined).marca).toBeNull();
  });
});

describe('lista de marcas', () => {
  it('"Outra" é sempre a última opção', () => {
    expect(MARCAS_MINIATURA[MARCAS_MINIATURA.length - 1]).toBe('Outra');
  });

  it('não tem marca repetida', () => {
    expect(new Set(MARCAS_MINIATURA).size).toBe(MARCAS_MINIATURA.length);
  });

  it('toda marca da lista se normaliza para ela mesma', () => {
    for (const m of MARCAS_MINIATURA) {
      if (m === 'Outra') continue;
      expect(normalizarMarca(m).marca).toBe(m);
    }
  });
});

describe('normalizarEscala', () => {
  it('aceita a barra que aparece no banco', () => {
    expect(normalizarEscala('1/64')).toBe('1:64');
  });

  it('aceita espaço sobrando e traço', () => {
    expect(normalizarEscala(' 1:18 ')).toBe('1:18');
    expect(normalizarEscala('1-43')).toBe('1:43');
  });

  it('escala fora do padrão volta nula', () => {
    expect(normalizarEscala('1:9999')).toBeNull();
    expect(normalizarEscala('')).toBeNull();
  });

  it('"Outra" é aceita', () => {
    expect(normalizarEscala('outra')).toBe('Outra');
  });
});

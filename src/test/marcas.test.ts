import { describe, it, expect } from 'vitest';
import {
  normalizarMarca, normalizarEscala, MARCAS_MINIATURA,
  marcaNoTexto, normalizarMarcaDoAnuncio, marcaParaSalvar, escalaParaSalvar,
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

describe('marcaNoTexto', () => {
  it('acha a marca no meio de um título', () => {
    expect(marcaNoTexto('Hot Wheels Premium - La Ferrari 1:64')).toBe('Hot Wheels');
  });

  it('fica com a que aparece primeiro', () => {
    expect(marcaNoTexto('Mini GT Kaido House Datsun')).toBe('Mini GT');
    expect(marcaNoTexto('Kaido House x Mini GT Datsun')).toBe('Kaido House');
  });

  it('texto sem marca conhecida volta nulo', () => {
    expect(marcaNoTexto('Carrinho vermelho bonito')).toBeNull();
    expect(marcaNoTexto('')).toBeNull();
    expect(marcaNoTexto(null)).toBeNull();
  });
});

describe('normalizarMarcaDoAnuncio — o campo com montadora, o título com o fabricante', () => {
  // Casos reais que sobraram no catálogo depois da normalização.
  const casos: [string, string, string][] = [
    ['Ferrari', 'Hot Wheels Premium - La Ferrari 1:64', 'Hot Wheels'],
    ['Chevrolet', 'Hot wheels Premium - Fast & Furious - Chevy Custom 1967', 'Hot Wheels'],
    ['Alfa romeo', 'Hot Wheels Premium - Alfa Romeo GTV6 - CHASE - 1:64', 'Hot Wheels'],
    ['Honda', 'Hot Wheels Premium - Honda Civic Dupla', 'Hot Wheels'],
    ['Nissan', 'Hot Wheels Premium - Nissan Skyline GT-R (R32) Pandem', 'Hot Wheels'],
    ['Bugatti', 'Hot Wheels Premium - Bugatti Bolide - 1:64', 'Hot Wheels'],
    ['Mazda', 'Hot Wheels Premium - Fast & Furious - Mazda Rx-7 FD', 'Hot Wheels'],
    ['Mercedes-benz', 'Hot Wheels Premium - Fast & Furious - Mercedes-benz 500', 'Hot Wheels'],
  ];

  for (const [marca, titulo, esperado] of casos) {
    it(`campo "${marca}" + título vira ${esperado}`, () => {
      expect(normalizarMarcaDoAnuncio(marca, titulo).marca).toBe(esperado);
    });
  }

  it('o campo continua mandando quando ele já resolve', () => {
    // Título citando outra marca não pode sobrepor um campo correto.
    const r = normalizarMarcaDoAnuncio('Mini GT', 'Hot Wheels parecido com Mini GT');
    expect(r.marca).toBe('Mini GT');
    expect(r.origem).toBe('exata');
  });

  it('sem marca no campo nem no título, continua para revisão', () => {
    const r = normalizarMarcaDoAnuncio('Ferrari', 'Carrinho Shell Ferrari Escala 1/41 Kit Original');
    expect(r.marca).toBeNull();
    expect(r.origem).toBe('montadora');
  });
});

describe('marcaParaSalvar — a trava na hora de gravar', () => {
  it('conserta as duas grafias que vazaram DEPOIS do seletor subir', () => {
    // Casos reais: "Mini Gt" sobreviveu a uma edição, "Hotwheels " entrou por
    // um caminho de criação que não passa pelo seletor.
    expect(marcaParaSalvar('Mini Gt')).toBe('Mini GT');
    expect(marcaParaSalvar('Hotwheels ')).toBe('Hot Wheels');
  });

  it('usa o título quando o campo tem a montadora do carro', () => {
    expect(marcaParaSalvar('Nissan', 'Hot Wheels Premium - Skyline GT-R')).toBe('Hot Wheels');
  });

  it('marca fora da lista é PRESERVADA, só aparada', () => {
    // Apagar marca pequena de verdade seria pior do que a grafia torta.
    expect(marcaParaSalvar('  Fabricante Novo  ')).toBe('Fabricante Novo');
  });

  it('vazio vira undefined, para o payload não mandar string vazia', () => {
    expect(marcaParaSalvar('')).toBeUndefined();
    expect(marcaParaSalvar('   ')).toBeUndefined();
    expect(marcaParaSalvar(null)).toBeUndefined();
  });

  it('montadora sozinha, sem título que ajude, é preservada para revisão', () => {
    expect(marcaParaSalvar('FERRARI')).toBe('FERRARI');
  });
});

describe('escalaParaSalvar', () => {
  it('padroniza a barra e o espaço', () => {
    expect(escalaParaSalvar('1/64')).toBe('1:64');
    expect(escalaParaSalvar(' 1:18 ')).toBe('1:18');
  });

  it('escala fora do padrão é preservada aparada', () => {
    expect(escalaParaSalvar(' 1:41 ')).toBe('1:41');
  });

  it('vazio vira undefined', () => {
    expect(escalaParaSalvar('')).toBeUndefined();
    expect(escalaParaSalvar(null)).toBeUndefined();
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

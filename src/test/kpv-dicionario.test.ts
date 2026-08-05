import { describe, it, expect } from 'vitest';
import {
  eanValido, normalizarEan, dividirCSV, lerDicionario,
  numeroDeColecao, casarNoDicionario, type EntradaDicionario,
} from '@/lib/kpv-dicionario';

describe('EAN: validar antes de gastar consulta', () => {
  it('aceita os códigos reais da planilha', () => {
    // 810152148402 é o do Mini GT #902. Foi consultado no catálogo do Mercado
    // Livre e devolveu exatamente um produto, com GTIN confirmado.
    expect(eanValido('810152148402')).toBe(true);
    expect(eanValido('0810152148402')).toBe(true);
  });

  it('recusa código com dígito verificador errado', () => {
    // EAN com dígito errado não existe em catálogo nenhum. Consultar é gastar
    // chamada para receber zero, e pior, concluir que a peça não existe
    // quando o errado era o código.
    expect(eanValido('810152148403')).toBe(false);
    expect(eanValido('810152148401')).toBe(false);
  });

  it('recusa o que nem é código', () => {
    for (const v of ['', null, undefined, 'abc', '123', '12345678901234567']) {
      expect(eanValido(v), String(v)).toBe(false);
    }
  });

  it('normaliza para 13 dígitos, ou devolve vazio', () => {
    expect(normalizarEan('810152148402')).toBe('0810152148402');
    expect(normalizarEan('  810152148402  ')).toBe('0810152148402');
    expect(normalizarEan('810152148403')).toBe('');
    expect(normalizarEan(null)).toBe('');
  });
});

describe('CSV com campo bagunçado', () => {
  it('respeita ponto e vírgula DENTRO de aspas', () => {
    // A descrição dos produtos tem ponto e vírgula. Um split ingênuo
    // desalinha todas as colunas a partir dali.
    const linhas = dividirCSV('a;b;c\n"tem ; dentro";2;3');
    expect(linhas[1]).toEqual(['tem ; dentro', '2', '3']);
  });

  it('respeita quebra de linha DENTRO de aspas', () => {
    // É o que transformava 577 produtos em 3.600 linhas quebradas.
    const linhas = dividirCSV('Nome;Preco\n"Linha um\nLinha dois";100');
    expect(linhas).toHaveLength(2);
    expect(linhas[1][0]).toBe('Linha um\nLinha dois');
    expect(linhas[1][1]).toBe('100');
  });

  it('entende aspas escapadas', () => {
    expect(dividirCSV('a\n"diz ""oi"" aqui"')[1][0]).toBe('diz "oi" aqui');
  });

  it('texto vazio não quebra', () => {
    expect(dividirCSV('')).toEqual([]);
  });
});

describe('montar o dicionário', () => {
  const CSV = [
    'Identificador URL;Nome;Categorias;Preço;SKU;Código de barras;Marca',
    'mini-gt-902;MINI GT 1:64 007 BMW 750IL #902;Mini GT;137.00;MGT00902-007E;810152148402;MINI GT',
    'tarmac-fuso;TARMAC 1:64 COCA-COLA MITSUBISHI FUSO;Tarmac;299.00;T64T-TL001-CC;;Tarmac Works',
    'hw-delsol;HOT WHEELS FAST FURIOUS 1994 HONDA DEL SOL;Hot Wheels;49.00;JHW63;999999999999;HOT WHEELS',
  ].join('\n');

  it('lê nome, sku, ean e marca', () => {
    const d = lerDicionario(CSV);
    expect(d).toHaveLength(3);
    expect(d[0].nome).toContain('BMW 750IL');
    expect(d[0].sku).toBe('MGT00902-007E');
    expect(d[0].ean).toBe('0810152148402');
    expect(d[0].marca).toBe('MINI GT');
  });

  it('produto sem EAN entra mesmo assim, com o campo vazio', () => {
    // O SKU ainda serve para conferir um candidato achado por nome.
    const d = lerDicionario(CSV);
    expect(d[1].ean).toBe('');
    expect(d[1].sku).toBe('T64T-TL001-CC');
  });

  it('EAN inválido vira vazio em vez de virar consulta perdida', () => {
    expect(lerDicionario(CSV)[2].ean).toBe('');
  });

  it('CSV vazio ou sem a coluna Nome devolve lista vazia', () => {
    expect(lerDicionario('')).toEqual([]);
    expect(lerDicionario('Outra;Coluna\n1;2')).toEqual([]);
  });
});

describe('número de coleção', () => {
  it('acha no SKU e no título', () => {
    expect(numeroDeColecao('MGT00902-007E')).toBe('902');
    expect(numeroDeColecao('KHMG112 Datsun')).toBe('112');
  });

  it('zero à esquerda some, para as duas grafias casarem entre si', () => {
    // O nosso anúncio escreve "#0613" e a planilha escreve "MGT00613". Sem
    // tirar o zero, o mesmo carro viraria dois números diferentes e o
    // casamento por número nunca aconteceria.
    expect(numeroDeColecao('Mini GT Ford GT Triple Yellow #0613')).toBe('613');
    expect(numeroDeColecao('MGT00613-BL')).toBe('613');
    expect(numeroDeColecao('#0613')).toBe(numeroDeColecao('MGT00613'));
  });

  it('não confunde número de corrida de dois dígitos', () => {
    expect(numeroDeColecao('Acura NSX GT3 #93 IMSA Daytona')).toBeNull();
  });

  it('texto sem número volta nulo', () => {
    expect(numeroDeColecao('Hot Wheels Ferrari')).toBeNull();
    expect(numeroDeColecao(null)).toBeNull();
  });
});

describe('casar anúncio nosso com a planilha', () => {
  const DICIONARIO: EntradaDicionario[] = [
    { nome: 'MINI GT 1:64 007 BMW 750IL TOMORROW NEVER DIES #902', sku: 'MGT00902-007E', ean: '0810152148402', marca: 'MINI GT' },
    { nome: 'MINI GT NISSAN LB-ER34 SUPER SILHOUETTE SKYLINE BLACK', sku: 'MGT00844-BL', ean: '0810152140840', marca: 'MINI GT' },
    { nome: 'TARMAC 1:64 COCA-COLA MITSUBISHI FUSO SUPER GREAT', sku: 'T64T-TL001-CC', ean: '', marca: 'Tarmac Works' },
    { nome: 'HOT WHEELS FAST & FURIOUS 1994 HONDA DEL SOL', sku: 'JHW63', ean: '', marca: 'HOT WHEELS' },
  ];

  it('casa pelo número de coleção mesmo com título bem diferente', () => {
    const c = casarNoDicionario('Mini Gt BMW 750iL James Bond 007 #902', DICIONARIO)!;
    expect(c.entrada.sku).toBe('MGT00902-007E');
    expect(c.por).toBe('numero');
  });

  it('casa por semelhança de nome quando não há número', () => {
    const c = casarNoDicionario('Tarmac Works Coca Cola Mitsubishi Fuso Super Great', DICIONARIO)!;
    expect(c.entrada.sku).toBe('T64T-TL001-CC');
    expect(c.por).toBe('nome');
  });

  it('a MARCA sozinha nunca casa duas peças diferentes', () => {
    // O bug que contaminou 231 de 349 peças numa rodada real: "hot" e "wheels"
    // não estavam no ruído, então "Hot Wheels BMW M4" casava com qualquer
    // "HOT WHEELS <nome curto>". Quarenta e cinco carros distintos apontaram
    // todos para uma Barbie, e receberam o EAN dela.
    const barbie: EntradaDicionario[] = [
      { nome: 'HOT WHEELS BARBIE EXTRA', sku: 'HWB01', ean: '0027084120134', marca: 'HOT WHEELS' },
      { nome: 'MATTEL BRANCA DE NEVE', sku: 'MTL02', ean: '0074299057854', marca: 'MATTEL' },
    ];
    for (const t of [
      'Hot Wheels - BMW M4 GT3',
      'Hot Wheels TOYOTA SR5 - RLC',
      'Hot Wheels Elite 64 Porsche 911 GT2 EVO 993',
      'Hot Wheels Audi 90 Quattro',
      'Hot Wheels Porsche 911 Carrera RS 2.7',
    ]) {
      expect(casarNoDicionario(t, barbie), t).toBeNull();
    }
  });

  it('uma palavra em comum não basta', () => {
    // "Porsche" sozinho aparece em dezenas de peças diferentes.
    const d: EntradaDicionario[] = [
      { nome: 'HOT WHEELS PORSCHE 917 LH', sku: 'X1', ean: '0027084120134', marca: 'HOT WHEELS' },
    ];
    expect(casarNoDicionario('Hot Wheels Porsche 356 Outlaw', d)).toBeNull();
    // Duas em comum, aí sim.
    expect(casarNoDicionario('Hot Wheels Porsche 917 azul', d)).not.toBeNull();
  });

  it('NÃO casa quando a semelhança é fraca', () => {
    // Casar errado aqui é pior que não casar: o EAN errado leva ao produto
    // errado, e dessa vez com cara de certeza absoluta porque veio de código.
    expect(casarNoDicionario('Hot Wheels Porsche 911 Carrera', DICIONARIO)).toBeNull();
    expect(casarNoDicionario('Kaido House Datsun 510 Wagon', DICIONARIO)).toBeNull();
  });

  it('número igual de marca diferente não engana', () => {
    // Numeração de coleção se repete entre fabricantes, então o número só vale
    // quando o nome tem alguma relação.
    expect(casarNoDicionario('Tomica Toyota Supra #902', DICIONARIO)).toBeNull();
  });

  it('título vazio ou dicionário vazio não quebram', () => {
    expect(casarNoDicionario('', DICIONARIO)).toBeNull();
    expect(casarNoDicionario(null, DICIONARIO)).toBeNull();
    expect(casarNoDicionario('Mini GT BMW 750iL #902', [])).toBeNull();
  });

  it('o EAN casado é o que vai para a consulta', () => {
    const c = casarNoDicionario('Mini GT Nissan LB-ER34 Super Silhouette Skyline', DICIONARIO)!;
    expect(c.entrada.ean).toBe('0810152140840');
    expect(eanValido(c.entrada.ean)).toBe(true);
  });
});

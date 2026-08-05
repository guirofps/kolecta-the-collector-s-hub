import { describe, it, expect } from 'vitest';
import {
  detectarVariante, ehLote, ehFranquia, extrairCodigo, linhaNoTitulo,
  extrairModelo, motivoNaoComparavel, identidadeDe, mesmaPeca, agruparPorPeca,
  CONDICAO_BASE,
} from '@/lib/kpv-identidade';

// Todos os títulos abaixo saíram do catálogo de produção.

const novo = (title: string, brand: string, extra: Record<string, string> = {}) => ({
  title, brand, condition: CONDICAO_BASE, scale: '1:64', ...extra,
});

describe('variante — o que nunca pode ser misturado', () => {
  it('Super Treasure Hunt não vira Treasure Hunt comum', () => {
    // "Super T Hunt" é como aparece de verdade no anúncio. Se o super cair na
    // amostra do TH comum, a referência dos dois sai errada.
    expect(detectarVariante('Hotwheels Subaru Impreza WRX Super T Hunt')).toBe('super-treasure-hunt');
    expect(detectarVariante('Hot Wheels Civic Super Treasure Hunt')).toBe('super-treasure-hunt');
    expect(detectarVariante('Hot Wheels Civic STH')).toBe('super-treasure-hunt');
  });

  it('reconhece Treasure Hunt comum', () => {
    expect(detectarVariante('Hot Wheels Skyline Treasure Hunt')).toBe('treasure-hunt');
    expect(detectarVariante('Hot Wheels Skyline T-Hunt')).toBe('treasure-hunt');
  });

  it('reconhece chase', () => {
    expect(detectarVariante('Hot Wheels Premium - Alfa Romeo GTV6 - CHASE - 1:64')).toBe('chase');
  });

  it('sem marcação é regular', () => {
    expect(detectarVariante('Hot Wheels Premium - Nissan Skyline GT-R (R32) Pandem')).toBe('regular');
    expect(detectarVariante('')).toBe('regular');
    expect(detectarVariante(null)).toBe('regular');
  });

  it('"5th" não vira Treasure Hunt', () => {
    expect(detectarVariante('Hot Wheels 5th Anniversary Camaro')).toBe('regular');
  });
});

describe('variante declarada na descrição', () => {
  // Trechos copiados das descrições reais do catálogo. Parte dos vendedores só
  // declara a variante fora do título.
  it('pega a declaração que só existe na descrição', () => {
    expect(detectarVariante(
      'Hot Wheels 1995 Mazda RX7 Velozes e Furiosos 25 Anos',
      '1995 Mazda RX-7 Chase – Velozes e Furiosos | Hot Wheels Premium',
    )).toBe('chase');

    expect(detectarVariante(
      'Hot Wheels Total Disposal',
      'Hot Wheels Total Disposal - Treasure Hunt - Mainline',
    )).toBe('treasure-hunt');
  });

  it('NÃO lê ressalva como declaração', () => {
    // O erro que inverteria o sentido da frase e inflaria o preço de uma peça
    // comum. Estes quatro são descrições reais de anúncios que NÃO são chase.
    const ressalvas = [
      '* Possibilidade de versão Chase distribuída aleatoriamente pelo fabricante',
      '* Não possui versão Chase',
      'Peça nova, caixa aberta para verificar se era Chase.',
      'Kaido House 121. Aberto só para ver se era Chase.',
    ];
    for (const d of ressalvas) {
      expect(detectarVariante('Kaido House Datsun Wagon', d), d).toBe('regular');
    }
  });

  it('o título continua mandando sobre a descrição', () => {
    expect(detectarVariante(
      'Hot Wheels Civic CHASE',
      'Não possui versão Chase',
    )).toBe('chase');
  });

  it('descrição vazia não quebra', () => {
    expect(detectarVariante('Hot Wheels Civic', '')).toBe('regular');
    expect(detectarVariante('Hot Wheels Civic', null)).toBe('regular');
  });
});

describe('lote e franquia — o que sai da comparação', () => {
  it('pega lote, pack, set e conjunto', () => {
    for (const t of [
      '3 MINIS JURRASC WORLD MATCHBOX',
      'Hot Wheels Pack Five Hw Motor Show 2025',
      'Set Hotwheels Premium Series Aeros styles',
      'Hot Wheels Formula 1 Pack Com 5 Conjunto',
      'Lote 10 carrinhos Hot Wheels',
      'Pack 5 Hot Wheels Velozes E Furiosos',
      // "lot" em inglês passou batido no piloto e casou um lote de 3 com um
      // carro avulso, dando -100% de diferença.
      'Hot Wheels LOT 3 (Porsche 356A Outlaw, Porsche Taycan Turbo S)',
      'Hot Wheels 5 pcs Ferrari',
    ]) {
      expect(ehLote(t), t).toBe(true);
    }
  });

  it('peça única não é confundida com lote', () => {
    for (const t of [
      'Mini GT Ford GT Triple Yellow #0613',
      'Hot Wheels Premium - Nissan Skyline GT-R (R32) Pandem',
    ]) {
      expect(ehLote(t), t).toBe(false);
    }
  });

  it('pega veículo de franquia, que tem mercado próprio', () => {
    for (const t of [
      'Nave Milano Guardiões da Galáxia',
      'Star Trek U.S.S. Enterprise',
      'Batplane 2020',
      'X-Jet X-Men',
      'Hot Wheels - Standard Kart Mario Kart',
      'Hot Wheels Snoopy Dog',
    ]) {
      expect(ehFranquia(t), t).toBe(true);
    }
  });

  it('carro de rua não é franquia', () => {
    expect(ehFranquia('Hot Wheels Premium - Honda Civic Dupla')).toBe(false);
  });
});

describe('código de catálogo — só o que é confiável', () => {
  it('pega a numeração do Mini GT', () => {
    expect(extrairCodigo('Mini Gt Chevrolet Silverado Kaido House #192', 'Mini GT')).toBe('192');
    expect(extrairCodigo('Mini GT Ford GT Triple Yellow #0613', 'Mini GT')).toBe('0613');
    expect(extrairCodigo('Mini GT LB★WORKS BMW M4 Black W/ M Stripe #0306', 'Mini GT')).toBe('0306');
  });

  it('NÃO confunde designação de modelo com código', () => {
    // Foi o furo da primeira medição: estes três casavam com o formato de
    // código de fábrica, mas são o nome do carro.
    expect(extrairCodigo('Hot Wheels Koeningsegg CC850', 'Hot Wheels')).toBeNull();
    expect(extrairCodigo('Shelby Mustang GT500 1:64 POP RACE Preto', 'Pop Race')).toBeNull();
    expect(extrairCodigo('Pop Race Honda NSX GT3 EVO22', 'Pop Race')).toBeNull();
  });

  it('NÃO confunde número de corrida com numeração de coleção', () => {
    // "#93" é o número pintado no carro. A numeração do Mini GT tem 3 ou 4
    // dígitos, então o corte por tamanho separa os dois.
    expect(extrairCodigo('Mini GT Acura NSX GT3 EVO22 #93 2023 IMSA Daytona', 'Mini GT')).toBeNull();
  });

  it('numeração do Mini GT não é aplicada a outra marca', () => {
    expect(extrairCodigo('Hot Wheels Mclaren #4 Formula 1 Team', 'Hot Wheels')).toBeNull();
  });

  it('pega referência própria de Tarmac, Kaido e Inno64', () => {
    expect(extrairCodigo('Tarmac Works T64-001 Honda', 'Tarmac Works')).toBe('T64-001');
    expect(extrairCodigo('Kaido House KHMG112 Datsun', 'Kaido House')).toBe('KHMG112');
  });
});

describe('linha no título', () => {
  it('acha a linha e prefere a mais específica', () => {
    expect(linhaNoTitulo('Hot Wheels Premium Car Culture Porsche 993 Gt2')).toBe('Car Culture');
    expect(linhaNoTitulo('Hot Wheels Premium Pop Culture Godzilla')).toBe('Pop Culture');
    expect(linhaNoTitulo('Hot Wheels Premium - Fast & Furious - Mazda Rx-7 FD')).toBe('Fast & Furious');
  });

  it('título sem linha volta nulo', () => {
    expect(linhaNoTitulo('Hotwheels Subaru Impreza WRX')).toBeNull();
  });
});

describe('modelo — o que sobra depois de limpar', () => {
  it('tira marca, linha, escala e ruído, e mantém o carro', () => {
    const m = extrairModelo(
      'Hot Wheels Premium Car Culture Porsche 993 Gt2 - Jkf16',
      'Hot Wheels',
      'Car Culture',
    );
    expect(m).toContain('porsche');
    expect(m).toContain('993');
    expect(m).not.toContain('hot wheels');
    expect(m).not.toContain('car culture');
  });

  it('tira a variante do modelo, para chase e regular caírem no mesmo nome', () => {
    const chase = extrairModelo('Hot Wheels Premium - Alfa Romeo GTV6 - CHASE - 1:64', 'Hot Wheels');
    const normal = extrairModelo('Hot Wheels Premium - Alfa Romeo GTV6 - 1:64', 'Hot Wheels');
    expect(chase).toBe(normal);
    expect(chase).toContain('alfa romeo gtv6');
  });

  it('tira a escala escrita no título', () => {
    expect(extrairModelo('Mini GT Nissan Skyline 1:64', 'Mini GT')).not.toContain('1');
  });

  it('tira a numeração de coleção', () => {
    expect(extrairModelo('Mini GT Ford GT Triple Yellow #0613', 'Mini GT')).not.toContain('0613');
  });

  it('aguenta a grafia torta da marca no título', () => {
    expect(extrairModelo('Hotwheels Subaru Impreza WRX', 'Hot Wheels')).toContain('subaru impreza');
  });
});

describe('quem entra na comparação', () => {
  it('anúncio novo-lacrado e peça única entra', () => {
    expect(motivoNaoComparavel(novo('Hot Wheels Premium Nissan Skyline GT-R R32', 'Hot Wheels'))).toBeNull();
  });

  it('condição diferente de novo-lacrado fica de fora', () => {
    // A regra do produto: preço de referência é sempre de novo lacrado.
    for (const c of ['novo-sem-caixa', 'usado-conservado', 'usado-marcas']) {
      const motivo = motivoNaoComparavel({
        title: 'Hot Wheels Premium Nissan Skyline', brand: 'Hot Wheels', condition: c,
      });
      expect(motivo, c).toMatch(/novo-lacrado/);
    }
  });

  it('lote, franquia e marca fora da lista ficam de fora, cada um com seu motivo', () => {
    expect(motivoNaoComparavel(novo('Lote 10 carrinhos Hot Wheels', 'Hot Wheels'))).toMatch(/lote/i);
    expect(motivoNaoComparavel(novo('Star Trek U.S.S. Enterprise', 'Hot Wheels'))).toMatch(/franquia/i);
    expect(motivoNaoComparavel(novo('Carrinho azul bonito', 'Marca Inventada'))).toMatch(/marca/i);
  });

  it('título vazio não passa', () => {
    expect(motivoNaoComparavel({ title: '', brand: 'Hot Wheels', condition: CONDICAO_BASE })).toMatch(/título/);
  });
});

describe('identidade e agrupamento', () => {
  it('monta a identidade completa', () => {
    const id = identidadeDe(novo('Mini GT Ford GT Triple Yellow #0613', 'Mini GT'))!;
    expect(id.marca).toBe('Mini GT');
    expect(id.codigo).toBe('0613');
    expect(id.variante).toBe('regular');
    expect(id.escala).toBe('1:64');
    expect(id.condicao).toBe(CONDICAO_BASE);
  });

  it('anúncio não comparável não tem identidade', () => {
    expect(identidadeDe(novo('Lote 10 carrinhos', 'Hot Wheels'))).toBeNull();
  });

  it('CHASE E REGULAR NUNCA SÃO A MESMA PEÇA', () => {
    const chase = identidadeDe(novo('Hot Wheels Premium Alfa Romeo GTV6 CHASE', 'Hot Wheels'))!;
    const normal = identidadeDe(novo('Hot Wheels Premium Alfa Romeo GTV6', 'Hot Wheels'))!;
    expect(mesmaPeca(chase, normal)).toBe(false);
    expect(chase.chave).not.toBe(normal.chave);
  });

  it('escalas diferentes não são a mesma peça', () => {
    const a = identidadeDe(novo('Bburago Ferrari 296 GTB', 'Bburago', { scale: '1:64' }))!;
    const b = identidadeDe(novo('Bburago Ferrari 296 GTB', 'Bburago', { scale: '1:41' }))!;
    expect(mesmaPeca(a, b)).toBe(false);
  });

  it('escala não declarada não é tratada como igual às outras', () => {
    const semEscala = identidadeDe(novo('Bburago Ferrari 296 GTB', 'Bburago', { scale: '' }))!;
    const com = identidadeDe(novo('Bburago Ferrari 296 GTB', 'Bburago', { scale: '1:64' }))!;
    expect(semEscala.escala).toBeNull();
    expect(mesmaPeca(semEscala, com)).toBe(false);
  });

  it('mesmo código junta títulos escritos de jeitos diferentes', () => {
    const a = identidadeDe(novo('Mini GT Ford GT Triple Yellow #0613', 'Mini GT'))!;
    const b = identidadeDe(novo('Miniatura Ford GT amarela da Mini Gt #0613', 'Mini GT'))!;
    expect(a.chave).not.toBe(b.chave); // títulos diferentes, chaves diferentes
    expect(mesmaPeca(a, b)).toBe(true); // mas o código decide
  });

  it('código igual de marcas diferentes não junta', () => {
    const a = identidadeDe(novo('Mini GT Ford GT #0613', 'Mini GT'))!;
    const b = { ...a, marca: 'Tarmac Works' };
    expect(mesmaPeca(a, b)).toBe(false);
  });

  it('agrupa o mesmo carro anunciado por vendedores diferentes', () => {
    const grupos = agruparPorPeca([
      novo('Hot Wheels Premium Nissan Skyline GT-R R32', 'Hot Wheels'),
      novo('Hotwheels Premium Nissan Skyline GT-R R32', 'Hot Wheels'),
      novo('Hot Wheels Premium Nissan Skyline GT-R R32 CHASE', 'Hot Wheels'),
      novo('Lote 5 Hot Wheels', 'Hot Wheels'),
    ]);
    // Os dois primeiros juntam (a grafia da marca some na limpeza), o chase
    // fica separado, e o lote não entra.
    const tamanhos = [...grupos.values()].map((g) => g.itens.length).sort((a, b) => b - a);
    expect(tamanhos).toEqual([2, 1]);
  });
});

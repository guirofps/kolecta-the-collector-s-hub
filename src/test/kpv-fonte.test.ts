import { describe, it, expect } from 'vitest';
import { fonteRecomendada, candidatoServe, semelhancaModelo, converterDeDolar } from '@/lib/kpv-fonte';
import { identidadeDe, CONDICAO_BASE } from '@/lib/kpv-identidade';

const id = (title: string, brand: string, scale = '1:64') =>
  identidadeDe({ title, brand, scale, condition: CONDICAO_BASE })!;

describe('qual fonte usar', () => {
  it('peça comum vai para o Mercado Livre', () => {
    expect(fonteRecomendada(id('Hot Wheels Mainline Ferrari 365 GTB4', 'Hot Wheels')))
      .toBe('mercado-livre');
  });

  it('chase e treasure hunt vão para o eBay', () => {
    // O vendedor brasileiro não anuncia chase em marketplace grande, por medo
    // do golpe do "não gostei" com devolução da versão comum. Então a peça
    // simplesmente não está no catálogo de lá.
    for (const t of [
      'Hot Wheels Premium Alfa Romeo GTV6 CHASE',
      'Hotwheels Subaru Impreza WRX Super T Hunt',
      'Hot Wheels Total Disposal Treasure Hunt',
    ]) {
      expect(fonteRecomendada(id(t, 'Hot Wheels')), t).toBe('ebay');
    }
  });

  it('marca de tiragem pequena vai para o eBay mesmo sendo regular', () => {
    // Kaido e Tarmac fazem séries de 350 a 500 unidades: circulam em mercado
    // internacional de colecionador, não no varejo brasileiro.
    expect(fonteRecomendada(id('Kaido House Datsun 510 Wagon', 'Kaido House'))).toBe('ebay');
    expect(fonteRecomendada(id('Tarmac Works Honda Civic EG6', 'Tarmac Works'))).toBe('ebay');
  });
});

describe('o porteiro — casos reais que o piloto errou', () => {
  it('RECUSA Super Treasure Hunt casado com o regular', () => {
    // O erro mais caro do piloto: R$ 1250 virou R$ 127 (+880%).
    const nosso = id('Hotwheels Subaru Impreza WRX Super T Hunt', 'Hot Wheels');
    const ml = id('Hot Wheels Subaru Impreza Wrx Thrill Climbers Car Culture', 'Hot Wheels');
    const v = candidatoServe(nosso, ml);
    expect(v.serve).toBe(false);
    expect(v.motivo).toMatch(/variante/);
  });

  it('RECUSA escala diferente', () => {
    // "Bburago Ferrari 296 GTB 1:41" casou com um 1:24.
    const nosso = id('Bburago Ferrari 296 GTB Shell', 'Bburago', '1:41');
    const ml = id('Bburago Ferrari Vermelho', 'Bburago', '1:24');
    expect(candidatoServe(nosso, ml).motivo).toMatch(/escala/);
  });

  it('RECUSA marca diferente', () => {
    // O ML registrou um Mini GT com marca "Multimatic".
    const nosso = id('Mini GT Ford Mustang GT3 Daytona', 'Mini GT');
    const outro = id('Ford Mustang GT3 IMSA Daytona', 'Tarmac Works');
    expect(candidatoServe(nosso, outro).motivo).toMatch(/marca/);
  });

  it('RECUSA carro diferente com marca igual', () => {
    // "Kaido House DGK Trueno" casou com "Honda NSX Kaido Works V2".
    const nosso = id('Kaido House DGK Toyota Trueno AE86', 'Kaido House');
    const ml = id('Kaido House Honda NSX Kaido Works V2 Branco', 'Kaido House');
    const v = candidatoServe(nosso, ml);
    expect(v.serve).toBe(false);
    expect(v.motivo).toMatch(/modelo/);
  });

  it('RECUSA quando falta escala em um dos lados', () => {
    const nosso = id('Hot Wheels Ferrari 365 GTB4', 'Hot Wheels', '');
    const ml = id('Hot Wheels Ferrari 365 GTB4 Competizione', 'Hot Wheels', '1:64');
    expect(candidatoServe(nosso, ml).motivo).toMatch(/escala/);
  });

  it('ACEITA o par que é de fato a mesma peça', () => {
    // O caso que funcionou: 58 vendedores, mediana estável.
    const nosso = id('Hot Wheels Ferrari 365 GTB4 Competizione', 'Hot Wheels');
    const ml = id('Hot Wheels Ferrari 365 Gtb4 Competizione Jbc19 Vermelho', 'Hot Wheels');
    expect(candidatoServe(nosso, ml).serve).toBe(true);
  });
});

describe('semelhança de modelo', () => {
  it('cor não derruba o par certo', () => {
    // O nome do produto no ML quase sempre traz a cor no fim.
    expect(semelhancaModelo('ferrari 365 gtb4 competizione', 'ferrari 365 gtb4 competizione vermelho'))
      .toBe(1);
  });

  it('carros diferentes ficam baixos', () => {
    expect(semelhancaModelo('dgk toyota trueno ae86', 'honda nsx kaido works v2')).toBeLessThan(0.5);
    expect(semelhancaModelo('chevrolet super 10 1973 sema', 'chevrolet cheyenne super 30 1973 square body'))
      .toBeLessThan(0.75);
  });

  it('vazio não quebra', () => {
    expect(semelhancaModelo('', 'ferrari')).toBe(0);
  });
});

describe('conversão de dólar', () => {
  // Alíquotas passadas explicitamente: a regra brasileira muda, e valor padrão
  // escondido viraria número errado dentro de uma referência que se apresenta
  // como confiável.
  const custo = { cambio: 5.4, importacao: 0.6, icms: 0.17 };

  it('separa o valor da peça do custo de trazer', () => {
    const r = converterDeDolar(100, custo);
    expect(r.valorDaPecaEmReais).toBe(540);
    // 540 * 1.6 = 864, e o ICMS entra por dentro: 864 / 0.83
    expect(r.custoDesembarcadoEmReais).toBeCloseTo(1040.96, 1);
  });

  it('o custo desembarcado é sempre maior que o valor da peça', () => {
    for (const usd of [10, 50, 100, 500]) {
      const r = converterDeDolar(usd, custo);
      expect(r.custoDesembarcadoEmReais).toBeGreaterThan(r.valorDaPecaEmReais);
    }
  });

  it('frete internacional entra na base do imposto', () => {
    const sem = converterDeDolar(100, custo);
    const com = converterDeDolar(100, { ...custo, freteUsd: 20 });
    expect(com.custoDesembarcadoEmReais).toBeGreaterThan(sem.custoDesembarcadoEmReais);
    // O frete não muda quanto a PEÇA vale, só quanto custa trazer.
    expect(com.valorDaPecaEmReais).toBe(sem.valorDaPecaEmReais);
  });

  it('sem imposto nenhum, desembarcado é igual ao valor da peça', () => {
    const r = converterDeDolar(100, { cambio: 5, importacao: 0, icms: 0 });
    expect(r.custoDesembarcadoEmReais).toBe(r.valorDaPecaEmReais);
  });

  it('valor negativo ou zero não vira número maluco', () => {
    expect(converterDeDolar(0, custo).custoDesembarcadoEmReais).toBe(0);
    expect(converterDeDolar(-50, custo).valorDaPecaEmReais).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import {
  fonteRecomendada, candidatoServe, semelhancaModelo, modelosConflitam,
  converterDeDolar, escalaPresumida,
} from '@/lib/kpv-fonte';
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

  it('Funko vai para o eBay: o ML BR tem o catálogo mas quase sem preço', () => {
    expect(fonteRecomendada(id('Funko Pop Sylvanas 990', 'Funko'))).toBe('ebay');
  });

  it('canal premium (RLC / Mattel Creations) vai para o eBay', () => {
    // O ML BR não tem esses exclusivos e casa com o regular do mesmo carro: o
    // "Mattel Creations Daniel Arsham Porsche 911" virou "Eroded Mustang".
    expect(fonteRecomendada(id('Hot Wheels RLC Red Line Club Nissan Skyline GT-R R34', 'Hot Wheels'))).toBe('ebay');
    expect(fonteRecomendada(id('Mattel Creations Hot Wheels Daniel Arsham 1973 Porsche 911', 'Hot Wheels'))).toBe('ebay');
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

  it('RECUSA quando o código de coleção difere (Mini GT #718 vs #1089)', () => {
    // "nissan gt r35" sozinho dava 75% de sobreposição; o #NNNN do Mini GT é o
    // desempate. O LB Works R35 #718 casou com o Nismo #1089 sem esta guarda.
    const nosso = id('MINI GT 1:64 LB WORKS NISSAN GT-R R35 SD5 #718', 'Mini GT');
    const ml = id('Mini GT Nissan GT-R Nismo R35 #1089', 'Mini GT');
    const v = candidatoServe(nosso, ml);
    expect(v.serve).toBe(false);
    expect(v.motivo).toMatch(/[có]digo/);
  });

  it('código IGUAL não atrapalha o casamento certo', () => {
    const nosso = id('Mini GT Nissan Skyline GT-R R34 #718', 'Mini GT');
    const ml = id('Mini GT 1:64 Nissan Skyline GTR R34 V-Spec #718 Azul', 'Mini GT');
    expect(candidatoServe(nosso, ml).serve).toBe(true);
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

  it('COMPLETA a escala quando a marca só faz 1:64', () => {
    // Foi o maior motivo de recusa do piloto: o catálogo do ML frequentemente
    // não traz o atributo Escala. Hot Wheels não fabrica 1:18, então assumir
    // 1:64 não é chute.
    expect(escalaPresumida('Hot Wheels')).toBe('1:64');
    expect(escalaPresumida('Mini GT')).toBe('1:64');

    const nosso = id('Hot Wheels Ferrari 365 GTB4 Competizione', 'Hot Wheels', '1:64');
    const ml = id('Hot Wheels Ferrari 365 Gtb4 Competizione Jbc19', 'Hot Wheels', '');
    expect(candidatoServe(nosso, ml).serve).toBe(true);
  });

  it('NÃO presume escala de marca que faz várias', () => {
    // Bburago faz 1:18, 1:24 e 1:43. Presumir aqui erraria o preço em cinco
    // vezes, que é exatamente o estrago que o porteiro existe para evitar.
    expect(escalaPresumida('Bburago')).toBeNull();
    expect(escalaPresumida('Maisto')).toBeNull();
    expect(escalaPresumida('Greenlight')).toBeNull();

    const nosso = id('Bburago Ferrari 296 GTB', 'Bburago', '1:43');
    const ml = id('Bburago Ferrari 296 GTB Shell', 'Bburago', '');
    expect(candidatoServe(nosso, ml).motivo).toMatch(/escala/);
  });

  it('RECUSA linha diferente no mesmo carro', () => {
    // Do piloto 2: "Porsche 911 GT3 RS Then and Now" casou com o mesmo carro
    // na linha "Fast & Furious". Mesmo molde, séries diferentes, preços
    // diferentes.
    const nosso = identidadeDe({
      title: 'Hot Wheels Porsche 911 GT3 RS Then And Now', brand: 'Hot Wheels',
      line: 'Then and Now', scale: '1:64', condition: CONDICAO_BASE,
    })!;
    const ml = identidadeDe({
      title: 'Porsche 911 GT3 RS Hot Wheels Fast And Furious', brand: 'Hot Wheels',
      line: 'Fast & Furious', scale: '1:64', condition: CONDICAO_BASE,
    })!;
    expect(candidatoServe(nosso, ml).motivo).toMatch(/linha/);
  });

  it('RECUSA quando só a montadora bate', () => {
    // "Mclaren Formula 1 Team" casou com "McLaren Solus": a palavra "mclaren"
    // sozinha já dava 50% num nome de duas palavras.
    const nosso = id('Hot Wheels Mclaren Formula 1 Team', 'Hot Wheels');
    const ml = id('Carrinho Hot Wheels McLaren Solus 2023', 'Hot Wheels');
    const v = candidatoServe(nosso, ml);
    expect(v.serve).toBe(false);
  });

  it('RECUSA modelo que diverge numa palavra distintiva (Matchbox 911 RSR vs Rallye)', () => {
    // Do lote real de ML: "Collectors 2023 Porsche 911 RSR" casou com o "911
    // Rallye" (R$98). "porsche 911" sozinho dava 75% e passava pela regra 5.
    const nosso = id('Matchbox Collectors 2023 Porsche 911 RSR', 'Matchbox');
    const ml = id('Matchbox Collectors 2023 Porsche 911 Rallye', 'Matchbox');
    const v = candidatoServe(nosso, ml);
    expect(v.serve).toBe(false);
    expect(v.motivo).toMatch(/distintiv|modelo/);
  });

  it('RECUSA quando ano E livery divergem (720S GULF 2024 vs 2019)', () => {
    const nosso = id('Matchbox Collectors 2024 McLaren 720S Spider Gulf', 'Matchbox');
    const ml = id('Matchbox 2019 McLaren 720S Spider', 'Matchbox');
    expect(candidatoServe(nosso, ml).serve).toBe(false);
  });

  it('RECUSA variantes de trim diferentes (Camaro SS vs ZL1, GT3 RS vs Touring)', () => {
    expect(candidatoServe(
      id('Hot Wheels Chevrolet Camaro SS', 'Hot Wheels'),
      id('Hot Wheels Chevrolet Camaro ZL1', 'Hot Wheels'),
    ).serve).toBe(false);
    expect(candidatoServe(
      id('Hot Wheels Porsche 911 GT3 RS', 'Hot Wheels'),
      id('Hot Wheels Porsche 911 GT3 Touring', 'Hot Wheels'),
    ).serve).toBe(false);
  });

  it('NÃO reprova o mesmo carro descrito diferente (gt-r/gtr, acento, um lado mais descritivo)', () => {
    // O crítico: os dois lados têm token "exclusivo" (gt vs gtr, e v-spec), mas
    // é a MESMA peça. Substring absorve gt⊂gtr; v-spec é só descrição a mais.
    expect(modelosConflitam('nissan skyline gt-r r34', 'nissan skyline gtr r34 v-spec')).toBe(false);
    expect(modelosConflitam('lamborghini huracan', 'lamborghini huracán')).toBe(false);
    expect(modelosConflitam('ferrari 365 gtb4 competizione', 'ferrari 365 gtb4 competizione jbc19 vermelho')).toBe(false);
    // E os conflitos reais dão true na função pura:
    expect(modelosConflitam('porsche 911 rsr', 'porsche 911 rallye')).toBe(true);
    expect(modelosConflitam('nissan gt r r35 sd5', 'nissan gt r r35 nismo')).toBe(true);
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

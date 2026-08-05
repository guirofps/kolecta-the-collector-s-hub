import { describe, it, expect } from 'vitest';
import {
  extrairOfertas, pareceAberto, paraCentavos, LOJAS, PISO_1_64_EM_CENTAVOS,
  type LojaConfig,
} from '@/lib/kpv-lojas';

const NUVEM: LojaConfig = {
  nome: 'Loja Nuvem', base: 'https://nuvem.com.br', plataforma: 'nuvemshop',
  busca: (t) => `https://nuvem.com.br/search/?q=${t}`,
};
const INTEGRADA: LojaConfig = {
  nome: 'Loja Integrada', base: 'https://integrada.com.br', plataforma: 'loja-integrada',
  busca: (t) => `https://integrada.com.br/buscar?q=${t}`,
  caminhosProibidos: ['/bazar'],
};

/** Card de SERP da Nuvemshop, com JSON-LD por produto. */
const cardNuvem = (nome: string, preco: string, url: string) => `
<script type="application/ld+json">
{"@type":"Product","name":${JSON.stringify(nome)},
 "offers":{"@type":"Offer","price":"${preco}","priceCurrency":"BRL","url":"${url}"}}
</script>`;

/**
 * Card de SERP da Loja Integrada, copiado da estrutura real.
 *
 * Traz as duas armadilhas de preço juntas: o valor riscado ANTES do promocional
 * e o microdata com o desconto de PIX.
 */
const cardIntegrada = (nome: string, riscado: string, aPagar: string, pix: string, url: string) => `
<div class="listagem-item">
  <a href="${url}" class="produto-sobrepor" title="${nome}"></a>
  <div class="info-produto">
    <a href="${url}" class="nome-produto cor-secundaria">${nome}</a>
    <div itemprop="offers"><meta itemprop="price" content="${pix}"/></div>
    <div class="preco-produto com-promocao">
      <s class="preco-venda titulo"> R$ ${riscado} </s>
      <strong class="preco-promocional cor-principal" data-sell-price="${aPagar}"> R$ ${aPagar} </strong>
    </div>
  </div>
</div>`;

/** Produto sem promoção: só o preco-venda, sem data-sell-price. */
const cardIntegradaSemPromo = (nome: string, preco: string, url: string) => `
<div class="listagem-item">
  <a href="${url}" class="nome-produto cor-secundaria">${nome}</a>
  <div class="preco-produto"><strong class="preco-venda titulo"> R$ ${preco} </strong></div>
</div>`;

describe('conversão de preço', () => {
  it('aceita os formatos que as lojas usam', () => {
    expect(paraCentavos('100')).toBe(10000);
    expect(paraCentavos('499.95')).toBe(49995);
    expect(paraCentavos('1.234,56')).toBe(123456);
    expect(paraCentavos('R$ 119,90')).toBe(11990);
    expect(paraCentavos(100)).toBe(10000);
  });

  it('aceita valor que já vem em centavos', () => {
    expect(paraCentavos('10000', true)).toBe(10000);
  });

  it('vazio e lixo viram zero, nunca NaN', () => {
    for (const v of ['', null, undefined, 'grátis']) expect(paraCentavos(v), String(v)).toBe(0);
  });
});

describe('armadilha 1: pré-venda anunciada pelo valor do sinal', () => {
  it('descarta o preço de reserva', () => {
    // Caso real: um Bugatti Bolide aparece a R$ 5,00, que é a reserva. Gravar
    // isso viraria "preço de mercado do Bugatti: R$ 5".
    const html = cardNuvem('Mini GT Bugatti Bolide', '5', '/bugatti')
      + cardNuvem('Mini GT Nissan Skyline', '199.90', '/skyline');
    const r = extrairOfertas(html, NUVEM);
    expect(r.ofertas).toHaveLength(1);
    expect(r.ofertas[0].titulo).toContain('Skyline');
    expect(r.descartes['abaixo do piso: sinal de pré-venda']).toBe(1);
  });

  it('o piso não derruba peça barata legítima', () => {
    const html = cardNuvem('Hot Wheels Mainline Camaro', '39.90', '/camaro');
    expect(extrairOfertas(html, NUVEM).ofertas).toHaveLength(1);
    expect(3990).toBeGreaterThan(PISO_1_64_EM_CENTAVOS);
  });
});

describe('armadilha 2: qual dos três preços do card é o certo', () => {
  it('ignora o preço do PIX, que vem no microdata', () => {
    // Caso real do Orangebox: microdata 459,95 (PIX) contra 499,95 a pagar.
    // São 8% que puxariam a referência para baixo, de forma sistemática e
    // invisível.
    const html = cardIntegrada('Bburago Ferrari 296 GTB', '599.95', '499.95', '459.95', '/ferrari');
    expect(extrairOfertas(html, INTEGRADA).ofertas[0].precoEmCentavos).toBe(49995);
  });

  it('ignora o preço RISCADO, que vem antes no HTML', () => {
    // Caso real da Counting Minis: <s>R$ 119,90</s> riscado e R$ 54,90 a
    // pagar. Ancorar no preço em vez do nome pegava o riscado e gravava mais
    // que o dobro do valor real.
    const html = cardIntegrada('Hot Wheels Premium Land Rover Defender 110', '119.90', '54.90', '52.16', '/defender');
    expect(extrairOfertas(html, INTEGRADA).ofertas[0].precoEmCentavos).toBe(5490);
  });

  it('sem promoção, usa o preço normal', () => {
    const html = cardIntegradaSemPromo('Mini GT Nissan Skyline', '119.95', '/skyline');
    expect(extrairOfertas(html, INTEGRADA).ofertas[0].precoEmCentavos).toBe(11995);
  });

  it('ignora o card MODELO que a plataforma serve para o JavaScript clonar', () => {
    const html = cardIntegradaSemPromo('--PRODUTO_NOME--', '0.00', '--PRODUTO_URL--')
      + cardIntegradaSemPromo('Mini GT Nissan Skyline', '119.95', '/skyline');
    const r = extrairOfertas(html, INTEGRADA);
    expect(r.ofertas).toHaveLength(1);
    expect(r.ofertas[0].titulo).toContain('Skyline');
  });
});

describe('armadilha 3: a condição mente no dado estruturado', () => {
  it('descarta o que o TÍTULO revela como aberto', () => {
    // Item com "(Caixa Aberta)" declara NewCondition no microdata. A condição
    // real só existe no texto.
    for (const t of [
      '(Caixa Aberta) Mini GT 1:64 Bugatti Divo #601',
      'Hot Wheels Premium - Blister Aberto',
      'Mini GT Skyline **LEIA**',
      'Tarmac Works Honda - caixa amassada',
      'Mini GT Nissan sem caixa',
      'Hot Wheels usado',
    ]) {
      expect(pareceAberto(t), t).toBe(true);
    }
  });

  it('não confunde peça lacrada normal', () => {
    for (const t of [
      'Mini GT 1:64 Bugatti Divo #601',
      'Hot Wheels Premium Car Culture Porsche',
      'Kaido House Datsun 510 Wagon',
    ]) {
      expect(pareceAberto(t), t).toBe(false);
    }
  });

  it('some da coleta em vez de virar preço de novo lacrado', () => {
    const html = cardIntegrada('(Caixa Aberta) Mini GT Bugatti Divo', '249.90', '199.90', '189.90', '/divo')
      + cardIntegrada('Mini GT Bugatti Divo', '349.90', '299.90', '284.90', '/divo-novo');
    const r = extrairOfertas(html, INTEGRADA);
    expect(r.ofertas).toHaveLength(1);
    expect(r.ofertas[0].precoEmCentavos).toBe(29990);
    expect(r.descartes['não é novo lacrado']).toBe(1);
  });
});

describe('outros filtros', () => {
  it('respeita seção proibida, como o /bazar', () => {
    // A própria loja descreve /bazar como fim de estoque, devolução e seminovo.
    const html = cardIntegrada('Mini GT Skyline', '249.90', '199.90', '189.90', '/bazar/skyline');
    const r = extrairOfertas(html, INTEGRADA);
    expect(r.ofertas).toHaveLength(0);
    expect(r.descartes['seção excluída']).toBe(1);
  });

  it('descarta preço de atacado', () => {
    const html = cardNuvem('Hot Wheels caixa fechada 72 peças atacado', '899.90', '/atacado');
    expect(extrairOfertas(html, NUVEM).ofertas).toHaveLength(0);
  });

  it('descarta lote e set, que não são peça única', () => {
    // Escapou na primeira validação: um "Coleção Fast & Furious Set 5 Carros"
    // a R$ 490 viraria preço de uma peça só.
    const html = cardNuvem('Hot Wheels Premium Coleção Fast & Furious Set 5 Carros', '490', '/set');
    const r = extrairOfertas(html, NUVEM);
    expect(r.ofertas).toHaveLength(0);
    expect(r.descartes['é lote ou set, não peça única']).toBe(1);
  });

  it('não conta a mesma peça duas vezes na mesma página', () => {
    const html = cardNuvem('Mini GT Skyline', '199.90', '/skyline')
      + cardNuvem('Mini GT Skyline', '199.90', '/skyline');
    const r = extrairOfertas(html, NUVEM);
    expect(r.ofertas).toHaveLength(1);
    expect(r.descartes['repetida na mesma página']).toBe(1);
  });

  it('HTML vazio ou quebrado não estoura', () => {
    for (const h of ['', '<html></html>', '<script type="application/ld+json">{quebrado</script>']) {
      expect(() => extrairOfertas(h, NUVEM)).not.toThrow();
      expect(extrairOfertas(h, NUVEM).ofertas).toEqual([]);
    }
  });
});

describe('URL e identificação', () => {
  it('completa caminho relativo com o domínio da loja', () => {
    const r = extrairOfertas(cardNuvem('Mini GT Skyline', '199.90', '/produto/skyline'), NUVEM);
    expect(r.ofertas[0].url).toBe('https://nuvem.com.br/produto/skyline');
  });

  it('mantém URL absoluta como está', () => {
    const r = extrairOfertas(cardNuvem('Mini GT Skyline', '199.90', 'https://nuvem.com.br/x'), NUVEM);
    expect(r.ofertas[0].url).toBe('https://nuvem.com.br/x');
  });

  it('marca a loja, que vira o vendedor na hora de deduplicar', () => {
    // Sem isso, uma loja com 10 anúncios da mesma peça valeria 10 votos.
    const r = extrairOfertas(cardNuvem('Mini GT Skyline', '199.90', '/x'), NUVEM);
    expect(r.ofertas[0].loja).toBe('Loja Nuvem');
  });
});

describe('lojas configuradas', () => {
  it('as URLs de busca usam o caminho que de fato responde', () => {
    // /busca devolve 404 nas duas plataformas: Nuvemshop quer /search/ com
    // barra, Loja Integrada quer /buscar.
    for (const l of LOJAS) {
      const url = l.busca('hot wheels');
      expect(url, l.nome).toMatch(l.plataforma === 'nuvemshop' ? /\/search\/\?q=/ : /\/buscar\?q=/);
      expect(url, l.nome).toContain('hot%20wheels');
    }
  });

  it('nenhuma loja repetida', () => {
    expect(new Set(LOJAS.map((l) => l.base)).size).toBe(LOJAS.length);
  });
});

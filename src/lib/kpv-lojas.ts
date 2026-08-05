// ─── KPV: coleta em loja própria ─────────────────────────────────────────────
//
// Terceira fonte, ao lado do Mercado Livre e (quando sair a credencial) do
// eBay. Cobre justamente o que o marketplace não tem: Mini GT, Kaido House,
// Tarmac, Inno64, tiragem pequena.
//
// A boa notícia é que não são 24 raspadores. Loja de miniatura no Brasil roda
// em duas plataformas, Nuvemshop e Loja Integrada, e cada uma tem um jeito só
// de expor preço. Dois parsers cobrem a lista inteira, e loja nova entra com
// uma linha de configuração.
//
// Tudo aqui é função pura sobre o HTML, sem rede. É o que permite testar as
// armadilhas abaixo sem depender do site estar no ar.
//
// ── As armadilhas, todas vistas em loja real ─────────────────────────────────
//
// 1. PRÉ-VENDA ANUNCIADA PELO SINAL. Um Bugatti Bolide aparece a R$ 5,00, que
//    é a reserva, não o preço da peça. Numa busca, 3 de 12 resultados vieram
//    assim. Gravar isso viraria "preço de mercado do Bugatti: R$ 5".
//
// 2. O PREÇO ESTRUTURADO É O DO PIX. O microdata diz 459,95 enquanto o preço
//    de tabela é 499,95. São 8% que puxariam a referência inteira para baixo,
//    de forma sistemática e invisível.
//
// 3. A CONDIÇÃO MENTE. Item com "(Caixa Aberta)" no título declara
//    `NewCondition` no dado estruturado. A condição real só existe no texto.
//
// 4. PRODUTO RELACIONADO NO JSON-LD. Na página de produto da Nuvemshop existem
//    dez blocos e oito são o carrossel de relacionados. Quem pega o primeiro
//    grava o preço do item errado.

import { ehAtacado } from './kpv-referencia';
import { ehLote } from './kpv-identidade';

export type Plataforma = 'nuvemshop' | 'loja-integrada';

export interface LojaConfig {
  nome: string;
  base: string;
  plataforma: Plataforma;
  /** Monta a URL de busca. Cada plataforma tem o seu caminho. */
  busca: (termo: string) => string;
  /** Trechos de URL que nunca entram: /bazar é fim de estoque e usado. */
  caminhosProibidos?: string[];
}

export interface OfertaLoja {
  titulo: string;
  precoEmCentavos: number;
  url: string;
  /** Nome da loja, que vira o "vendedor" na hora de deduplicar. */
  loja: string;
}

/**
 * Piso de preço para 1:64.
 *
 * Abaixo disso não é peça, é sinal de pré-venda ou brinde. Nenhuma miniatura
 * de colecionador nova sai por menos que isso, então o corte separa os dois
 * sem precisar entender o texto do anúncio.
 */
export const PISO_1_64_EM_CENTAVOS = 3000;

/** Marcadores de item aberto ou usado que aparecem no título, nunca no dado. */
const RE_NAO_LACRADO =
  /\((?:\s*)?(?:caixa|blister|cartela)\s*aberta?(?:\s*)?\)|\bcaixa\s*aberta\b|\bblister\s*aberto\b|\bavariad|\bamassad|\bbazar\b|\bsem\s*caixa\b|\busado\b|\bseminovo\b|\*\*\s*leia\s*\*\*/i;

/** O título indica peça que não é nova lacrada? */
export function pareceAberto(titulo: string | null | undefined): boolean {
  return RE_NAO_LACRADO.test(titulo ?? '');
}

/** Converte "1.234,56", "1234.56" ou "12345" (centavos) para centavos. */
export function paraCentavos(bruto: string | number | null | undefined, jaEmCentavos = false): number {
  if (bruto == null) return 0;
  if (typeof bruto === 'number') return Math.round(jaEmCentavos ? bruto : bruto * 100);
  const limpo = String(bruto).trim();
  if (!limpo) return 0;
  if (jaEmCentavos) return Math.round(Number(limpo.replace(/\D/g, '')) || 0);
  // "1.234,56" (pt-BR) vira "1234.56"; "1234.56" fica como está.
  const normalizado = /,\d{1,2}$/.test(limpo)
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo.replace(/,/g, '');
  const n = Number(normalizado.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Tira tag e entidade do HTML, sobrando o texto. */
function texto(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ofertas da página de RESULTADO de busca da Loja Integrada.
 *
 * Usa `data-sell-price`, que é o preço de tabela, e NÃO o `itemprop="price"`
 * do microdata, que traz o valor com desconto de PIX já aplicado.
 */
function lojaIntegrada(html: string, loja: string, base: string): OfertaLoja[] {
  const ofertas: OfertaLoja[] = [];

  // Ancora no PREÇO e procura o título para trás, que é a ordem real do HTML
  // (link e nome vêm antes do valor). Tentar delimitar o card pelo container
  // não funciona: `listagem-item` é classe de um <div> que muda de plataforma
  // para plataforma, e o nome ainda aparece dentro de <script> de métrica, o
  // que produzia bloco falso.
  // Ancora no NOME e olha para a frente. Ancorar no preço não funciona: quando
  // há promoção, o markup traz primeiro o valor riscado
  //
  //   <s class="preco-venda">R$ 119,90</s>
  //   <strong class="preco-promocional" data-sell-price="54.90">R$ 54,90</strong>
  //
  // e a busca pegava o riscado, gravando o dobro do preço real.
  const RE_NOME = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*nome-produto[^"]*"[^>]*>([\s\S]{2,220}?)<\/a>/gi;

  for (const m of html.matchAll(RE_NOME)) {
    const href = m[1];
    const titulo = texto(m[2]);
    // A plataforma serve um card MODELO com marcadores, para o JavaScript
    // clonar. Ele não é produto e não pode virar preço.
    if (!titulo || titulo.includes('--PRODUTO') || href.includes('--PRODUTO')) continue;

    const depois = html.slice(m.index! + m[0].length, m.index! + m[0].length + 1800);
    // Corta no próximo produto, para não pegar o preço do vizinho quando este
    // aqui, por algum motivo, não tiver preço nenhum.
    const fim = depois.search(/class="[^"]*nome-produto/i);
    const janela = fim > 0 ? depois.slice(0, fim) : depois;

    // Preferência absoluta pelo `data-sell-price`: é o valor que o cliente
    // paga no cartão. Nunca o `itemprop="price"` do microdata, que já vem com
    // o desconto de PIX aplicado e puxaria a referência para baixo.
    const promo = /data-sell-price="([\d.,]+)"/i.exec(janela);
    const cheio = /class="[^"]*preco-venda[^"]*"[^>]*>\s*R\$\s*([\d.,]+)/i.exec(janela);
    const valor = promo?.[1] ?? cheio?.[1];
    if (!valor) continue;

    ofertas.push({
      titulo,
      precoEmCentavos: paraCentavos(valor),
      url: href.startsWith('http') ? href : base.replace(/\/$/, '') + (href.startsWith('/') ? href : `/${href}`),
      loja,
    });
  }
  return ofertas;
}

/**
 * Ofertas da página de resultado da Nuvemshop.
 *
 * Na SERP, cada card traz o seu próprio JSON-LD de nível raiz, e ali a raiz é
 * o lugar certo. A armadilha dos relacionados só existe na página de PRODUTO,
 * que este coletor não precisa abrir.
 */
function nuvemshop(html: string, loja: string, base: string): OfertaLoja[] {
  const ofertas: OfertaLoja[] = [];
  for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let dado: any;
    try { dado = JSON.parse(m[1]); } catch { continue; }
    for (const item of Array.isArray(dado) ? dado : [dado]) {
      if (item?.['@type'] !== 'Product') continue;
      const oferta = Array.isArray(item.offers) ? item.offers[0] : item.offers;
      if (!oferta?.price) continue;
      const url = String(oferta.url ?? item.url ?? '');
      ofertas.push({
        titulo: texto(String(item.name ?? '')),
        precoEmCentavos: paraCentavos(oferta.price),
        url: url.startsWith('http') ? url : base.replace(/\/$/, '') + url,
        loja,
      });
    }
  }
  // Reserva: quando o JSON-LD não vem, o preço em centavos está no atributo.
  if (!ofertas.length) {
    for (const bloco of html.split(/data-product-price="/i).slice(1)) {
      const centavos = /^(\d+)"/.exec(bloco);
      const nome = /alt="([^"]{4,200})"/i.exec(bloco.slice(0, 2500));
      const href = /href="([^"]+)"/i.exec(bloco.slice(0, 2500));
      if (!centavos || !href) continue;
      ofertas.push({
        titulo: texto(nome?.[1] ?? ''),
        precoEmCentavos: paraCentavos(centavos[1], true),
        url: href[1].startsWith('http') ? href[1] : base.replace(/\/$/, '') + href[1],
        loja,
      });
    }
  }
  return ofertas;
}

export interface ResultadoExtracao {
  ofertas: OfertaLoja[];
  /** Quantas foram descartadas por cada motivo. Vira relatório, não sumiço. */
  descartes: Record<string, number>;
}

/**
 * Extrai as ofertas de uma página de busca, já filtradas.
 *
 * O que sai daqui pode ir direto para a consolidação: as quatro armadilhas
 * documentadas no topo do arquivo já foram aplicadas.
 */
export function extrairOfertas(html: string, loja: LojaConfig): ResultadoExtracao {
  const brutas = loja.plataforma === 'nuvemshop'
    ? nuvemshop(html, loja.nome, loja.base)
    : lojaIntegrada(html, loja.nome, loja.base);

  const descartes: Record<string, number> = {};
  const conta = (m: string) => { descartes[m] = (descartes[m] ?? 0) + 1; };
  const ofertas: OfertaLoja[] = [];
  const vistas = new Set<string>();

  for (const o of brutas) {
    if (!o.titulo || !o.precoEmCentavos) { conta('sem título ou preço'); continue; }
    if (vistas.has(o.url)) { conta('repetida na mesma página'); continue; }
    if (loja.caminhosProibidos?.some((c) => o.url.includes(c))) { conta('seção excluída'); continue; }
    if (o.precoEmCentavos < PISO_1_64_EM_CENTAVOS) { conta('abaixo do piso: sinal de pré-venda'); continue; }
    if (pareceAberto(o.titulo)) { conta('não é novo lacrado'); continue; }
    if (ehAtacado(o.titulo)) { conta('preço de atacado'); continue; }
    // Lote passou batido na primeira validação: um "Coleção Fast & Furious Set
    // 5 Carros" a R$ 490 viraria preço de uma peça só.
    if (ehLote(o.titulo)) { conta('é lote ou set, não peça única'); continue; }
    vistas.add(o.url);
    ofertas.push(o);
  }

  return { ofertas, descartes };
}

// ─── As lojas ────────────────────────────────────────────────────────────────
//
// Começa pelas três validadas no levantamento, que juntas cobrem o catálogo
// que interessa: 1:64 premium, Hot Wheels de colecionador e importado.

export const LOJAS: LojaConfig[] = [
  {
    nome: 'O Mundo das Minis',
    base: 'https://www.omundodasminis.com.br',
    plataforma: 'nuvemshop',
    // O caminho é /search/ com barra: /busca/ devolve 404.
    busca: (t) => `https://www.omundodasminis.com.br/search/?q=${encodeURIComponent(t)}`,
  },
  {
    nome: 'Counting Minis',
    base: 'https://www.countingminis.com.br',
    plataforma: 'loja-integrada',
    // O form real é /buscar; /busca devolve 404.
    busca: (t) => `https://www.countingminis.com.br/buscar?q=${encodeURIComponent(t)}`,
    // /bazar é descrito pela própria loja como fim de estoque, devolução e
    // seminovo. Nada dali é novo lacrado.
    caminhosProibidos: ['/bazar'],
  },
  {
    nome: 'Orangebox Miniaturas',
    base: 'https://www.orangeboxminiaturas.com.br',
    plataforma: 'loja-integrada',
    busca: (t) => `https://www.orangeboxminiaturas.com.br/buscar?q=${encodeURIComponent(t)}`,
  },
];

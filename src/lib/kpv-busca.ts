// ─── KPV: termo de busca para fonte externa ──────────────────────────────────
//
// O diagnóstico foi claro: peças que "não existiam" no eBay na verdade existiam,
// e a busca é que falhava. Dois motivos, os dois consertáveis:
//
//  1. TERMO EM PORTUGUÊS. "Velozes e Furiosos" dava ZERO no eBay US; "Fast
//     Furious" dá 3205. O mercado americano indexa em inglês.
//  2. RUÍDO. Título vira frase ("Ford F-100 vermelha transportando um Bronco"),
//     e a busca por tudo isso não casa com anúncio nenhum.
//
// Aqui fica a normalização do termo: traduz o que o mercado global usa em
// inglês e tira o ruído, mantendo marca, modelo e o que identifica a peça.

/**
 * Termos que o mercado brasileiro escreve em português mas o eBay US indexa em
 * inglês. Só entra o que foi confirmado que muda o resultado da busca.
 */
const TRADUCAO: [RegExp, string][] = [
  [/\bvelozes\s*e\s*furiosos\b/gi, 'fast furious'],
  [/\bedi(?:ç|c)(?:ã|a)o\s*limitada\b/gi, 'limited'],
  [/\bedi(?:ç|c)(?:ã|a)o\s*especial\b/gi, 'special edition'],
  [/\bexclusivo\s*(?:de\s*)?evento\b/gi, 'event exclusive'],
  // Cores: ajudam a desambiguar e o eBay as usa em inglês.
  [/\bvermelh[oa]\b/gi, 'red'],
  [/\bazul\b/gi, 'blue'],
  [/\bpret[oa]\b/gi, 'black'],
  [/\bbranc[oa]\b/gi, 'white'],
  [/\bamarel[oa]\b/gi, 'yellow'],
  [/\bverde\b/gi, 'green'],
  [/\bcinza\b/gi, 'gray'],
  [/\bprata\b/gi, 'silver'],
  [/\bdourad[oa]\b/gi, 'gold'],
  [/\blaranja\b/gi, 'orange'],
  [/\brox[oa]\b/gi, 'purple'],
];

/**
 * Ruído que não identifica peça e atrapalha a busca. Palavra de ligação, termo
 * de anúncio, e as frases que viram título ("que inclui um caminhão").
 */
const RUIDO: RegExp[] = [
  /\bminiatura(?:s)?\b/gi,
  /\bcarrinho(?:s)?\b/gi,
  /\bescala\b/gi,
  /\bpr(?:é|e)[\s-]*venda\b/gi,
  /\boficial\b/gi,
  /\bda\s*cole(?:ç|c)(?:ã|a)o\b/gi,
  /\bcole(?:ç|c)(?:ã|a)o\b/gi,
  /\blacrad[oa]\b/gi,
  /\boriginal\b/gi,
  /\bpronta\s*entrega\b/gi,
  /\btransportando\b/gi,
  /\bque\s*inclui\b/gi,
  /\baniversario\b/gi,
  /\banivers(?:á|a)rio\b/gi,
  /\b\d{1,2}(?:º|o|a)\b/gi,
  // Preposições e artigos soltos, que sobram depois das remoções.
  /\b(?:de|da|do|com|em|para|e|a|o|um|uma|no|na)\b/gi,
];

/** Escala escrita no texto (1:64, 1/43), que raramente ajuda a busca externa. */
const RE_ESCALA = /\b1\s*[:/\-]\s*\d{2,3}\b/g;

/**
 * Linha genérica que NÃO identifica a peça e, na busca, só atrapalha ("Ford
 * F-250 temática" acha menos que "Ford F-250"). Quando a linha é assim, fica de
 * fora do termo. Linha específica ("RLC", "Red Line Club", o nome do carro que
 * o vendedor jogou no campo errado) entra, porque é justamente o que faltava.
 */
const RE_LINHA_GENERICA =
  /^(mainline|b[áa]sic[oa]|tem[áa]tic[oa]|cole(?:ç|c)(?:ã|a)o|s[ée]rie|series|premium|regular|padr[ãa]o)$/i;

import type { Variante } from './kpv-identidade';

/**
 * Como o mercado global (eBay) INDEXA a variante. É diferente de como o
 * identificador guarda: lá é 'super-treasure-hunt', aqui é a frase que aparece
 * de verdade no anúncio. Sem isto, buscar um Super Treasure Hunt trazia a
 * população geral do carro (99% regular barato), o porteiro reprovava quase
 * tudo por variante, e sobrava amostra minúscula. Com a frase, o eBay já
 * devolve o conjunto certo.
 */
function fraseVariante(variante?: Variante): string {
  switch (variante) {
    case 'super-treasure-hunt': return 'super treasure hunt';
    case 'treasure-hunt': return 'treasure hunt';
    case 'chase': return 'chase';
    default: return '';
  }
}

/**
 * Monta o termo de busca para a fonte externa.
 *
 * Recebe a marca canônica, o modelo e a variante, e devolve um termo curto, em
 * inglês onde o mercado global usa inglês, sem ruído. Mantém no máximo ~8
 * palavras: busca muito longa casa com nada. Quando a peça é rara (STH/TH/
 * chase), a frase da variante é RESERVADA no termo, para o eBay já filtrar por
 * ela em vez de devolver o carro comum.
 */
export function termoBuscaExterna(
  marca: string,
  modelo: string,
  linha?: string | null,
  variante?: Variante,
): string {
  // A linha entra quando é específica: muitos vendedores põem o carro no campo
  // "linha" e deixam o modelo quase vazio ("Mexico 1991"), então sem ela a
  // busca externa procura pela coisa errada.
  const linhaUtil = linha && !RE_LINHA_GENERICA.test(linha.trim()) ? linha : '';
  let t = ` ${marca} ${modelo} ${linhaUtil} `.toLowerCase();

  for (const [re, en] of TRADUCAO) t = t.replace(re, ` ${en} `);
  t = t.replace(RE_ESCALA, ' ');
  for (const re of RUIDO) t = t.replace(re, ' ');

  const palavras = t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9#/ ]+/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length >= 2 || /\d/.test(p));

  // A frase da variante é reservada: entra inteira e o resto do termo é cortado
  // para caber nas 8 palavras, senão "hunt" cairia fora e a busca voltaria a
  // trazer o carro comum.
  const reservado = fraseVariante(variante).split(' ').filter(Boolean);
  const teto = Math.max(2, 8 - reservado.length);

  // Sem duplicar palavra (a marca costuma repetir no modelo, e a variante não
  // pode aparecer duas vezes) e respeitando o teto.
  const vistas = new Set<string>(reservado);
  const limpo: string[] = [];
  for (const p of palavras) {
    if (vistas.has(p)) continue;
    vistas.add(p);
    limpo.push(p);
    if (limpo.length >= teto) break;
  }
  return [...limpo, ...reservado].join(' ').trim();
}

// ─── KPV: de onde tirar o preço, e quando recusar o candidato ────────────────
//
// Duas decisões que o piloto contra o catálogo real provou serem obrigatórias.
//
// 1) QUAL FONTE. O Mercado Livre funciona muito bem para peça comum (um Hot
//    Wheels Mainline devolveu 58 vendedores distintos e mediana estável), e
//    falha para peça rara. O motivo não é técnico: vendedor de chase evita
//    anunciar em marketplace grande por medo do golpe do "não gostei" — o
//    comprador devolve a versão comum do mesmo carro, e a plataforma não sabe
//    distinguir. Resultado: o chase não está no catálogo de lá. Buscar chase no
//    ML devolve o REGULAR, com preço que é uma fração do real.
//
// 2) QUANDO RECUSAR. No piloto, pegar o primeiro resultado da busca casou um
//    Super Treasure Hunt de R$ 1250 com o regular de R$ 127 (+880%), e um
//    "Chevrolet Super 10" com um "Cheyenne Super 30". Sem porteiro, o KPV
//    publica número inventado, que é pior do que não publicar nada.

import type { IdentidadeKPV } from './kpv-identidade';
import { ehConjunto } from './kpv-identidade';
import { normalizarMarca } from './marcas';

export type FonteKPV = 'mercado-livre' | 'ebay';

/**
 * Marcas de tiragem pequena. Kaido House e Tarmac fazem séries de 350 a 500
 * unidades; elas circulam em mercado internacional de colecionador, não no
 * varejo brasileiro, e o ML mal tem amostra delas.
 */
const MARCAS_TIRAGEM_PEQUENA = [
  'Kaido House', 'Tarmac Works', 'Inno64', 'Pop Race', 'Stance Hunters',
  'Motorhelix', 'GCD', 'Era Car', 'MyModelCollect', 'BBR Models',
  'Storehouse Custom', 'SHOOM64',
];

/**
 * A fonte certa para esta peça.
 *
 * Variante diferente de regular manda direto para o eBay: é a peça que o
 * vendedor brasileiro não anuncia em marketplace grande.
 */
export function fonteRecomendada(id: IdentidadeKPV): FonteKPV {
  if (id.variante !== 'regular') return 'ebay';
  if (MARCAS_TIRAGEM_PEQUENA.includes(id.marca)) return 'ebay';
  // Funko: o ML BR tem o produto no catálogo mas quase sem anúncio ativo (deu
  // "0 preços" na coleta), enquanto o eBay é o maior mercado de Funko do mundo.
  if (id.marca === 'Funko') return 'ebay';
  // Canais premium de colecionador (Red Line Club, Mattel Creations): tiragem
  // limitada, vendidos direto pela fabricante; o ML BR não tem e casa com o
  // REGULAR do mesmo carro. Foi o que aconteceu com o "Mattel Creations Daniel
  // Arsham 1973 Porsche 911", que o ML casou com um "Eroded Mustang". Vão pro
  // eBay, onde o mercado desses exclusivos de fato existe.
  if (RE_CANAL_EXCLUSIVO.test(id.linha ?? '') || RE_CANAL_EXCLUSIVO.test(id.modelo ?? '')) {
    return 'ebay';
  }
  return 'mercado-livre';
}

/**
 * Canal premium de colecionador que o ML BR não cobre bem. "creations" sozinho
 * entra porque a normalização da identidade tira "Mattel" e sobra só ela no
 * modelo ("creations daniel arsham..."); no catálogo de diecast "creations" é
 * sempre a série Mattel Creations.
 */
const RE_CANAL_EXCLUSIVO = /\b(red\s*line\s*club|rlc|creations)\b/i;

/**
 * Marcas que, na prática, só fabricam 1:64.
 *
 * Não é atalho: é o que essas marcas de fato produzem. Hot Wheels e Matchbox
 * não têm linha 1:18, e Mini GT e Kaido House nasceram 1:64. Deixar de fora
 * quem tem várias escalas de verdade (Bburago faz 1:18 e 1:24, Maisto e
 * Greenlight idem), porque ali presumir seria chute e escala errada muda o
 * preço em cinco vezes.
 */
const SO_1_64 = [
  'Hot Wheels', 'Matchbox', 'Mini GT', 'Kaido House', 'Inno64',
  'Pop Race', 'Tarmac Works', 'Majorette', 'Tomica', 'Time Micro',
  'Stance Hunters', 'Motorhelix', 'GCD', 'Era Car',
];

/** Escala que a marca permite assumir quando a fonte não declara. */
export function escalaPresumida(marca: string | null | undefined): string | null {
  const m = normalizarMarca(marca).marca;
  // Funko não tem escala: 'unica' é o sentinela que faz os dois lados baterem
  // (senão a guarda de escala reprovaria todo Funko por "não presumível").
  if (m === 'Funko') return 'unica';
  return m && SO_1_64.includes(m) ? '1:64' : null;
}

export interface Veredito {
  serve: boolean;
  /** Por que recusou. Vira relatório, não só um booleano perdido. */
  motivo?: string;
}

/**
 * O candidato da fonte externa é a MESMA peça que o nosso anúncio?
 *
 * Recusa por padrão. Cada regra aqui saiu de um erro real do piloto.
 */
export function candidatoServe(nossa: IdentidadeKPV, candidato: IdentidadeKPV): Veredito {
  // 1) Variante. O erro mais caro: STH casado com o regular, 10x de diferença.
  if (nossa.variante !== candidato.variante) {
    return { serve: false, motivo: `variante diferente (nosso ${nossa.variante}, candidato ${candidato.variante})` };
  }

  // 2) Escala. "Bburago Ferrari 296 GTB 1:41" casou com um 1:24.
  //
  //    A fonte externa muitas vezes não declara escala (foi o maior motivo de
  //    recusa no piloto: 11 de 45). Quando a marca só fabrica numa escala, dá
  //    para completar sem chutar — Hot Wheels e Matchbox não fazem 1:18.
  const e1 = nossa.escala ?? escalaPresumida(nossa.marca);
  const e2 = candidato.escala ?? escalaPresumida(candidato.marca);
  if (!e1 || !e2) {
    return { serve: false, motivo: 'escala não declarada e não presumível' };
  }
  if (e1 !== e2) {
    return { serve: false, motivo: `escala diferente (${e1} vs ${e2})` };
  }

  // 3) Marca. O ML registrou um Mini GT como "Multimatic".
  if (normalizarMarca(nossa.marca).marca !== normalizarMarca(candidato.marca).marca) {
    return { serve: false, motivo: `marca diferente (${nossa.marca} vs ${candidato.marca})` };
  }

  // 3b) Código de catálogo, quando os DOIS lados declaram. O "#NNNN" do Mini GT
  //     (e os códigos de fábrica de Kaido/Tarmac/Inno) é numeração de coleção de
  //     verdade: código diferente = peça diferente, mesmo com modelo parecido. O
  //     "LB Works R35 SD5 #718" casou com o "Nissan GT-R Nismo #1089" porque
  //     "nissan gt r35" sozinho já dava 75% de sobreposição; o código separa.
  if (nossa.codigo && candidato.codigo && nossa.codigo !== candidato.codigo) {
    return { serve: false, motivo: `código diferente (${nossa.codigo} vs ${candidato.codigo})` };
  }

  // 4) Linha, quando os dois lados declaram. Um "Porsche 911 GT3 RS Then and
  //    Now" casou com o "Fast & Furious" do mesmo carro: mesmo molde, séries
  //    diferentes, preços diferentes.
  if (nossa.linha && candidato.linha) {
    const l1 = nossa.linha.toLowerCase().trim();
    const l2 = candidato.linha.toLowerCase().trim();
    if (l1 !== l2 && !l1.includes(l2) && !l2.includes(l1)) {
      return { serve: false, motivo: `linha diferente (${nossa.linha} vs ${candidato.linha})` };
    }
  }

  // 5) Modelo. "Kaido House DGK Trueno" casou com "Honda NSX Kaido Works".
  //
  //    Quando o vendedor jogou o carro no campo "linha" ("McLaren MP4/6 Senna")
  //    e deixou o modelo quase vazio ("Mexico 1991"), a comparação só do modelo
  //    não bate. Então consideramos também modelo+linha, e ficamos com o melhor.
  //    É seguro contra regressão: semelhancaModelo divide pelo MENOR conjunto e
  //    aqui pegamos o max, então um par que já passava nunca passa a reprovar.
  const modeloMaisLinha = nossa.linha ? `${nossa.modelo} ${nossa.linha}` : nossa.modelo;
  const sim = Math.max(
    semelhancaModelo(nossa.modelo, candidato.modelo),
    semelhancaModelo(modeloMaisLinha, candidato.modelo),
  );
  if (sim < 0.5) {
    return { serve: false, motivo: `modelo pouco parecido (${(sim * 100).toFixed(0)}% de sobreposição)` };
  }

  // 6) Sobreposição ABSOLUTA, não só proporcional. "Mclaren Formula 1 Team"
  //    casou com "McLaren Solus" porque a palavra "mclaren" sozinha já dava
  //    50% num nome de duas palavras. Nome curto precisa de duas palavras em
  //    comum para ser a mesma peça; com uma só, é a montadora batendo.
  const comuns = Math.max(
    palavrasComuns(nossa.modelo, candidato.modelo),
    palavrasComuns(modeloMaisLinha, candidato.modelo),
  );
  if (comuns < 2 && contarPalavras(nossa.modelo) >= 2 && contarPalavras(candidato.modelo) >= 2) {
    return { serve: false, motivo: `só ${comuns} palavra em comum no modelo` };
  }

  // 7) Conjunto vs peça única. Um kit "F-100 transportando um Bronco" casou com
  //    um "M2 Hauler Fanta F-100": mesmo veículo principal, produtos
  //    diferentes. Conjunto só compara com conjunto.
  if (ehConjunto(nossa.modelo) !== ehConjunto(candidato.modelo)) {
    return { serve: false, motivo: 'conjunto de veículos de um lado só' };
  }

  return { serve: true };
}

/**
 * Sobreposição entre dois nomes de modelo, de 0 a 1.
 *
 * Jaccard sobre as palavras com 2+ letras, ignorando cor: "Verde" e "Branco"
 * aparecem no nome do produto do ML e não mudam a identidade da peça, mas
 * derrubariam a semelhança de um par que é o mesmo carro.
 */
const CORES = /^(preto|preta|branco|branca|vermelho|vermelha|azul|verde|amarelo|amarela|cinza|prata|dourado|dourada|laranja|roxo|rosa|marrom|bege|black|white|red|blue|green|yellow|grey|gray|silver|gold|orange|purple|pink|brown)$/i;

const tokens = (s: string) => new Set(
  s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !CORES.test(t)),
);

/** Quantas palavras os dois modelos têm em comum, ignorando cor. */
export function palavrasComuns(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n;
}

/** Palavras úteis do modelo (sem cor, sem token de uma letra). */
export function contarPalavras(s: string): number {
  return tokens(s).size;
}

export function semelhancaModelo(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let comuns = 0;
  for (const t of A) if (B.has(t)) comuns++;
  // Divide pelo MENOR conjunto: o nome do ML costuma ser mais longo (traz cor,
  // código e loja), e Jaccard puro punia o par certo por isso.
  return comuns / Math.min(A.size, B.size);
}

// ─── Preço em dólar → real ───────────────────────────────────────────────────

export interface CustoImportacao {
  /** Cotação do dólar no dia da coleta. */
  cambio: number;
  /** Frete internacional em USD, quando a fonte informa. */
  freteUsd?: number;
  /**
   * Imposto de importação, em fração (0.6 = 60%). NÃO tem valor padrão de
   * propósito: a regra brasileira muda, e chutar aqui viraria número errado
   * dentro de uma referência que se apresenta como confiável. Quem chama
   * informa a alíquota vigente.
   */
  importacao: number;
  /** ICMS estadual, em fração (0.17 = 17%). Também varia por estado. */
  icms: number;
}

export interface PrecoConvertido {
  /** Só a conversão cambial, sem imposto. O valor da peça no mercado global. */
  valorDaPecaEmReais: number;
  /** O que custa TER a peça no Brasil: peça + frete + impostos. */
  custoDesembarcadoEmReais: number;
}

/**
 * Converte preço de fonte internacional.
 *
 * Devolve os DOIS números de propósito. Eles respondem perguntas diferentes:
 *
 *  - `valorDaPeca` responde "quanto essa peça vale no mundo".
 *  - `custoDesembarcado` responde "quanto custa para um brasileiro trazer uma".
 *
 * O segundo é o que serve de teto para o preço na Kolecta: se importar sai por
 * R$ 800, ninguém paga muito mais que isso aqui. Usar o primeiro como
 * referência subestimaria o mercado brasileiro, e foi por isso que o Guilherme
 * insistiu em considerar a taxa.
 */
export function converterDeDolar(precoUsd: number, custo: CustoImportacao): PrecoConvertido {
  const peca = Math.max(0, precoUsd) * custo.cambio;
  const frete = Math.max(0, custo.freteUsd ?? 0) * custo.cambio;
  // Imposto de importação incide sobre peça + frete; o ICMS incide por dentro
  // sobre o total já com o II, que é como a Receita calcula.
  const comII = (peca + frete) * (1 + custo.importacao);
  const comICMS = comII / (1 - custo.icms);
  return {
    valorDaPecaEmReais: arredondar(peca),
    custoDesembarcadoEmReais: arredondar(comICMS),
  };
}

const arredondar = (v: number) => Math.round(v * 100) / 100;

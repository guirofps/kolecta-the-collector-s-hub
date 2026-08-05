// ─── KPV: da amostra bruta para a referência publicável ──────────────────────
//
// Este arquivo é o juiz. Recebe preços coletados nas fontes externas e decide
// se dá para publicar uma referência, qual é ela, e com que confiança.
//
// A regra que atravessa tudo: NÃO PUBLICAR é uma resposta legítima e frequente.
// Um número errado embaixo do anúncio é pior que nenhum, porque o comprador
// confia nele para decidir e o vendedor é acusado de inflar preço sem ter
// inflado. Cada guarda aqui existe para preferir o silêncio ao palpite.

import type { Variante } from './kpv-identidade';

export type FonteAmostra = 'mercado-livre' | 'ebay' | 'loja';

/** Um preço observado numa fonte externa, já convertido para reais. */
export interface AmostraPreco {
  /** Em centavos, para não arrastar erro de ponto flutuante. */
  precoEmCentavos: number;
  fonte: FonteAmostra;
  /**
   * Quem está vendendo. Dois anúncios do mesmo vendedor não são duas
   * observações independentes do mercado, são a mesma opinião repetida.
   */
  vendedorId: string;
  /** URL do anúncio, para auditar depois de onde o número saiu. */
  url?: string;
  /** Moeda original, quando houve conversão. Só para transparência. */
  moedaOriginal?: string;
}

export type Confianca = 'baixa' | 'media' | 'alta';

/** Faixas de tamanho de amostra. Vieram fechadas do produto. */
export const MINIMO_PARA_PUBLICAR = 3;
const FAIXA_MEDIA = 6;
const FAIXA_ALTA = 15;

/** Acima disso, um vendedor só está mandando na amostra. */
const CONCENTRACAO_MAXIMA = 0.5;

/**
 * Abaixo deste tamanho, não se remove outlier.
 *
 * Quartil de cinco números não descreve distribuição nenhuma, e "remover o
 * extremo" de uma amostra minúscula é só jogar fora dado real até sobrar o que
 * confirma o que já se esperava.
 */
const MINIMO_PARA_OUTLIER = 8;

export interface ReferenciaKPV {
  publicavel: true;
  /** O número que aparece embaixo do anúncio, em centavos. */
  medianaEmCentavos: number;
  /** Faixa usual: o miolo da amostra, sem os extremos. */
  p25EmCentavos: number;
  p75EmCentavos: number;
  minEmCentavos: number;
  maxEmCentavos: number;
  /** Vendedores distintos que sobraram depois de toda a limpeza. */
  amostra: number;
  confianca: Confianca;
  /** Quantos preços saíram por serem extremos, e quais eram. */
  outliersRemovidos: number[];
  /** De onde vieram os dados, com quantos vendedores cada fonte deu. */
  fontes: Record<string, number>;
  /** Fatia do maior vendedor, de 0 a 1. */
  concentracao: number;
  /** Por que a confiança não é maior do que é. */
  ressalvas: string[];
}

export interface RecusaKPV {
  publicavel: false;
  motivo: string;
  /** Quantos vendedores sobraram. Ajuda a decidir se vale buscar mais fonte. */
  amostra: number;
}

export type ResultadoKPV = ReferenciaKPV | RecusaKPV;

// ─── Estatística ─────────────────────────────────────────────────────────────

/** Mediana de uma lista JÁ ORDENADA. */
function mediana(v: number[]): number {
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

/**
 * Percentil por interpolação linear, sobre lista já ordenada.
 *
 * O método do índice truncado, que eu usei no piloto, devolvia o mesmo valor
 * para p25 e p75 em amostras pequenas, e a "faixa usual" saía como um ponto só.
 */
function percentil(v: number[], p: number): number {
  if (v.length === 1) return v[0];
  const pos = (v.length - 1) * p;
  const base = Math.floor(pos);
  const resto = pos - base;
  if (base + 1 >= v.length) return v[v.length - 1];
  return Math.round(v[base] + resto * (v[base + 1] - v[base]));
}

// ─── Consolidação ────────────────────────────────────────────────────────────

export interface OpcoesConsolidacao {
  /**
   * Variante da peça. Chase e Treasure Hunt têm amostra naturalmente pequena
   * (tiragem baixa), então exigir 15 vendedores para confiança alta os
   * condenaria a nunca ter referência. A faixa continua a mesma, mas a
   * ressalva sai escrita.
   */
  variante?: Variante;
}

/**
 * Transforma amostras brutas numa referência publicável, ou recusa.
 *
 * A ordem importa e cada passo tem motivo:
 *
 *  1. Um preço por vendedor (o menor). Loja com 10 anúncios do mesmo carro não
 *     vale 10 votos.
 *  2. Fora os extremos, mas só quando a amostra comporta. Preço muito acima da
 *     mediana costuma ser variante não declarada (um chase anunciado como
 *     comum), e deixá-lo dentro puxa a referência do carro comum para cima.
 *  3. Confiança pelo que SOBROU, não pelo que entrou.
 */
export function consolidar(
  amostras: AmostraPreco[],
  opcoes: OpcoesConsolidacao = {},
): ResultadoKPV {
  const validas = amostras.filter(
    (a) => Number.isFinite(a.precoEmCentavos) && a.precoEmCentavos > 0,
  );
  if (!validas.length) return { publicavel: false, motivo: 'nenhum preço coletado', amostra: 0 };

  // 1) Um preço por vendedor. O menor, porque é o que ele de fato aceita.
  const porVendedor = new Map<string, AmostraPreco>();
  for (const a of validas) {
    const atual = porVendedor.get(a.vendedorId);
    if (!atual || a.precoEmCentavos < atual.precoEmCentavos) porVendedor.set(a.vendedorId, a);
  }
  const unicas = [...porVendedor.values()].sort((x, y) => x.precoEmCentavos - y.precoEmCentavos);

  // Concentração é medida ANTES do dedup: é a proporção de anúncios do maior
  // vendedor no que foi coletado, não no que sobrou.
  const contagem = new Map<string, number>();
  for (const a of validas) contagem.set(a.vendedorId, (contagem.get(a.vendedorId) ?? 0) + 1);
  const concentracao = Math.max(...contagem.values()) / validas.length;

  if (unicas.length < MINIMO_PARA_PUBLICAR) {
    return {
      publicavel: false,
      motivo: `só ${unicas.length} vendedor${unicas.length === 1 ? '' : 'es'} distinto${unicas.length === 1 ? '' : 's'}, mínimo é ${MINIMO_PARA_PUBLICAR}`,
      amostra: unicas.length,
    };
  }

  // 2) Extremos fora, quando a amostra comporta.
  let precos = unicas.map((a) => a.precoEmCentavos);
  const outliersRemovidos: number[] = [];
  if (precos.length >= MINIMO_PARA_OUTLIER) {
    const q1 = percentil(precos, 0.25);
    const q3 = percentil(precos, 0.75);
    const iqr = q3 - q1;
    const piso = q1 - 1.5 * iqr;
    const teto = q3 + 1.5 * iqr;
    const dentro: number[] = [];
    for (const p of precos) (p < piso || p > teto ? outliersRemovidos : dentro).push(p);
    // Só aceita a limpeza se ela não devorou a amostra.
    if (dentro.length >= MINIMO_PARA_PUBLICAR) precos = dentro;
    else outliersRemovidos.length = 0;
  }

  const n = precos.length;
  const ressalvas: string[] = [];

  // 3) Confiança pelo que sobrou.
  let confianca: Confianca = n >= FAIXA_ALTA ? 'alta' : n >= FAIXA_MEDIA ? 'media' : 'baixa';

  if (confianca === 'alta' && concentracao > CONCENTRACAO_MAXIMA) {
    confianca = 'media';
    ressalvas.push(`um vendedor responde por ${Math.round(concentracao * 100)}% dos anúncios`);
  }

  const fontes: Record<string, number> = {};
  for (const a of unicas) fontes[a.fonte] = (fontes[a.fonte] ?? 0) + 1;

  // Fonte única nunca chega em alta: um marketplace só mostra o preço daquele
  // marketplace, com as taxas e o público dele, não o preço da peça.
  if (confianca === 'alta' && Object.keys(fontes).length === 1) {
    confianca = 'media';
    ressalvas.push('todos os preços vieram de uma fonte só');
  }

  if (opcoes.variante && opcoes.variante !== 'regular') {
    ressalvas.push(`peça de tiragem baixa (${opcoes.variante}): amostra pequena é esperada`);
  }

  if (outliersRemovidos.length) {
    ressalvas.push(
      `${outliersRemovidos.length} preço(s) extremo(s) fora da conta, possível variante não declarada`,
    );
  }

  return {
    publicavel: true,
    medianaEmCentavos: mediana(precos),
    p25EmCentavos: percentil(precos, 0.25),
    p75EmCentavos: percentil(precos, 0.75),
    minEmCentavos: precos[0],
    maxEmCentavos: precos[n - 1],
    amostra: n,
    confianca,
    outliersRemovidos,
    fontes,
    concentracao,
    ressalvas,
  };
}

// ─── A nota que aparece embaixo do anúncio ───────────────────────────────────

export type Nota = 'abaixo' | 'dentro' | 'acima';

export interface AvaliacaoAnuncio {
  nota: Nota;
  /** Diferença percentual em relação à mediana, arredondada. */
  diferencaPercentual: number;
  /** Frase pronta para a interface. */
  texto: string;
}

/**
 * Compara o preço de um anúncio com a referência.
 *
 * Usa a FAIXA (p25 a p75), não a mediana, para decidir a nota. Comparar com a
 * mediana faria metade dos anúncios honestos aparecerem como "acima do
 * mercado", o que é injusto com o vendedor e inútil para o comprador: numa
 * distribuição normal, metade sempre está acima do meio.
 */
export function avaliarAnuncio(
  precoEmCentavos: number,
  ref: ReferenciaKPV,
): AvaliacaoAnuncio {
  const dif = Math.round((precoEmCentavos / ref.medianaEmCentavos - 1) * 100);
  if (precoEmCentavos < ref.p25EmCentavos) {
    return { nota: 'abaixo', diferencaPercentual: dif, texto: 'Abaixo do preço de mercado' };
  }
  if (precoEmCentavos > ref.p75EmCentavos) {
    return { nota: 'acima', diferencaPercentual: dif, texto: 'Acima do preço de mercado' };
  }
  return { nota: 'dentro', diferencaPercentual: dif, texto: 'Dentro do preço de mercado' };
}

// ─── Validade ────────────────────────────────────────────────────────────────

/**
 * Uma referência não vale para sempre, mas também não muda toda semana.
 * O produto definiu refresh de 6 a 12 meses; usamos 6 como alvo e 12 como
 * limite duro, depois do qual o número deixa de ser exibido.
 */
export const MESES_ATE_REVISAR = 6;
export const MESES_ATE_EXPIRAR = 12;

export type EstadoReferencia = 'fresca' | 'revisar' | 'expirada';

/** Em que estado está uma referência calculada em `emISO`. */
export function estadoDaReferencia(emISO: string, agora: Date = new Date()): EstadoReferencia {
  const em = new Date(emISO);
  if (Number.isNaN(em.getTime())) return 'expirada';
  const meses = (agora.getTime() - em.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (meses >= MESES_ATE_EXPIRAR) return 'expirada';
  if (meses >= MESES_ATE_REVISAR) return 'revisar';
  return 'fresca';
}

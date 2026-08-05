// ─── KPV no anúncio: gravar e ler ────────────────────────────────────────────
//
// A referência mora em `attributes` (o JSON que o anúncio já tem e que a API já
// devolve). É o mesmo caminho da pré-venda, e pela mesma razão: dá para pôr no
// ar hoje, sem tabela nova nem endpoint novo no backend.
//
// Quando o volume justificar tabela própria (histórico de preço, série
// temporal, alerta de variação), a migração é mecânica: o formato aqui já é o
// que uma tabela teria.

import {
  avaliarAnuncio, estadoDaReferencia,
  type ReferenciaKPV, type Confianca, type AvaliacaoAnuncio,
} from './kpv-referencia';

/** Como a referência fica gravada no anúncio. Prefixo `kpv` para não colidir. */
export interface KpvGravado {
  kpvMedianaEmCentavos: number;
  kpvP25EmCentavos: number;
  kpvP75EmCentavos: number;
  kpvAmostra: number;
  kpvConfianca: Confianca;
  /** Fontes e quantos vendedores cada uma deu, ex: "mercado-livre:56". */
  kpvFontes: string;
  /** ISO da apuração. Define quando revisar e quando parar de exibir. */
  kpvApuradoEm: string;
  kpvRessalvas?: string;
}

/** Monta o bloco que vai para `attributes`. */
export function gravarKpv(ref: ReferenciaKPV, apuradoEmISO: string): KpvGravado {
  return {
    kpvMedianaEmCentavos: ref.medianaEmCentavos,
    kpvP25EmCentavos: ref.p25EmCentavos,
    kpvP75EmCentavos: ref.p75EmCentavos,
    kpvAmostra: ref.amostra,
    kpvConfianca: ref.confianca,
    kpvFontes: Object.entries(ref.fontes).map(([f, n]) => `${f}:${n}`).join(','),
    kpvApuradoEm: apuradoEmISO,
    ...(ref.ressalvas.length ? { kpvRessalvas: ref.ressalvas.join('; ') } : {}),
  };
}

export interface KpvExibivel {
  medianaEmCentavos: number;
  p25EmCentavos: number;
  p75EmCentavos: number;
  amostra: number;
  confianca: Confianca;
  fontes: { nome: string; vendedores: number }[];
  apuradoEm: string;
  /** Passou dos 6 meses: ainda exibe, mas avisa que está para revisar. */
  desatualizada: boolean;
  ressalvas: string[];
  /** Como este anúncio se posiciona. Null quando o anúncio não tem preço. */
  avaliacao: AvaliacaoAnuncio | null;
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Lê a referência de `attributes` para exibir, ou null.
 *
 * Recusa em silêncio quando falta peça ou quando a apuração expirou. Um preço
 * de referência de dois anos atrás é pior que nenhum: o comprador confia nele
 * do mesmo jeito, sem saber que está velho.
 */
export function lerKpv(
  attrs: Record<string, unknown> | null | undefined,
  precoDoAnuncioEmCentavos?: number | null,
  agora: Date = new Date(),
): KpvExibivel | null {
  if (!attrs) return null;
  const mediana = num(attrs.kpvMedianaEmCentavos);
  const p25 = num(attrs.kpvP25EmCentavos);
  const p75 = num(attrs.kpvP75EmCentavos);
  const amostra = num(attrs.kpvAmostra);
  const apuradoEm = typeof attrs.kpvApuradoEm === 'string' ? attrs.kpvApuradoEm : '';
  if (!mediana || !p25 || !p75 || !amostra || !apuradoEm) return null;
  // Faixa invertida indica dado corrompido; não dá para exibir com confiança.
  if (p25 > p75) return null;

  const estado = estadoDaReferencia(apuradoEm, agora);
  if (estado === 'expirada') return null;

  const confianca = (['baixa', 'media', 'alta'] as const)
    .find((c) => c === attrs.kpvConfianca) ?? 'baixa';

  const fontes = String(attrs.kpvFontes ?? '')
    .split(',')
    .map((par) => par.split(':'))
    .filter((p) => p[0])
    .map(([nome, n]) => ({ nome, vendedores: Number(n) || 0 }));

  const ref: ReferenciaKPV = {
    publicavel: true,
    medianaEmCentavos: mediana,
    p25EmCentavos: p25,
    p75EmCentavos: p75,
    minEmCentavos: p25,
    maxEmCentavos: p75,
    amostra,
    confianca,
    outliersRemovidos: [],
    fontes: Object.fromEntries(fontes.map((f) => [f.nome, f.vendedores])),
    concentracao: 0,
    ressalvas: [],
  };

  return {
    medianaEmCentavos: mediana,
    p25EmCentavos: p25,
    p75EmCentavos: p75,
    amostra,
    confianca,
    fontes,
    apuradoEm,
    desatualizada: estado === 'revisar',
    ressalvas: String(attrs.kpvRessalvas ?? '').split(';').map((s) => s.trim()).filter(Boolean),
    avaliacao: precoDoAnuncioEmCentavos
      ? avaliarAnuncio(precoDoAnuncioEmCentavos, ref)
      : null,
  };
}

/**
 * Nome amigável da fonte. USO INTERNO (admin, auditoria, scripts).
 *
 * Não aparece na vitrine: a Kolecta não cita marketplace concorrente na
 * própria página de produto. A procedência fica gravada para conferência, mas
 * o comprador vê "Levantamento Kolecta".
 */
export function rotuloFonte(nome: string): string {
  const mapa: Record<string, string> = {
    'mercado-livre': 'Mercado Livre',
    ebay: 'eBay',
    loja: 'lojas especializadas',
  };
  return mapa[nome] ?? nome;
}

/**
 * Frase que explica a confiança, SEM citar o tamanho da amostra.
 *
 * O número de vendedores é contagem de anúncio EXTERNO, e exibi-lo dentro da
 * Kolecta dá a entender que são vendedores daqui. Quem entende o contrário
 * percebe de onde o dado veio, o que é o mesmo motivo pelo qual o nome das
 * fontes não aparece. O tamanho da amostra continua gravado no anúncio e
 * continua definindo a confiança; ele só não vira texto na vitrine.
 */
export function explicarConfianca(c: Confianca): string {
  if (c === 'alta') return 'levantamento amplo, confirmado em mais de uma fonte';
  if (c === 'media') return 'levantamento consistente';
  return 'levantamento inicial: use como indicação, não como regra';
}

// Agregações do painel de Analytics do admin.
//
// Camada 1: tudo aqui sai de dados que o backend JÁ entrega (a listagem
// completa de anúncios). Nada depende de rastreamento de sessão, que ainda não
// existe: visitantes, carrinho e "ao vivo" entram quando a tabela de eventos
// for criada (ver docs/pendencias-backend.md).
//
// Funções puras, com `agora` injetável, para o resultado não depender do
// relógio na hora do teste.

import type { Listing } from './api';

/** Meia-noite do dia da data, no fuso local. */
function inicioDoDia(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Chave AAAA-MM-DD no fuso local, que é como o admin lê a data. */
export function chaveDoDia(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

const dataDe = (l: Listing) => new Date(l.createdAt);

// ─── Ritmo de criação ───────────────────────────────────────────────────────

export interface PontoDoDia {
  dia: string;
  /** Rótulo curto para o eixo do gráfico (05/07). */
  rotulo: string;
  criados: number;
}

/**
 * Quantos anúncios entraram por dia nos últimos N dias.
 *
 * Inclui dia com zero de propósito: uma série que pula os dias vazios esconde
 * exatamente o que interessa, que é quando o movimento parou.
 */
export function criadosPorDia(
  listings: Listing[],
  dias = 30,
  agora: Date = new Date(),
): PontoDoDia[] {
  const contagem = new Map<string, number>();
  for (const l of listings) {
    const d = dataDe(l);
    if (Number.isNaN(d.getTime())) continue;
    const k = chaveDoDia(d);
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }

  const saida: PontoDoDia[] = [];
  const base = inicioDoDia(agora);
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const k = chaveDoDia(d);
    saida.push({
      dia: k,
      rotulo: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      criados: contagem.get(k) ?? 0,
    });
  }
  return saida;
}

/** Quantos anúncios entraram desde a meia-noite de hoje. */
export function criadosHoje(listings: Listing[], agora: Date = new Date()): number {
  const hoje = chaveDoDia(agora);
  return listings.filter((l) => chaveDoDia(dataDe(l)) === hoje).length;
}

/** Quantos entraram nos últimos N dias, contando o dia de hoje. */
export function criadosNosUltimos(
  listings: Listing[],
  dias: number,
  agora: Date = new Date(),
): number {
  const corte = inicioDoDia(agora);
  corte.setDate(corte.getDate() - (dias - 1));
  return listings.filter((l) => dataDe(l).getTime() >= corte.getTime()).length;
}

// ─── Funil de moderação ─────────────────────────────────────────────────────

export interface FunilModeracao {
  total: number;
  aguardando: number;
  noAr: number;
  reprovados: number;
  outros: number;
  /** Aprovados sobre o que já foi decidido. `null` quando nada foi decidido. */
  taxaAprovacao: number | null;
}

const AGUARDANDO = ['draft', 'pending_review'];

export function funilModeracao(listings: Listing[]): FunilModeracao {
  let aguardando = 0;
  let noAr = 0;
  let reprovados = 0;
  let outros = 0;

  for (const l of listings) {
    if (AGUARDANDO.includes(l.status)) aguardando++;
    else if (l.status === 'active') noAr++;
    else if (l.status === 'rejected') reprovados++;
    else outros++;
  }

  // Sobre o DECIDIDO, não sobre o total: com a fila cheia, dividir pelo total
  // faria a taxa despencar sem que ninguém tivesse reprovado nada.
  const decididos = noAr + reprovados;
  return {
    total: listings.length,
    aguardando,
    noAr,
    reprovados,
    outros,
    taxaAprovacao: decididos > 0 ? noAr / decididos : null,
  };
}

/** Há quantos dias o anúncio mais antigo está esperando decisão. */
export function esperaMaisAntiga(listings: Listing[], agora: Date = new Date()): number | null {
  const fila = listings.filter((l) => AGUARDANDO.includes(l.status));
  if (fila.length === 0) return null;
  const maisAntigo = Math.min(...fila.map((l) => dataDe(l).getTime()));
  if (!Number.isFinite(maisAntigo)) return null;
  return Math.floor((agora.getTime() - maisAntigo) / (24 * 60 * 60 * 1000));
}

// ─── Vendedores ─────────────────────────────────────────────────────────────

export interface VendedorAtivo {
  id: string;
  nome: string;
  noAr: number;
  aguardando: number;
  total: number;
}

/**
 * Vendedores ordenados por quantos itens têm no ar.
 *
 * Conta separado o que está no ar e o que aguarda: um vendedor com 300 na fila
 * e 2 publicados é um problema, e a soma sozinha esconderia isso.
 */
export function vendedores(listings: Listing[], quantos = 10): VendedorAtivo[] {
  const mapa = new Map<string, VendedorAtivo>();
  for (const l of listings) {
    const id = l.sellerId;
    if (!id) continue;
    const atual = mapa.get(id) ?? {
      id,
      nome: (l.sellerName ?? '').trim() || 'Sem nome',
      noAr: 0,
      aguardando: 0,
      total: 0,
    };
    if (l.status === 'active') atual.noAr++;
    if (AGUARDANDO.includes(l.status)) atual.aguardando++;
    atual.total++;
    if (!mapa.has(id)) mapa.set(id, atual);
  }
  return [...mapa.values()]
    .sort((a, b) => b.noAr - a.noAr || b.total - a.total)
    .slice(0, quantos);
}

/** Quantos vendedores distintos têm pelo menos um anúncio no ar. */
export function vendedoresComItemNoAr(listings: Listing[]): number {
  return new Set(listings.filter((l) => l.status === 'active').map((l) => l.sellerId)).size;
}

// ─── Catálogo ───────────────────────────────────────────────────────────────

export interface FatiaCategoria {
  categoria: string;
  noAr: number;
}

export function catalogoPorCategoria(listings: Listing[]): FatiaCategoria[] {
  const conta = new Map<string, number>();
  for (const l of listings) {
    if (l.status !== 'active') continue;
    const k = l.categoryId ?? 'sem-categoria';
    conta.set(k, (conta.get(k) ?? 0) + 1);
  }
  return [...conta.entries()]
    .map(([categoria, noAr]) => ({ categoria, noAr }))
    .sort((a, b) => b.noAr - a.noAr);
}

export interface FaixaPreco {
  faixa: string;
  itens: number;
}

/** Distribuição de preço do que está no ar, para enxergar o perfil do acervo. */
export function faixasDePreco(listings: Listing[]): FaixaPreco[] {
  const limites = [
    { faixa: 'até R$ 50', max: 50 },
    { faixa: 'R$ 50 a 150', max: 150 },
    { faixa: 'R$ 150 a 300', max: 300 },
    { faixa: 'R$ 300 a 1.000', max: 1000 },
    { faixa: 'acima de R$ 1.000', max: Infinity },
  ];
  const saida = limites.map((l) => ({ faixa: l.faixa, itens: 0 }));

  for (const l of listings) {
    if (l.status !== 'active') continue;
    const cents = l.priceInCents ?? l.startingBidInCents;
    if (cents == null) continue;
    const reais = cents / 100;
    const i = limites.findIndex((lim) => reais <= lim.max);
    if (i >= 0) saida[i].itens++;
  }
  return saida;
}

/** Soma do que está no ar, em centavos. É o tamanho da vitrine, não vendas. */
export function valorDoCatalogoEmCentavos(listings: Listing[]): number {
  return listings
    .filter((l) => l.status === 'active')
    .reduce((total, l) => total + (l.priceInCents ?? l.startingBidInCents ?? 0), 0);
}

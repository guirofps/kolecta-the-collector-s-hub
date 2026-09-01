// Montagem das seções da home a partir de uma única listagem da API.
//
// A home puxava 40 anúncios e mostrava 5. Com o catálogo real (136 ativos, 93%
// deles miniaturas diecast e 56 de um vendedor só) isso deixava a vitrine com
// cara de loja de um vendedor, e não de marketplace.
//
// Tudo aqui é função pura sobre `Listing[]`: uma requisição só alimenta
// destaques, novidades, leilões, lojas e a contagem por categoria. Sem isso
// seriam quatro chamadas para os mesmos dados.

import type { Listing } from './api';
import { isListingFeatured } from './api';
import { leilaoAberto } from './leilao';
import type { Product, ProductCondition } from './mock-data';

// ─── Conversão para o formato do ProductCard ────────────────────────────────

/** Fotos vêm como JSON stringificado; anúncio sem foto cai no placeholder. */
export function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return ['/placeholder.svg'];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['/placeholder.svg'];
  } catch {
    return raw.startsWith('http') ? [raw] : ['/placeholder.svg'];
  }
}

export function toProduct(l: Listing): Product {
  return {
    id: l.id,
    title: l.title,
    slug: l.id,
    images: parseImages(l.images),
    category: '',
    categorySlug: l.categoryId ?? '',
    subcategorySlug: '',
    condition: (l.condition as ProductCondition) ?? 'novo',
    type: l.type,
    price: l.priceInCents != null ? l.priceInCents / 100 : undefined,
    seller: {
      id: l.sellerId,
      name: l.sellerName || 'Vendedor Kolecta',
      slug: l.sellerId,
      storeSlug: l.sellerSlug ?? null,
      avatar: '/placeholder.svg',
      verified: true,
      rating: 5,
      totalSales: 10,
      location: '',
      since: '',
    },
    description: l.description ?? '',
    details: {},
    featured: isListingFeatured(l),
    tags: [],
    status: l.status,
    createdAt: l.createdAt,
    stock: l.stock ?? null,
    // Sem estes campos o card do leilão cai no `|| 0` e mostra "R$ 0,00".
    auctionId: l.auctionId ?? undefined,
    startingBid: l.startingBidInCents != null ? l.startingBidInCents / 100 : undefined,
    currentBid: l.currentBidInCents != null ? l.currentBidInCents / 100 : undefined,
    bidsCount: l.bidsCount ?? 0,
    auctionEndsAt: l.endsAt ?? undefined,
    auctionPaused: Boolean(l.auctionPausedAt),
    shippingSubsidy:
      l.shippingSubsidyMaxInCents != null
        ? l.shippingSubsidyMaxInCents / 100
        : undefined,
  } as Product;
}

// ─── Seções ─────────────────────────────────────────────────────────────────

const preco = (l: Listing) => l.priceInCents ?? l.startingBidInCents ?? 0;
const quando = (l: Listing) => new Date(l.createdAt ?? 0).getTime() || 0;

/**
 * Intercala anúncios de vendedores diferentes.
 *
 * Um vendedor tem 56 dos 136 itens ativos. Ordenar por preço ou por data
 * entrega uma fileira inteira da mesma loja, e a home passa a impressão de
 * catálogo pequeno mesmo com 13 lojas no ar. Aqui cada rodada tira no máximo
 * um item por vendedor, então a primeira tela mostra a variedade que existe.
 */
export function intercalarPorVendedor(itens: Listing[]): Listing[] {
  const porVendedor = new Map<string, Listing[]>();
  for (const l of itens) {
    const chave = l.sellerId || l.sellerName || 'sem-vendedor';
    const lista = porVendedor.get(chave);
    if (lista) lista.push(l);
    else porVendedor.set(chave, [l]);
  }

  const filas = [...porVendedor.values()];
  const saida: Listing[] = [];
  let restam = itens.length;
  while (restam > 0) {
    for (const fila of filas) {
      const item = fila.shift();
      if (item) {
        saida.push(item);
        restam--;
      }
    }
  }
  return saida;
}

/**
 * Embaralha de forma determinística por uma semente: a mesma semente dá sempre
 * a mesma ordem (estável durante a visita), sementes diferentes dão ordens
 * diferentes (varia entre visitas). Não muta a entrada.
 */
export function embaralharComSemente<T>(itens: T[], semente: number): T[] {
  // mulberry32: PRNG pequeno e suficiente para embaralhar uma vitrine.
  let s = semente >>> 0;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...itens];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Vitrine principal. Destaque PAGO vem primeiro (é o que o vendedor comprou) e
 * não rotaciona. O resto completa a vitrine, mas com ROTAÇÃO: em vez de sempre
 * os mesmos itens de maior valor, sorteia de um pool de qualidade (o topo do
 * acervo por valor) usando `semente`, que muda por visita. Assim a home tem cara
 * de marketplace vivo em vez de mostrar sempre os mesmos anúncios. Sempre
 * intercalado por loja. Sem `semente`, mantém o comportamento antigo (estável).
 */
export function destaques(
  ativos: Listing[],
  quantos = 10,
  excluir: Listing[] = [],
  semente?: number,
): Listing[] {
  const fora = new Set(excluir.map((l) => l.id));
  const candidatos = ativos.filter((l) => !fora.has(l.id));

  const pagos = candidatos.filter(isListingFeatured);
  const organicos = candidatos.filter((l) => !isListingFeatured(l));

  let resto: Listing[];
  let frente: Listing[];
  if (semente != null) {
    // Pool de qualidade: o topo por valor (até 4x a vitrine, mínimo 40), para o
    // sorteio não puxar uma peça de R$ 5 para a primeira tela, mas ainda variar.
    const poolTam = Math.max(40, quantos * 4);
    const pool = [...organicos].sort((a, b) => preco(b) - preco(a)).slice(0, poolTam);
    resto = intercalarPorVendedor(embaralharComSemente(pool, semente));
    // Os pagos continuam garantidos no topo, mas a ORDEM entre eles gira por
    // visita: com 2 destaques, o card do topo deixa de ser sempre o mesmo, sem
    // tirar a prioridade que o vendedor comprou.
    frente = intercalarPorVendedor(embaralharComSemente(pagos, semente));
  } else {
    resto = intercalarPorVendedor([...organicos].sort((a, b) => preco(b) - preco(a)));
    frente = intercalarPorVendedor(pagos);
  }

  return [...frente, ...resto].slice(0, quantos);
}

/** Recém-chegados, do mais novo para o mais antigo. */
export function novidades(ativos: Listing[], quantos = 20, excluir: Listing[] = []): Listing[] {
  const fora = new Set(excluir.map((l) => l.id));
  return ativos
    .filter((l) => !fora.has(l.id))
    .sort((a, b) => quando(b) - quando(a))
    .slice(0, quantos);
}

export interface VitrineCategoria {
  slug: string;
  nome: string;
  itens: Listing[];
}

/** Hash estável de um texto (djb2), para dar a cada categoria uma semente própria. */
function hashTexto(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

/**
 * Prateleiras de descoberta por categoria. Surface a variedade que a home não
 * mostrava: quem coleciona card, funko ou action figure via só um número na
 * grade, enquanto miniatura dominava o Destaque.
 *
 * Regra de ouro: só entra categoria com um MÍNIMO de itens. Prateleira quase
 * vazia deixa a home mais morta, não mais cheia (Mangás, com 1 item, não vira
 * seção). Cada prateleira rotaciona por visita (semente própria) e intercala
 * por loja, para não ficar estática nem virar a loja de um vendedor só.
 */
export function vitrinesPorCategoria(
  ativos: Listing[],
  categorias: { slug: string; nome: string }[],
  opts: { minItens?: number; porSecao?: number; semente?: number; excluir?: Listing[] } = {},
): VitrineCategoria[] {
  const { minItens = 12, porSecao = 12, semente, excluir = [] } = opts;
  const fora = new Set(excluir.map((l) => l.id));
  const disp = ativos.filter((l) => !fora.has(l.id));

  const out: VitrineCategoria[] = [];
  for (const c of categorias) {
    const daCat = disp.filter((l) => l.categoryId === c.slug);
    if (daCat.length < minItens) continue; // sem prateleira vazia
    const base =
      semente != null
        ? embaralharComSemente(daCat, (semente ^ hashTexto(c.slug)) >>> 0)
        : [...daCat].sort((a, b) => quando(b) - quando(a));
    out.push({ slug: c.slug, nome: c.nome, itens: intercalarPorVendedor(base).slice(0, porSecao) });
  }
  return out;
}

/**
 * Recomendações para a página de UM anúncio ("Explore mais").
 *
 * Antes a página mostrava sempre os 4 primeiros do catálogo: iguais em toda
 * página, sem relação com o que a pessoa está vendo. Aqui a mesma categoria vem
 * primeiro (relevância), o resto completa (variedade de "outros tipos"), tudo
 * intercalado por loja e embaralhado por uma semente derivada do anúncio atual.
 * Assim cada anúncio mostra um conjunto DIFERENTE, e estável durante a visita.
 */
export function recomendados(
  ativos: Listing[],
  atual: Pick<Listing, 'id' | 'categoryId' | 'sellerId'>,
  opts: { quantos?: number; semente?: number } = {},
): Listing[] {
  const { quantos = 16, semente } = opts;
  const pool = ativos.filter((l) => l.id !== atual.id);
  // Sem semente explícita, o próprio id do anúncio vira a semente: cada página
  // tem seu conjunto, e ele não muda a cada re-render dentro da mesma visita.
  const base = semente ?? hashTexto(atual.id);

  const misturar = (xs: Listing[], sal: number) =>
    intercalarPorVendedor(embaralharComSemente(xs, (base ^ sal) >>> 0));

  const mesmaCat = pool.filter((l) => l.categoryId === atual.categoryId);
  const outras = pool.filter((l) => l.categoryId !== atual.categoryId);

  // Mesma categoria primeiro, depois o resto. Não re-intercala o todo para não
  // perder essa prioridade; cada grupo já sai espalhado por loja.
  return [...misturar(mesmaCat, 0x9e3779b1), ...misturar(outras, 0x85ebca77)].slice(0, quantos);
}

/**
 * Leilões realmente abertos, o que termina primeiro na frente.
 *
 * A regra do que está aberto vive em lib/leilao. O filtro anterior só olhava
 * `endsAt` no futuro, e todo leilão do acervo vem com 2099-01-01: a vitrine
 * anunciava dezenas de leilões que não aceitavam lance nenhum.
 */
export function leiloes(ativos: Listing[], agora: Date = new Date()): Listing[] {
  return ativos
    .filter((l) => leilaoAberto(l, agora))
    .sort((a, b) => {
      const ta = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
      const tb = b.endsAt ? new Date(b.endsAt).getTime() : Infinity;
      return ta - tb;
    });
}

export interface Loja {
  id: string;
  nome: string;
  itens: number;
  /** Capa da loja: a foto do item mais caro dela, que é a melhor vitrine. */
  capa: string;
}

/** Lojas com item no ar, da maior para a menor. */
export function lojas(ativos: Listing[], quantas = 8): Loja[] {
  const mapa = new Map<string, Listing[]>();
  for (const l of ativos) {
    if (!l.sellerName) continue; // sem nome não vira card de loja
    const lista = mapa.get(l.sellerId);
    if (lista) lista.push(l);
    else mapa.set(l.sellerId, [l]);
  }

  return [...mapa.entries()]
    .map(([id, itens]) => {
      const melhor = [...itens].sort((a, b) => preco(b) - preco(a))[0];
      return {
        id,
        nome: (melhor.sellerName ?? '').trim(),
        itens: itens.length,
        capa: parseImages(melhor.images)[0],
      };
    })
    .sort((a, b) => b.itens - a.itens)
    .slice(0, quantas);
}

/** Quantos itens no ar por categoria, para a home mostrar contagem real. */
export function contagemPorCategoria(ativos: Listing[]): Record<string, number> {
  const conta: Record<string, number> = {};
  for (const l of ativos) {
    const slug = l.categoryId;
    if (!slug) continue;
    conta[slug] = (conta[slug] ?? 0) + 1;
  }
  return conta;
}

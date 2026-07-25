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
    // Sem estes campos o card do leilão cai no `|| 0` e mostra "R$ 0,00".
    startingBid: l.startingBidInCents != null ? l.startingBidInCents / 100 : undefined,
    currentBid: l.currentBidInCents != null ? l.currentBidInCents / 100 : undefined,
    bidsCount: l.bidsCount ?? 0,
    auctionEndsAt: l.endsAt ?? undefined,
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
 * Vitrine principal. Destaque pago vem primeiro (é o que o vendedor comprou);
 * o resto completa com os itens de maior valor, que é o que sustenta uma
 * primeira tela de marketplace. Sempre intercalado por loja.
 */
export function destaques(ativos: Listing[], quantos = 10, excluir: Listing[] = []): Listing[] {
  const fora = new Set(excluir.map((l) => l.id));
  const candidatos = ativos.filter((l) => !fora.has(l.id));

  const pagos = candidatos.filter(isListingFeatured);
  const resto = candidatos
    .filter((l) => !isListingFeatured(l))
    .sort((a, b) => preco(b) - preco(a));

  return [...intercalarPorVendedor(pagos), ...intercalarPorVendedor(resto)].slice(0, quantos);
}

/** Recém-chegados, do mais novo para o mais antigo. */
export function novidades(ativos: Listing[], quantos = 20, excluir: Listing[] = []): Listing[] {
  const fora = new Set(excluir.map((l) => l.id));
  return ativos
    .filter((l) => !fora.has(l.id))
    .sort((a, b) => quando(b) - quando(a))
    .slice(0, quantos);
}

/** Leilões abertos, o que termina primeiro na frente. Encerrado não entra. */
export function leiloes(ativos: Listing[], agora: Date = new Date()): Listing[] {
  return ativos
    .filter((l) => l.type === 'auction')
    .filter((l) => !l.endsAt || new Date(l.endsAt).getTime() > agora.getTime())
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

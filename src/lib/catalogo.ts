// Quanto o site pede do catálogo de uma vez.
//
// Fonte única, e o motivo é cache. O TanStack Query indexa pela chave da query,
// que inclui o limite: pedir 200 na home e 500 na categoria cria DOIS caches
// para dados que se sobrepõem quase inteiros. Na prática, ir da home para uma
// categoria era esperar duas vezes pela mesma listagem.
//
// Com um número só, a primeira tela paga a espera e as seguintes abrem na hora.
//
// O backend não filtra por categoria (`GET /api/listings` aceita só limit,
// offset e busca), então a filtragem é no navegador e o site precisa do
// catálogo inteiro. Quando o filtro existir no servidor, cada tela passa a
// pedir só o que mostra e isto perde a razão de ser.
//
// NÃO é mais um teto. A vitrine busca TODAS as páginas até a API esgotar
// (api.listings.getAllPaged), sem limite: um número fixo escondia o que passava
// dele, e o catálogo só cresce. Este valor virou o GATILHO que diz "quero o
// catálogo inteiro": as telas chamam useListings(LIMITE_CATALOGO) e qualquer
// valor >= a isto liga a busca paginada completa. O tamanho de cada página vive
// dentro de getAllPaged.
export const LIMITE_CATALOGO = 1500;

/**
 * Por quanto tempo a listagem é considerada fresca.
 *
 * Eram 60 segundos: quem navegasse por mais de um minuto pagava a espera de
 * novo, e a listagem demora vários segundos para responder. Cinco minutos é
 * bem mais do que a diferença que um anúncio novo faz na vitrine.
 */
export const CATALOGO_STALE_MS = 5 * 60_000;

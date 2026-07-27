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
// pedir só o que mostra e este número perde a razão de ser.
//
// ATENÇÃO: este número precisa ser MAIOR que o total de anúncios ativos, senão
// os que passam do teto ficam invisíveis no site (vendedor reclamou de anúncio
// aprovado que não aparecia). Em 25/07 eram 657 ativos e crescendo, com os
// e-mails de captação trazendo mais lojista. 1500 dá folga por ora, mas é
// remendo: a partir de certo volume o SO precisa paginar e filtrar por
// categoria no servidor (docs/pendencias-backend.md 2.-1 e 2.-0). Quando os
// ativos se aproximarem deste teto, a correção é backend, não subir de novo.
export const LIMITE_CATALOGO = 1500;

/**
 * Por quanto tempo a listagem é considerada fresca.
 *
 * Eram 60 segundos: quem navegasse por mais de um minuto pagava a espera de
 * novo, e a listagem demora vários segundos para responder. Cinco minutos é
 * bem mais do que a diferença que um anúncio novo faz na vitrine.
 */
export const CATALOGO_STALE_MS = 5 * 60_000;

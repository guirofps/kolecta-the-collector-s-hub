import type { Listing } from '@/lib/api';

// ─── Destaques da loja ───────────────────────────────────────────────────────
//
// Os poucos anúncios que o vendedor fixa no topo da própria página. Não
// confundir com o destaque de PLATAFORMA (`featuredUntil`, crédito de fundador,
// vitrine geral): este é da loja, não expira, e quem escolhe é o vendedor.

/** Espelha o MAX_DESTAQUES do backend (`src/listings/destaques.ts`). */
export const MAX_DESTAQUES = 4;

export function estaDestacado(l: Pick<Listing, 'storePinnedAt'>): boolean {
  return !!l.storePinnedAt;
}

/**
 * Os destaques que VALEM hoje.
 *
 * Só anúncio ativo conta. Um item destacado que foi pausado ou vendido continua
 * com a marca no banco (para voltar destacado se for reativado), mas não ocupa
 * vaga: sem este filtro o vendedor veria "4/4" com dois itens que a loja nem
 * mostra, e não conseguiria destacar mais nada sem entender o porquê.
 */
export function destaquesAtivos<T extends Pick<Listing, 'storePinnedAt' | 'status'>>(
  anuncios: T[],
): T[] {
  return anuncios.filter((l) => l.storePinnedAt && l.status === 'active');
}

/**
 * Divide a loja em "faixa de destaques" e "grade".
 *
 * Duas regras moram aqui:
 *
 * 1. **Filtrando, a faixa some.** Quem digitou "Senna" ou escolheu uma
 *    categoria quer o resultado — uma vitrine fixa no topo faria a tela ignorar
 *    o que a pessoa pediu. Os destaques voltam para a grade, sem sumir.
 *
 * 2. **Nada duplicado.** Com a faixa visível, os fixados saem da grade. Loja
 *    com 4 anúncios, os 4 destacados, mostraria os mesmos cards duas vezes.
 *
 * `destaques` sai na ordem em que veio: o backend já devolve a loja com os
 * fixados na frente, na ordem que o vendedor arrastou.
 */
export function separarDestaques<T extends Pick<Listing, 'storePinnedAt'>>(
  todos: T[],
  filtrados: T[],
  filtrando: boolean,
): { destaques: T[]; grade: T[]; mostrarFaixa: boolean } {
  const destaques = todos.filter((p) => p.storePinnedAt);
  const mostrarFaixa = destaques.length > 0 && !filtrando;
  return {
    destaques,
    grade: mostrarFaixa ? filtrados.filter((p) => !p.storePinnedAt) : filtrados,
    mostrarFaixa,
  };
}

/**
 * Lista nova de ids depois de clicar em fixar/desafixar um anúncio.
 *
 * A rota recebe o conjunto COMPLETO, então quem clica precisa mandar todos.
 * Devolve `null` quando a ação não pode acontecer (já são MAX_DESTAQUES) — quem
 * chama transforma isso em aviso, em vez de mandar um lote que o backend recusa.
 */
export function alternarDestaque(
  atuais: string[],
  id: string,
  max = MAX_DESTAQUES,
): string[] | null {
  if (atuais.includes(id)) return atuais.filter((x) => x !== id);
  if (atuais.length >= max) return null;
  return [...atuais, id];
}

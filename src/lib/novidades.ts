// ─── Avisos de novidade ──────────────────────────────────────────────────────
//
// Toda funcionalidade nova precisa se apresentar, senão ninguém descobre. Mas
// aviso que volta a cada visita vira estorvo, então cada um aparece UMA vez por
// pessoa e some para sempre depois de visto ou dispensado.
//
// A lógica vive aqui, fora do React, para poder ser testada sem montar árvore
// de componente. O componente só liga isto na tela.
//
// A chave carrega versão (`v1`). Se um dia a mesma área ganhar outra novidade,
// basta subir para `v2` e o aviso reaparece, sem código novo.

export const AVISOS = {
  /** Botão de tema claro/escuro no header. */
  tema: 'kolecta_novidade_tema_v1',
  /** Card de referência de preço (KPV) na página do anúncio. */
  kpv: 'kolecta_novidade_kpv_v1',
} as const;

export type ChaveAviso = (typeof AVISOS)[keyof typeof AVISOS];

/** Já foi visto? Storage bloqueado (aba anônima) conta como "já viu", para
 *  não insistir num lugar onde a dispensa nem seria lembrada. */
export function jaViu(chave: ChaveAviso): boolean {
  try {
    return localStorage.getItem(chave) === 'visto';
  } catch {
    return true;
  }
}

/** Marca como visto. Falha de storage é silenciosa: no pior caso o aviso
 *  reaparece na próxima visita, o que é bem melhor que quebrar a página. */
export function marcarVisto(chave: ChaveAviso): void {
  try {
    localStorage.setItem(chave, 'visto');
  } catch {
    /* sem storage: não dá para lembrar, e tudo bem */
  }
}

/**
 * Só UM aviso por vez na tela.
 *
 * Se a pessoa cai direto num anúncio, os dois disparariam juntos, e dois balões
 * apontando para cantos diferentes é ruído, não ajuda. O tema tem prioridade
 * por ser global (aparece em toda página); o do anúncio espera a próxima visita.
 */
export function proximoAviso(candidatas: ChaveAviso[]): ChaveAviso | null {
  const ordem: ChaveAviso[] = [AVISOS.tema, AVISOS.kpv];
  for (const chave of ordem) {
    if (candidatas.includes(chave) && !jaViu(chave)) return chave;
  }
  return null;
}

// ─── Aviso de mudança nos meios de pagamento ─────────────────────────────────
// Modal de comunicado: aparece uma vez, some quando a pessoa confirma que leu.
//
// O aceite é versionado pela CAMPANHA, não por uma flag booleana. Um booleano
// "já viu o aviso" queimaria o mecanismo para sempre: o próximo comunicado não
// teria como aparecer para quem já dispensou este. Trocar a constante abaixo
// libera um aviso novo para toda a base, sem tocar no resto do código.
//
// E o registro é POR CONTA, não por navegador. Com uma chave só, quem criasse
// conta num computador onde outra pessoa já tivesse aceitado nunca veria o
// aviso — computador de casa, lan house, segunda conta do mesmo vendedor. Como
// a regra é que todo mundo com conta precisa estar ciente, o id do usuário
// entra na chave.

/** Campanha em exibição. Trocar = novo aviso aparece para todo mundo. */
export const AVISO_CAMPANHA = 'aviso-pagamento-2026-07-30';

const STORAGE_PREFIX = 'kolecta_aviso_visto';

function chave(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

/** Registra que ESTA conta confirmou a leitura do aviso atual. */
export function marcarAvisoVisto(userId: string): void {
  if (!userId) return;
  try {
    localStorage.setItem(chave(userId), AVISO_CAMPANHA);
  } catch {
    // localStorage indisponível (aba anônima): segue sem persistir. O aviso
    // reaparece na próxima visita, o que é melhor do que travar a navegação.
  }
}

/** true se ESTA conta já confirmou a leitura DESTA campanha. */
export function jaViuAviso(userId: string): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(chave(userId)) === AVISO_CAMPANHA;
  } catch {
    return false;
  }
}

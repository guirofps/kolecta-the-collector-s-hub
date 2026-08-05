// ─── Ordem da vitrine da loja ────────────────────────────────────────────────
//
// O vendedor arrasta os anúncios para a ordem que quer que apareçam na página
// dele. Quem tem `position` vem primeiro, do menor para o maior; quem ainda não
// foi ordenado cai no fim, do mais recente para o mais antigo.
//
// É o MESMO critério do backend (sellers.service.getSellerListings). Existe
// também no cliente para o painel mostrar a vitrine na ordem real antes de
// salvar, e como rede de segurança na página pública.

interface Ordenavel {
  position?: number | null;
  createdAt?: string | null;
}

/** Ordena por posição (nulos no fim), depois por data decrescente. Não muta. */
export function ordenarPorPosicao<T extends Ordenavel>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const pa = a.position ?? Infinity;
    const pb = b.position ?? Infinity;
    if (pa !== pb) return pa - pb;
    // Empate (ambos sem posição, ou mesma posição): mais recente primeiro.
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });
}

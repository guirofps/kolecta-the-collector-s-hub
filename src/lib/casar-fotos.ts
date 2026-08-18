// ─── Casamento de fotos por SKU (import em massa) ────────────────────────────
//
// Depois de importar a planilha SEM foto, o vendedor sobe uma pilha de imagens e
// a gente tenta casar cada arquivo com o produto certo pelo NOME do arquivo. A
// convenção é `SKU-ordem.ext`: `HW001-1.jpg` é a 1ª foto do produto de SKU
// `HW001`, `HW001-2.jpg` a 2ª, e assim por diante. O que não casar vai pra
// bandeja, pro vendedor encaixar na mão.

/** Tira a extensão do nome do arquivo. `HW001-2.jpg` -> `HW001-2`. */
function semExtensao(nome: string): string {
  return nome.replace(/\.[^.]+$/, '');
}

export interface CasamentoFoto {
  /** SKU do produto que casou. */
  sku: string;
  /** Ordem da foto (o número depois do SKU). 1 se não houver número. */
  ordem: number;
}

/**
 * Tenta casar UM nome de arquivo com um dos SKUs conhecidos.
 *
 * Casa quando o nome começa com o SKU seguido de um separador (`-`, `_`, espaço)
 * ou do fim: assim `HW001-2.jpg` casa com `HW001`, mas `HW0010-1.jpg` NÃO casa
 * com `HW001` (senão o produto errado levaria a foto). Entre SKUs que servem, o
 * MAIS LONGO ganha (`HW0010` antes de `HW001`). Sem número, a ordem é 1.
 */
export function casarPorSku(
  nomeArquivo: string,
  skus: string[],
): CasamentoFoto | null {
  const base = semExtensao(nomeArquivo).trim().toLowerCase();
  // Do mais longo pro mais curto: o prefixo mais específico vence.
  const ordenados = [...new Set(skus.filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );

  for (const sku of ordenados) {
    const alvo = sku.trim().toLowerCase();
    if (!alvo) continue;
    if (base === alvo) return { sku, ordem: 1 };
    if (base.startsWith(alvo)) {
      const resto = base.slice(alvo.length);
      // Precisa ter um separador logo após o SKU, senão é outro código.
      const sep = resto.match(/^[\s._-]+(\d+)?/);
      if (sep) {
        const ordem = sep[1] ? parseInt(sep[1], 10) : 1;
        return { sku, ordem };
      }
    }
  }
  return null;
}

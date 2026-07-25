// Ordem das fotos do anúncio.
//
// A capa é sempre a primeira do array (`images[0]`), e era o único jeito de
// definir qual seria: a ordem de upload. Um vendedor relatou que, para trocar a
// capa, precisava apagar todas as fotos e subir de novo na ordem certa.
//
// Funções puras sobre a lista, usadas pela criação e pela edição. Nenhuma
// altera o array recebido.

/**
 * Move a foto do índice para a primeira posição, preservando a ordem relativa
 * das demais. É o que o vendedor entende por "definir como capa".
 */
export function definirCapa(fotos: string[], indice: number): string[] {
  if (indice <= 0 || indice >= fotos.length) return [...fotos];
  const copia = [...fotos];
  const [escolhida] = copia.splice(indice, 1);
  return [escolhida, ...copia];
}

/**
 * Troca a foto de lugar com a vizinha, para ajuste fino da ordem da galeria.
 * `direcao` é -1 para a esquerda e 1 para a direita. Fora dos limites, devolve
 * a lista como está em vez de embaralhar.
 */
export function moverFoto(fotos: string[], indice: number, direcao: -1 | 1): string[] {
  const destino = indice + direcao;
  if (indice < 0 || indice >= fotos.length) return [...fotos];
  if (destino < 0 || destino >= fotos.length) return [...fotos];
  const copia = [...fotos];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
}

/** Remove a foto do índice. Se era a capa, a seguinte assume, sem buraco. */
export function removerFoto(fotos: string[], indice: number): string[] {
  return fotos.filter((_, i) => i !== indice);
}

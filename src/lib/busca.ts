// Busca por texto no catálogo.
//
// A busca do backend compara o termo cru com o título. Como o acervo é escrito
// com acento ("Pokémon", "Mangá", "Edição"), quem digita "pokemon" recebia zero
// resultado, que é como a maioria das pessoas digita. Aqui o termo e o alvo são
// normalizados antes de comparar, então acento e caixa deixam de importar.
//
// O filtro roda no navegador sobre a listagem já carregada, como já acontece
// com categoria, condição e tipo. Serve enquanto o catálogo couber na página
// que a busca pede; quando passar disso, o backend precisa fazer isso no SQL
// (ver docs/pendencias-backend.md).

import type { Listing } from './api';

/** Minúsculas e sem acento: "Pokémon" e "pokemon" viram a mesma coisa. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    // \p{Diacritic} em vez da faixa de code points: a faixa exige escrever
    // caracteres combinantes, que somem no editor e num salvamento com
    // codificação errada.
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Todo texto do anúncio em que faz sentido procurar. */
function alvoDe(l: Listing): string {
  return normalizar(
    [l.title, l.brand, l.line, l.description, l.sellerName, l.sku, l.edition]
      .filter(Boolean)
      .join(' '),
  );
}

/**
 * Casa quando TODAS as palavras do termo aparecem no anúncio, em qualquer
 * ordem. "ferrari hot wheels" acha "Hot Wheels Ferrari Testarossa", que uma
 * comparação de frase inteira deixaria passar.
 */
export function combinaComTermo(l: Listing, termo: string): boolean {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;
  const alvo = alvoDe(l);
  return palavras.every((p) => alvo.includes(p));
}

export function filtrarPorTermo(itens: Listing[], termo: string): Listing[] {
  if (!normalizar(termo)) return itens;
  return itens.filter((l) => combinaComTermo(l, termo));
}

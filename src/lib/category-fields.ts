// ─── Campos por categoria ────────────────────────────────────────
// Fonte ÚNICA do que cada categoria pergunta no anúncio.
//
// O wizard de criação grava tudo em `categoryFields` e serializa na coluna
// `attributes` (JSON). As chaves que têm coluna própria no banco (brand, line,
// scale, year, edition) também são copiadas para o topo do registro.
//
// Antes esta lista existia só espalhada dentro do JSX do wizard, e o painel do
// admin mostrava as colunas cruas do banco em vez dos campos da categoria.
// Resultado: um card colecionável aparecia com "Escala: não informada" em
// vermelho, sendo que escala nem é perguntada para carta. E o campo que a
// categoria realmente exige (o jogo) não aparecia em lugar nenhum.

export interface CategoryField {
  /** Chave em `categoryFields` / `attributes`. */
  key: string;
  label: string;
  /** Trava o avanço no wizard e vira alerta na moderação. */
  required?: boolean;
  /** Só faz sentido quando outro campo tem certo valor (ex: nota do grading). */
  dependeDe?: { key: string; valor: string };
}

export const CATEGORY_FIELDS: Record<string, CategoryField[]> = {
  'miniaturas-diecast': [
    { key: 'brand', label: 'Marca', required: true },
    { key: 'line', label: 'Linha' },
    { key: 'scale', label: 'Escala', required: true },
    { key: 'year', label: 'Ano' },
    { key: 'edition', label: 'Edição' },
  ],
  'cards-colecionaveis': [
    { key: 'jogo', label: 'Jogo / Universo', required: true },
    { key: 'numero', label: 'Número da carta' },
    { key: 'raridade', label: 'Raridade' },
    { key: 'idioma', label: 'Idioma' },
    { key: 'gradada', label: 'Gradada' },
    { key: 'empresaGrading', label: 'Empresa de grading', dependeDe: { key: 'gradada', valor: 'Sim' } },
    { key: 'nota', label: 'Nota do grading', dependeDe: { key: 'gradada', valor: 'Sim' } },
  ],
  'action-figures': [
    { key: 'brand', label: 'Marca / Fabricante', required: true },
    { key: 'line', label: 'Linha / Série', required: true },
    { key: 'personagem', label: 'Personagem', required: true },
    { key: 'escalaAltura', label: 'Escala / Altura' },
    { key: 'articulado', label: 'Articulado' },
    { key: 'caixaInclusa', label: 'Caixa original' },
  ],
  'funko-pop': [
    { key: 'numero', label: 'Número do Pop', required: true },
    { key: 'line', label: 'Linha / Série', required: true },
    { key: 'edicaoEspecial', label: 'Edição especial' },
    { key: 'caixaInclusa', label: 'Caixa original' },
  ],
  'mangas-hqs': [
    { key: 'tituloObra', label: 'Título da obra', required: true },
    { key: 'editora', label: 'Editora' },
    { key: 'volume', label: 'Volume / Número' },
    { key: 'idioma', label: 'Idioma' },
    { key: 'estadoLombada', label: 'Estado da lombada' },
    { key: 'slipcase', label: 'Slipcase incluso' },
  ],
};

/** Campos da categoria. Slug desconhecido devolve lista vazia, nunca quebra. */
export function fieldsForCategory(slug: string | null | undefined): CategoryField[] {
  return (slug && CATEGORY_FIELDS[slug]) || [];
}

/** Lê `attributes` (JSON string do banco) sem estourar em dado corrompido. */
export function parseAttributes(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Texto legível de um valor: array vira lista, vazio vira null. */
export function formatFieldValue(valor: unknown): string | null {
  if (valor == null) return null;
  if (Array.isArray(valor)) {
    const itens = valor.filter((v) => v != null && String(v).trim() !== '');
    return itens.length ? itens.join(', ') : null;
  }
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
}

/**
 * O campo é aplicável neste anúncio? Campo dependente (nota do grading, por
 * exemplo) não conta como faltando quando a condição não bate.
 */
export function isFieldApplicable(field: CategoryField, valores: Record<string, unknown>): boolean {
  if (!field.dependeDe) return true;
  return formatFieldValue(valores[field.dependeDe.key]) === field.dependeDe.valor;
}

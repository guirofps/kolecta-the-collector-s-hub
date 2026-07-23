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
  /**
   * Lista fechada. Havendo opções, o wizard mostra seleção em vez de campo
   * livre, e a vitrine pode filtrar por elas com segurança.
   */
  options?: string[];
  /**
   * Este é o campo que divide a categoria em subcategorias (a "prateleira").
   * Um por categoria. É o que vira filtro na página da categoria.
   */
  subcategoria?: boolean;
}

// Escalas e afins que já eram lista fechada no wizard, agora centralizadas.
const ESCALAS = ['1:64', '1:43', '1:32', '1:24', '1:18', '1:12', 'Outra'];
const IDIOMAS = ['Português', 'Inglês', 'Japonês', 'Outro'];
const SIM_NAO = ['Sim', 'Não'];

export const CATEGORY_FIELDS: Record<string, CategoryField[]> = {
  'miniaturas-diecast': [
    {
      key: 'brand',
      // "Marca" era ambíguo e o banco mostra o estrago: metade preencheu a
      // montadora do carro (Ferrari, Nissan, Honda) em vez do fabricante da
      // miniatura. O rótulo agora diz exatamente o que se quer.
      label: 'Fabricante da miniatura',
      required: true,
      subcategoria: true,
      options: [
        'Hot Wheels', 'Mini GT', 'Majorette', 'Matchbox', 'Tomica', 'Maisto',
        'Bburago', 'Greenlight', 'Johnny Lightning', 'M2 Machines', 'Inno64',
        'Pop Race', 'Tarmac Works', 'Kaido House', 'Solido', 'Auto World',
        'Robert Design', 'MSZ', 'Time Micro', 'Outra',
      ],
    },
    { key: 'line', label: 'Linha / Série' },
    { key: 'scale', label: 'Escala', required: true, options: ESCALAS },
    { key: 'year', label: 'Ano' },
    { key: 'edition', label: 'Edição' },
  ],
  'cards-colecionaveis': [
    {
      key: 'jogo',
      label: 'Jogo / Universo',
      required: true,
      subcategoria: true,
      options: [
        'Pokémon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'One Piece',
        'Dragon Ball', 'Digimon', 'Sport Cards', 'Outro',
      ],
    },
    { key: 'numero', label: 'Número da carta' },
    {
      key: 'raridade',
      label: 'Raridade',
      options: ['Comum', 'Incomum', 'Rara', 'Rara Holográfica', 'Ultra Rara', 'Secreta', 'Promo', 'Outra'],
    },
    { key: 'idioma', label: 'Idioma', options: IDIOMAS },
    { key: 'gradada', label: 'Gradada', options: SIM_NAO },
    { key: 'empresaGrading', label: 'Empresa de grading', dependeDe: { key: 'gradada', valor: 'Sim' } },
    { key: 'nota', label: 'Nota do grading', dependeDe: { key: 'gradada', valor: 'Sim' } },
  ],
  'action-figures': [
    {
      key: 'brand',
      label: 'Fabricante',
      required: true,
      subcategoria: true,
      options: [
        'Bandai', 'Hot Toys', 'Kotobukiya', 'NECA', 'McFarlane', 'Hasbro',
        'Mattel', 'Good Smile Company', 'Medicom', 'Storm Collectibles',
        'Iron Studios', 'Sideshow', 'Banpresto', 'Outra',
      ],
    },
    { key: 'line', label: 'Linha / Série', required: true },
    { key: 'personagem', label: 'Personagem', required: true },
    { key: 'escalaAltura', label: 'Escala / Altura' },
    { key: 'articulado', label: 'Articulado', options: SIM_NAO },
    { key: 'caixaInclusa', label: 'Caixa original', options: SIM_NAO },
  ],
  'funko-pop': [
    { key: 'numero', label: 'Número do Pop', required: true },
    {
      key: 'line',
      label: 'Linha / Universo',
      required: true,
      subcategoria: true,
      options: [
        'Marvel', 'DC', 'Star Wars', 'Anime', 'Games', 'Disney', 'Filmes',
        'Séries', 'Música', 'Esportes', 'Animação', 'Terror', 'Outra',
      ],
    },
    { key: 'edicaoEspecial', label: 'Edição especial' },
    { key: 'caixaInclusa', label: 'Caixa original', options: SIM_NAO },
  ],
  'mangas-hqs': [
    { key: 'tituloObra', label: 'Título da obra', required: true },
    {
      key: 'editora',
      label: 'Editora',
      subcategoria: true,
      options: [
        'Panini', 'JBK', 'JBC', 'Devir', 'NewPOP', 'Pipoca & Nanquim',
        'Darkside', 'Mythos', 'Veneta', 'Importado', 'Outra',
      ],
    },
    { key: 'volume', label: 'Volume / Número' },
    { key: 'idioma', label: 'Idioma', options: IDIOMAS },
    {
      key: 'estadoLombada',
      label: 'Estado da lombada',
      options: ['Perfeita', 'Leve amarelamento', 'Com amassados', 'Danificada'],
    },
    { key: 'slipcase', label: 'Slipcase incluso', options: SIM_NAO },
  ],
};

// ─── Normalização da subcategoria ────────────────────────────
// Os anúncios criados antes da lista fechada têm texto livre, e o banco mostra
// o estrago: "Hot Wheels" aparece como Hotweels, Hotwheels, Hot wells, HOT
// WELLS e Hot Wheels. São 22 anúncios da mesma marca em 5 grupos que nunca se
// encontrariam num filtro. Normalizar na leitura junta todos sem precisar
// migrar o banco, e o dado antigo passa a servir para filtrar.

/** Reduz um texto a uma chave comparável: sem acento, sem símbolo, minúsculo. */
function chave(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Grafias erradas e apelidos vistos nos anúncios reais. */
const APELIDOS: Record<string, string> = {
  hotweels: 'Hot Wheels',
  hotwells: 'Hot Wheels',
  hotwheel: 'Hot Wheels',
  hotwhells: 'Hot Wheels',
  hw: 'Hot Wheels',
  minigt: 'Mini GT',
  mgt: 'Mini GT',
  burago: 'Bburago',
  bburago: 'Bburago',
  tarmac: 'Tarmac Works',
  kaidohouse: 'Kaido House',
  jbc: 'JBC',
  panini: 'Panini',
  copag: 'Copag',
  pokemoncompany: 'Pokémon',
  thepokemoncompanyinternational: 'Pokémon',
};

/**
 * Encaixa um valor livre numa das opções da lista fechada.
 * Devolve `null` quando não dá para decidir, e aí o chamador trata como "Outra".
 */
export function normalizeSubcategoria(valor: string, opcoes: string[]): string | null {
  const k = chave(valor);
  if (!k) return null;

  const apelido = APELIDOS[k];
  if (apelido && opcoes.includes(apelido)) return apelido;

  const exata = opcoes.find((o) => chave(o) === k);
  if (exata) return exata;

  // O vendedor colou o título inteiro no campo ("Miniatura Ferrari ... Burago").
  // Pega a opção mais longa contida no texto, para "Hot Wheels" ganhar de "HW".
  const contidas = opcoes
    .filter((o) => o !== 'Outra' && o !== 'Outro' && chave(o).length >= 3 && k.includes(chave(o)))
    .sort((a, b) => chave(b).length - chave(a).length);
  if (contidas.length) return contidas[0];

  const porApelido = Object.entries(APELIDOS).find(([alias]) => k.includes(alias) && alias.length >= 4);
  if (porApelido && opcoes.includes(porApelido[1])) return porApelido[1];

  return null;
}

/** O campo que divide a categoria em prateleiras, se houver. */
export function subcategoriaField(slug: string | null | undefined): CategoryField | null {
  return fieldsForCategory(slug).find((f) => f.subcategoria) ?? null;
}

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

// ─── Linhas / séries de miniatura ────────────────────────────────────────────
//
// Mesmo problema que a marca teve, um nível abaixo: 410 valores diferentes de
// linha em 817 anúncios, 318 deles usados por um anúncio só. Só o Hot Wheels
// tem 227 grafias em 374 anúncios.
//
// O estrago é medível. Estes dois grupos são O MESMO CARRO, separados só pela
// grafia da linha:
//
//   Hot Wheels | Mainline | ferrari 365 gtb4 competizione   (4 anúncios)
//   Hot Wheels | FERRARI  | 365 gtb4 competizione           (2 anúncios)
//
// Seis anúncios da mesma peça em duas referências de preço diferentes.
//
// A diferença para a marca: linha é LEGITIMAMENTE aberta. Colaboração, edição
// de evento, exclusivo de loja — sempre vai existir uma linha nova que a lista
// não previu. Então aqui a lista fechada é uma SUGESTÃO por marca, com "Outra"
// deixando o campo livre, e a normalização conserta o que já entrou torto sem
// jamais descartar o que não reconhece.

import { MONTADORAS, normalizarMarca, grafiasDaMarca, type MarcaMiniatura } from './marcas';

/** Fica sempre no fim de qualquer lista, e libera o campo livre. */
export const LINHA_OUTRA = 'Outra';

/**
 * Linhas principais por marca, na ordem de uso real no catálogo.
 * Marca sem entrada aqui simplesmente não oferece sugestão.
 */
export const LINHAS_POR_MARCA: Partial<Record<MarcaMiniatura, readonly string[]>> = {
  'Hot Wheels': [
    'Mainline', 'Premium', 'Car Culture', 'Pop Culture', 'Team Transport',
    'Boulevard', 'Red Line Club', 'Silver Series', 'Fast & Furious',
    'Then and Now', 'HW Screen Time', 'HW Dream Garage', 'HW Exotics',
    'Monster Trucks', 'Formula 1', 'Retro Entertainment', 'Zamac',
  ],
  'Mini GT': [
    'Kaido House', 'LB-Works', 'LB Super Silhouette', 'Liberty Walk',
    'VeilSide', 'QubeCarz', 'Rally', 'IMSA', 'Super GT Series', 'HKS',
    'Senna', '007', 'Daytona', 'Top Secret',
  ],
  Matchbox: ['Mainline', 'Premium', 'Collectors', 'MBX', 'Moving Parts', 'Jurassic World'],
  'Kaido House': ['Kaido Works', 'LTD', 'BLKLTD', 'Event Exclusive', 'DGK'],
  'Tarmac Works': ['Global64', 'Hobby64', 'Truck64', 'Road64', 'Limited Edition', 'Collab'],
  'M2 Machines': [
    'Auto-Thentics', 'Detroit Muscle', 'Ground Pounders', 'Coca-Cola',
    'Mijo Exclusive', 'Hobby Special', 'Gassers',
  ],
  // A Pop Race organiza por montadora, mas montadora NÃO é linha (é a regra que
  // já vale para o campo de marca). Só entra aqui o que é série de verdade.
  'Pop Race': ['Liberty Walk'],
  Inno64: ['IN64', 'Collab'],
};

/**
 * Grafias erradas vistas no banco → linha certa.
 * Só entra aqui o que foi confirmado no catálogo real.
 */
const APELIDOS: Record<string, string> = {
  // Hot Wheels
  mailine: 'Mainline',
  mainlaine: 'Mainline',
  'main line': 'Mainline',
  rlc: 'Red Line Club',
  'red line': 'Red Line Club',
  'fast e furious': 'Fast & Furious',
  'fast and furious': 'Fast & Furious',
  'fast furious': 'Fast & Furious',
  'velozes e furiosos': 'Fast & Furious',
  'velozes furiosos': 'Fast & Furious',
  f1: 'Formula 1',
  'formula 1': 'Formula 1',
  'screen time': 'HW Screen Time',
  'dream garage': 'HW Dream Garage',
  exotics: 'HW Exotics',
  // Mini GT
  lbwk: 'LB-Works',
  'lb works': 'LB-Works',
  'lb work': 'LB-Works',
  'liberty walk': 'Liberty Walk',
  'lb super silhouette': 'LB Super Silhouette',
  'super silhouette': 'LB Super Silhouette',
  'super gt': 'Super GT Series',
  'super gt series': 'Super GT Series',
  veilside: 'VeilSide',
  qubecarz: 'QubeCarz',
  // Tarmac
  'global 64': 'Global64',
  'hobby 64': 'Hobby64',
  'truck 64': 'Truck64',
  // Matchbox / geral
  'moving parts': 'Moving Parts',
  'jurassic park': 'Jurassic World',
  'coca cola': 'Coca-Cola',
};

/**
 * Palavras que são VARIANTE, não linha.
 *
 * Apareceram no campo de linha em anúncios reais ("Chase" como linha do Kaido
 * House). Deixar passar duplicaria a informação em dois campos e, pior,
 * separaria o chase do regular por um caminho que a identidade do KPV não
 * controla.
 */
const RE_VARIANTE = /^(chase|super\s*t\.?\s*(?:reasure\s*)?hunts?|treasure\s*hunts?|t[-\s]?hunts?|sth|th)$/i;

/** Tira acento, baixa a caixa, colapsa espaço. */
function chave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Linhas oferecidas no formulário para a marca, com "Outra" no fim. */
export function linhasDaMarca(marca: string | null | undefined): string[] {
  const canonica = normalizarMarca(marca).marca;
  const lista = (canonica && LINHAS_POR_MARCA[canonica]) || [];
  return [...lista, LINHA_OUTRA];
}

export interface LinhaNormalizada {
  /** Linha canônica, ou null quando o valor não serve como linha. */
  linha: string | null;
  /**
   * - `exata`: já estava certa
   * - `corrigida`: caixa, acento, espaço ou grafia conhecida
   * - `extraida`: a linha estava dentro de um texto maior
   * - `marca`: era o nome da marca, não uma linha
   * - `montadora`: era a marca do carro
   * - `variante`: era chase/TH, que tem campo próprio
   * - `livre`: não reconhecida, mas preservada como está
   * - `vazia`: não havia nada
   */
  origem: 'exata' | 'corrigida' | 'extraida' | 'marca' | 'montadora' | 'variante' | 'livre' | 'vazia';
}

/**
 * Encaixa o valor digitado numa linha canônica da marca.
 *
 * Nunca inventa: o que não reconhece volta com `origem: 'livre'` e o texto
 * aparado, porque linha nova aparece o tempo todo e apagar seria pior que a
 * grafia torta. Só devolve `linha: null` quando o valor comprovadamente NÃO é
 * uma linha (é a marca, a montadora, ou uma variante).
 */
export function normalizarLinha(
  bruto: string | null | undefined,
  marca?: string | null,
): LinhaNormalizada {
  // Guarda o valor CRU para decidir se houve mudança. Comparar o texto já
  // aparado dizia "exata" para "Premium " (com espaço no fim), e o espaço nunca
  // era corrigido: para o banco, "Premium " e "Premium" são linhas diferentes.
  // É o mesmo erro que a normalização de marca cometeu.
  const original = bruto ?? '';
  if (!original.trim()) return { linha: null, origem: 'vazia' };

  // Variante no campo errado.
  if (RE_VARIANTE.test(original.trim())) return { linha: null, origem: 'variante' };

  // A marca colada no campo: "Hot Wheels Premium" quer dizer linha "Premium".
  // Vale tirar antes de tudo, senão nada casa.
  let texto = original.trim();
  const canonica = normalizarMarca(marca).marca;
  if (canonica) {
    for (const g of grafiasDaMarca(canonica)) {
      const re = new RegExp(`\\b${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      texto = texto.replace(re, ' ');
    }
    texto = texto.replace(/\s+/g, ' ').trim();
  }
  // Sobrou só a marca: o campo não tinha linha nenhuma.
  if (!texto) return { linha: null, origem: 'marca' };

  const k = chave(texto);

  // Montadora do carro no lugar da linha (o mesmo erro que a marca sofria).
  if (MONTADORAS.some((mo) => k === mo)) return { linha: null, origem: 'montadora' };

  const sugeridas = linhasDaMarca(marca).filter((l) => l !== LINHA_OUTRA);
  // Sem sugestão para a marca, ainda vale consultar o catálogo inteiro: séries
  // como "Kaido House" atravessam fabricantes.
  const universo = sugeridas.length
    ? sugeridas
    : [...new Set(Object.values(LINHAS_POR_MARCA).flat())];

  // 1) Bate exatamente com uma canônica.
  const exata = universo.find((l) => chave(l) === k);
  if (exata) return { linha: exata, origem: original === exata ? 'exata' : 'corrigida' };
  // ^ compara com `original` (cru), não com `texto`: é o que faz "Premium "
  //   contar como corrigida em vez de exata.

  // 2) Grafia errada conhecida.
  const apelido = APELIDOS[k];
  if (apelido) return { linha: apelido, origem: 'corrigida' };

  // 3) A linha está DENTRO de um texto maior ("Mainline - HW Dream Garage",
  //    "Premium Car Culture"). Fica com a mais LONGA, que é a mais específica:
  //    "Car Culture" diz mais que "Premium", e é o que o mercado usa para
  //    diferenciar preço.
  //
  //    Canônicas e apelidos disputam JUNTOS. Separados, "Premium - Fast
  //    Furious" parava em "Premium": a canônica batia primeiro e a função
  //    retornava antes de ver que "fast furious" é apelido de "Fast & Furious",
  //    que é o nome mais específico e mais caro.
  const candidatos: { linha: string; tam: number }[] = [];
  for (const l of universo) {
    const agulha = chave(l);
    if (agulha.length >= 3 && k.includes(agulha)) candidatos.push({ linha: l, tam: agulha.length });
  }
  for (const [apelidoK, l] of Object.entries(APELIDOS)) {
    if (apelidoK.length >= 4 && k.includes(apelidoK)) candidatos.push({ linha: l, tam: apelidoK.length });
  }
  if (candidatos.length) {
    candidatos.sort((a, b) => b.tam - a.tam);
    return { linha: candidatos[0].linha, origem: 'extraida' };
  }

  // 4) Não reconhecida. Preserva aparada: linha nova é informação.
  return { linha: texto, origem: 'livre' };
}

/**
 * Linha pronta para gravar, aplicada ao montar o payload.
 * Mesma ideia de `marcaParaSalvar`: normaliza no ponto onde toda escrita passa.
 */
export function linhaParaSalvar(
  bruto: string | null | undefined,
  marca?: string | null,
): string | undefined {
  const { linha } = normalizarLinha(bruto, marca);
  return linha ?? undefined;
}

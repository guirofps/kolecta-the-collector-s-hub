// ─── KPV: identidade da peça ─────────────────────────────────────────────────
//
// Antes de comparar preço é preciso responder uma pergunta só: estes dois
// anúncios são a MESMA peça? Este arquivo responde isso, e só isso. Nada aqui
// consulta rede nem sabe o que é preço.
//
// A medição do catálogo derrubou a ideia inicial de casar por código de
// catálogo. De 817 anúncios ativos, os que trazem código no título são ~24%
// pelo regex ingênuo, e metade disso é falso positivo: "GT500", "CC850" e
// "EVO22" são MODELO de carro, não código de fábrica, e "#93" é número de
// corrida. Sobra algo perto de 12%, e Hot Wheels (metade do acervo) quase nunca
// traz código.
//
// Então a identidade é montada por NOME: marca + linha + modelo + variante +
// escala. O código entra só quando é comprovadamente código (o "#NNNN" do Mini
// GT e as referências próprias de Tarmac/Kaido/Inno64), como reforço. Código
// duvidoso é pior que nenhum: casa peças diferentes com cara de certeza.

import {
  normalizarMarca, normalizarEscala, grafiasDaMarca, normalizarMarcaDoAnuncio,
} from './marcas';

/**
 * Variante. Nunca pode ser misturada: chase e Treasure Hunt são outra peça,
 * com outro mercado, mesmo saindo do mesmo molde.
 */
export type Variante =
  | 'regular' | 'chase' | 'treasure-hunt' | 'super-treasure-hunt' | 'exclusivo-evento';

/** Condição que o KPV usa como base. Preço só é comparado dentro dela. */
export const CONDICAO_BASE = 'novo-lacrado';

// ─── Detectores ──────────────────────────────────────────────────────────────

// A ordem importa: "super treasure hunt" tem que ser testado antes de
// "treasure hunt", senão o super vira comum e os dois entram na mesma amostra.
const RE_SUPER_TH = /\bsuper\s*t\.?\s*(?:reasure\s*)?hunts?\b|\bsth\b|\bs\.?t\.?h\.?\b/i;
const RE_TH = /\btreasure\s*hunts?\b|\bt[-\s]?hunts?\b|\bth\b/i;
const RE_CHASE = /\bchase\b/i;

/**
 * A variante NEGADA no próprio título: o vendedor do REGULAR anuncia dizendo o
 * que a peça NÃO é ("Ferrari F40 Black NON Super Treasure Hunt", "not STH",
 * "não é chase") para aparecer na busca de quem procura a rara. Sem isto o
 * detector lia "Super Treasure Hunt" e marcava a peça de US$ 5 como STH,
 * contaminando a amostra da rara e derrubando a mediana. A negação tem que ser
 * COLADA na sigla (0–1 palavra), senão "não vem com protetor ... STH" de uma STH
 * de verdade cairia aqui por engano.
 */
const RE_VARIANTE_NEGADA =
  /\b(?:non|not|sem|n(?:ã|a)o(?:\s*(?:é|e|possui|tem))?)[\s-]*(?:a\s+|the\s+|ser\s+|vers(?:ã|a)o\s+)?(?:super\s+)?(?:t\.?\s*reasure\s+hunts?|t[-\s]?hunts?|sth|s\.?t\.?h\.?|chase)\b/i;

/**
 * Exclusivo de evento ou de loja: tiragem pequena, mercado próprio.
 *
 * Entrou depois que a esteira casou um "Nissan LB-Super Silhouette 180SX TAS
 * 2026 Exclusive" de R$ 850 com o Mini GT comum do mesmo carro, e devolveu
 * referência de R$ 181. Mesmo molde, tiragem completamente diferente. TAS é
 * Tokyo Auto Salon; as outras siglas seguem a mesma lógica de feira.
 */
const RE_EXCLUSIVO =
  /\b(tas\s*\d{0,4}\s*exclusive|tokyo\s*auto\s*salon|event\s*exclusive|exclusivo\s*(?:de\s*)?evento|store\s*exclusive|convention\s*exclusive|sdcc|mijo\s*exclusive|sal(?:ã|a)o\s*diecast|imx\s*\d{2,4}|indy\s*mini\s*expo|red\s*chrome|zamac|gold\s*chrome|\bsema\s*\d{2,4}|tmcs\s*\d{2,4}|weekend\s*of\s*wheels)\b/i;

/**
 * Lote, pack, kit: não é peça única, então não entra em comparação de preço.
 *
 * "lot" em inglês entrou depois: um anúncio "Hot Wheels LOT 3 (Porsche 356A,
 * Taycan…)" passou pelo filtro e casou com um Taycan avulso, dando -100% de
 * diferença. Lote de 3 carros comparado com 1 carro é exatamente o tipo de
 * número que destrói a confiança na referência.
 */
const RE_LOTE =
  /\b(lotes?|lot\s*\d|kit\s*com|packs?|conjuntos?|sets?|combos?|\d+\s*(?:pe(?:ç|c)as|unidades|minis|carrinhos|miniaturas|pcs|pieces|cars)|com\s+\d+\s+carr)\b/i;

/**
 * Peça SOLTA/ABERTA. O KPV só compara novo-lacrado, e "loose" é a nomenclatura
 * padrão do mercado internacional para a peça tirada da cartela: um STH loose
 * de US$ 85 no meio dos lacrados de US$ 160 arrastava a mediana pra baixo. No
 * nosso lado a condição já vem do campo próprio, mas no eBay o sinal de aberto
 * vive só no título.
 */
const RE_ABERTO =
  /\bloose\b|\bsolt[oa]\b|\bavuls[oa]\b|\bopened\b|\bunpackaged\b|out\s*of\s*(?:the\s*)?(?:box|package|card|blister)|sem\s*(?:a\s*)?(?:cartela|blister|embalagem)|fora\s*d[ae]\s*(?:cartela|embalagem|blister)/i;

/**
 * Card de arte e peça customizada: não é o item de fábrica. Um "Custom Premium
 * card" (arte impressa) e um "Custom Ferrari F40 STH Blue" (repaint) apareciam
 * na busca da STH por US$ 10–18 e entravam como se fossem a peça real.
 *
 * A regra é estreita de propósito: "custom" sozinho NÃO reprova, porque é nome
 * de molde oficial ("Custom '77 Dodge Van", "Custom Otto"). Só reprova o card de
 * arte, ou "custom/repaint" JUNTO de uma variante rara — combinação que na
 * prática é sempre peça modificada, nunca casting de fábrica.
 */
const RE_CARD_ART = /\b(?:custom|premium|art|graphic|fan)\s*(?:made\s*)?cards?\b/i;
const RE_CUSTOM = /\bcustom(?:s|iz(?:ed|ad[oa]))?\b|\brepaint(?:ed)?\b|\brestyled?\b/i;

/**
 * Veículo de franquia (nave, avião, personagem). Sai da comparação porque não
 * tem mercado de "carrinho": um X-Jet dos X-Men e um Porsche da mesma linha
 * não se comparam, mesmo sendo os dois Hot Wheels premium.
 */
const RE_FRANQUIA =
  /\b(star\s*trek|batman|batplane|batmobile|x-?men|x-?jet|marvel|guardi(?:õ|o)es|nave|enterprise|vengeance|mario\s*kart|snoopy|jurass?[ai]c|jurr?asc|dc\s*comics|hello\s*kitty|simpsons)\b/i;

/**
 * Conjunto de dois ou mais veículos, mesmo sem a palavra "kit" ou "set" que o
 * RE_LOTE pega. O vendedor brasileiro descreve o tema por extenso ("F-100
 * transportando um Bronco", "GMC Sierra, uma van Safari e um reboque"), e essa
 * frase, depois de limpa, vira um modelo genérico que casa com um produto
 * DIFERENTE que só compartilha o veículo principal. O anúncio internacional de
 * peça única não traz esses termos, então o casamento é sempre falso: conjunto
 * só compara com conjunto.
 */
const RE_CONJUNTO =
  /\b(transportando|rebocando|reboque|carreta|guincho|puxando)\b/i;

/**
 * Código de catálogo, só nos formatos comprovadamente confiáveis.
 *
 * O "#NNNN" do Mini GT é numeração de coleção de verdade. Já o código de
 * fábrica do Hot Wheels (3 letras + 2 dígitos) foi deixado de FORA de
 * propósito: no acervo real ele é indistinguível de designação de modelo
 * ("GT500", "CC850", "EVO22" casam com o mesmo formato), e código errado
 * agrupa peças diferentes com aparência de certeza.
 */
const CODIGOS: { marca: string | null; re: RegExp }[] = [
  { marca: 'Mini GT', re: /#\s*(\d{3,4})\b/ },
  { marca: null, re: /\b(mgt\d{3,5})\b/i },
  { marca: null, re: /\b(t64[a-z]?-?\d{3})\b/i },
  { marca: null, re: /\b(khmg\d{2,4})\b/i },
  { marca: null, re: /\b(in64-?[a-z0-9]{3,})\b/i },
];

/**
 * Linhas/séries que aparecem no título e valem como discriminador.
 *
 * Treasure Hunt e Super Treasure Hunt saíram daqui de propósito: são VARIANTE,
 * não linha, e a variante já separa a amostra. Deixá-las como linha fazia a
 * nossa "Mainline STH" bater de frente com a "Super Treasure Hunt" do eBay e
 * reprovar a peça certa por "linha diferente".
 */
const LINHAS = [
  'Car Culture', 'Pop Culture',
  'Team Transport', 'Boulevard', 'Fast & Furious', 'Velozes e Furiosos',
  'Premium', 'Mainline', 'Silhouette', 'Red Line Club', 'RLC',
  'Monster Trucks', 'Formula 1', 'F1', 'Kaido House', 'LB Works', 'LBWK',
  'Collectors', 'Retro Entertainment', 'Entertainment',
];

/** Linha genérica: é o "default" do fabricante, não discrimina peça nenhuma. */
const RE_LINHA_GENERICA = /^(mainline|b[áa]sic[oa]|regular|padr[ãa]o|comum)$/i;

/**
 * Limpa a linha declarada: tira marcador de variante que o vendedor jogou no
 * campo ("Mainline STH" é Mainline com a variante no lugar errado) e zera a
 * linha genérica, que não serve para separar peça.
 */
function limparLinha(linha: string | null): string | null {
  if (!linha) return null;
  const limpo = linha
    .replace(RE_SUPER_TH, ' ').replace(RE_TH, ' ').replace(RE_CHASE, ' ')
    .replace(/\s+/g, ' ').trim();
  if (!limpo || RE_LINHA_GENERICA.test(limpo)) return null;
  return limpo;
}

/** Ruído de anúncio: não identifica peça nenhuma. */
const RE_RUIDO =
  /\b(miniatura(?:s)?|carrinho(?:s)?|escala|colecionador|colec(?:ã|a)o|lacrad[oa]|nov[oa]|original|raro|raridade|importad[oa]|pronta\s*entrega|frete\s*gr(?:á|a)tis|promo(?:ç|c)(?:ã|a)o|diecast|die-cast|\d+\s*a\s*\d+\s*anos)\b/gi;

const RE_ESCALA_TXT = /\b1\s*[:/\-]\s*\d{2,3}\b/g;

// ─── Normalização de texto ───────────────────────────────────────────────────

/** Tira acento, baixa a caixa, colapsa espaço. */
function chave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface AnuncioParaKPV {
  title?: string | null;
  /** Entra só para achar variante declarada fora do título. */
  description?: string | null;
  brand?: string | null;
  line?: string | null;
  scale?: string | null;
  condition?: string | null;
}

export interface IdentidadeKPV {
  marca: string;
  /** Linha/série, do campo próprio ou achada no título. */
  linha: string | null;
  /** O que sobra do título depois de tirar marca, linha, variante e ruído. */
  modelo: string;
  variante: Variante;
  escala: string | null;
  condicao: string;
  /** Código de catálogo confiável, quando existe. */
  codigo: string | null;
  /** String canônica: dois anúncios com a mesma chave são a mesma peça. */
  chave: string;
}

/**
 * Contextos em que citar "chase" NÃO quer dizer que a peça é chase.
 *
 * Saíram das descrições reais do catálogo. O vendedor que trabalha com Tarmac e
 * Kaido costuma colar um aviso padrão ("possibilidade de versão Chase
 * distribuída aleatoriamente pelo fabricante"), e há quem escreva o contrário
 * ("Não possui versão Chase", "aberto só para ver se era Chase"). Ler isso como
 * declaração inverteria o sentido da frase e inflaria a referência de preço de
 * uma peça comum.
 */
const RE_NAO_E_DECLARACAO =
  /\b(?:n(?:ã|a)o\s+(?:possui|tem|(?:é|e)|vem)|sem\s+vers(?:ã|a)o|possibilidade\s+de|chance\s+de|caso\s+seja|pode\s+vir|se\s+(?:era|for|(?:é|e))|verificar\s+se|conferir\s+se|caso\s+venha)\b/i;

/** Quanto texto antes da palavra é olhado para achar a negação. */
const JANELA_NEGACAO = 60;

/**
 * A citação é uma declaração de que a peça É daquela variante, ou é ressalva?
 * Olha o pedaço de texto imediatamente antes da palavra.
 */
function ehDeclaracao(texto: string, re: RegExp): boolean {
  const m = re.exec(texto);
  if (!m) return false;
  const antes = texto.slice(Math.max(0, m.index - JANELA_NEGACAO), m.index);
  return !RE_NAO_E_DECLARACAO.test(antes);
}

/**
 * Descobre a variante. Super Treasure Hunt vence Treasure Hunt, que vence chase.
 *
 * O título manda: chase é argumento de venda, então quem tem põe na frente. A
 * descrição entra como reforço porque parte dos vendedores só declara lá (8 dos
 * 29 casos do catálogo), mas ali a citação passa pelo filtro de negação.
 */
export function detectarVariante(
  titulo: string | null | undefined,
  descricao?: string | null,
): Variante {
  const t = titulo ?? '';
  // Título que NEGA a variante ("NON Super Treasure Hunt") é regular: não deixa
  // a menção positiva logo em seguida marcar a peça como rara.
  if (!RE_VARIANTE_NEGADA.test(t)) {
    if (RE_SUPER_TH.test(t)) return 'super-treasure-hunt';
    if (RE_TH.test(t)) return 'treasure-hunt';
    if (RE_CHASE.test(t)) return 'chase';
  }
  if (RE_EXCLUSIVO.test(t)) return 'exclusivo-evento';

  const d = descricao ?? '';
  if (!d) return 'regular';
  if (ehDeclaracao(d, RE_SUPER_TH)) return 'super-treasure-hunt';
  if (ehDeclaracao(d, RE_TH)) return 'treasure-hunt';
  if (ehDeclaracao(d, RE_CHASE)) return 'chase';
  if (ehDeclaracao(d, RE_EXCLUSIVO)) return 'exclusivo-evento';
  return 'regular';
}

export function ehLote(titulo: string | null | undefined): boolean {
  return RE_LOTE.test(titulo ?? '');
}

export function ehFranquia(titulo: string | null | undefined): boolean {
  return RE_FRANQUIA.test(titulo ?? '');
}

/** Peça solta/aberta (loose), que não é novo-lacrado. */
export function ehAberto(titulo: string | null | undefined): boolean {
  return RE_ABERTO.test(titulo ?? '');
}

/**
 * Card de arte, ou peça customizada de uma variante rara. Não é item de fábrica,
 * então fica fora da comparação de preço.
 */
export function ehCustomizado(titulo: string | null | undefined): boolean {
  const t = titulo ?? '';
  if (RE_CARD_ART.test(t)) return true;
  return RE_CUSTOM.test(t) && detectarVariante(t) !== 'regular';
}

/** Conjunto de dois ou mais veículos descrito por extenso (F-100 + Bronco). */
export function ehConjunto(texto: string | null | undefined): boolean {
  return RE_CONJUNTO.test(texto ?? '');
}

/** Código de catálogo confiável, ou null. */
export function extrairCodigo(
  titulo: string | null | undefined,
  marca?: string | null,
): string | null {
  const t = titulo ?? '';
  for (const { marca: exigida, re } of CODIGOS) {
    if (exigida && normalizarMarca(marca).marca !== exigida) continue;
    const m = re.exec(t);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

/** Linha achada no título, se houver. A mais longa ganha ("Car Culture" > "Culture"). */
export function linhaNoTitulo(titulo: string | null | undefined): string | null {
  const k = chave(titulo ?? '');
  if (!k) return null;
  const achadas = LINHAS.filter((l) => k.includes(chave(l))).sort((a, b) => b.length - a.length);
  return achadas[0] ?? null;
}

/**
 * O modelo: o que sobra do título depois de tirar tudo que já vive em outro
 * campo (marca, linha, variante, escala) e o ruído de anúncio.
 *
 * Conservador de propósito: prefere sobrar palavra a mais do que apagar o nome
 * do carro. Modelo vazio derruba a identidade inteira.
 */
export function extrairModelo(
  titulo: string | null | undefined,
  marca?: string | null,
  linha?: string | null,
): string {
  let t = ` ${chave(titulo ?? '')} `;

  const remover = (frase: string) => {
    const k = chave(frase);
    if (k.length < 2) return;
    t = t.split(` ${k} `).join(' ');
  };

  // Marca em TODAS as grafias conhecidas, não só a canônica: o título costuma
  // trazer "Hotwheels" enquanto o campo já foi normalizado para "Hot Wheels",
  // e a sobra fazia a mesma peça virar duas referências de preço.
  const canonica = normalizarMarca(marca).marca;
  if (canonica) for (const g of grafiasDaMarca(canonica)) remover(g);
  if (marca) remover(marca);
  if (linha) remover(linha);
  for (const l of LINHAS) remover(l);

  t = t
    .replace(RE_SUPER_TH, ' ')
    .replace(RE_TH, ' ')
    .replace(RE_CHASE, ' ')
    .replace(RE_ESCALA_TXT, ' ')
    .replace(RE_RUIDO, ' ')
    // Código e número de coleção não fazem parte do nome do modelo.
    .replace(/#\s*\d{1,4}\b/g, ' ')
    // Pontuação vira espaço; o nome do carro sobrevive.
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return t;
}

// ─── Funko (identidade por categoria) ────────────────────────────────────────
//
// O KPV nasceu diecast (marca + linha + modelo + escala). Funko é outra
// categoria e não encaixa nessas guardas: não tem escala, e "Marvel"/"Batman"
// é o personagem, não motivo de excluir como franquia. Aqui vive só o que muda
// para Funko; todo o resto do porteiro continua igual para diecast.

/** True quando a marca canônica é Funko. */
export function ehFunko(marca: string | null | undefined): boolean {
  return marca === 'Funko';
}

const RE_ANO = /^(19|20)\d{2}$/;

/**
 * Número do Funko Pop: o identificador forte da peça (tipo o #NNNN do Mini GT).
 * Dois Funkos do mesmo personagem com números diferentes são peças diferentes.
 * 2-4 dígitos (Funko não usa 1 dígito), o último do título, ignorando ano.
 */
export function extrairCodigoFunko(titulo: string | null | undefined): string | null {
  const nums = [...(titulo ?? '').matchAll(/\b(\d{2,4})\b/g)]
    .map((m) => m[1])
    .filter((n) => !RE_ANO.test(n));
  return nums.length ? nums[nums.length - 1] : null;
}

// Chase e variantes que MUDAM o preço do Funko (não misturam com o comum). A
// lista é estreita de propósito: "Special Edition" sozinho é adesivo de loja
// (comum), então fica de fora; convenção (NYCC/SDCC) e acabamento (glow/flocked)
// entram.
const RE_FUNKO_CHASE = /\bchase\b/i;
const RE_FUNKO_ESPECIAL =
  /\b(glow|gitd|flocked|flocado|metallic|met[áa]lic[oa]|diamond|diamante|nycc|sdcc|eccc|c2e2|funko\s*shop|convention\s*exclusive)\b/i;

/**
 * Funko vende MUITO mais que a figure Pop: pôster emoldurado ("Movie Poster"),
 * camiseta ("Pop! Tees"), pin, chaveiro, caneca, mochila, pelúcia. Outro produto,
 * outro preço, não compara com a figure. O "Pinocchio & Jiminy #008" casou com um
 * "Funko Pop! Movie Poster with Case" a R$1.047. NÃO inclui "Moment"/"Deluxe"/
 * "Bitty" de propósito: aqueles ainda são figures (linhas diferentes), e o número
 * do Funko separa.
 */
const RE_FUNKO_NAO_FIGURE =
  /\b(movie\s*poster|pop!?\s*tees?|t-?shirts?|camisetas?|key\s*?chain|keychain|chaveiro|backpack|mochila|plush|pel[úu]cia|caneca|\bmug\b|\bpin\b|pins?\b)\b/i;

/** É um produto Funko que NÃO é a figure Pop (pôster, camiseta, chaveiro...). */
export function ehFunkoNaoFigure(titulo: string | null | undefined): boolean {
  return RE_FUNKO_NAO_FIGURE.test(titulo ?? '');
}

/** Variante do Funko: chase, especial (glow/flocked/convenção) ou comum. */
export function detectarVarianteFunko(titulo: string | null | undefined): Variante {
  const t = titulo ?? '';
  if (RE_FUNKO_CHASE.test(t)) return 'chase';
  if (RE_FUNKO_ESPECIAL.test(t)) return 'exclusivo-evento';
  return 'regular';
}

/**
 * Por que este anúncio NÃO entra na comparação de preço. Null = entra.
 *
 * Devolve motivo em texto porque isso vira relatório para o time: saber que
 * "312 ficaram de fora por não serem novo-lacrado" é diferente de ver só um
 * total menor.
 */
export function motivoNaoComparavel(a: AnuncioParaKPV): string | null {
  const titulo = (a.title ?? '').trim();
  if (!titulo) return 'sem título';
  if ((a.condition ?? '') !== CONDICAO_BASE) {
    return `condição é "${a.condition ?? 'não informada'}", e o KPV compara só ${CONDICAO_BASE}`;
  }
  const marca = normalizarMarcaDoAnuncio(a.brand, titulo).marca;
  if (ehLote(titulo)) return 'é lote ou pack, não peça única';
  // Em Funko, franquia (Marvel/Batman/...) é o personagem, não motivo de excluir.
  if (!ehFunko(marca) && ehFranquia(titulo)) return 'é veículo de franquia, tem mercado próprio';
  // Funko que não é figure (pôster, camiseta, chaveiro): outro produto, outro preço.
  if (ehFunko(marca) && ehFunkoNaoFigure(titulo)) {
    return 'é outro produto Funko (pôster/camiseta/chaveiro), não a figure Pop';
  }
  if (ehAberto(titulo)) return 'peça solta/aberta, e o KPV compara só novo-lacrado';
  if (ehCustomizado(titulo)) return 'é peça customizada ou card de arte, não item de fábrica';
  // A marca pode vir do título quando o campo falha. Isso importa dos dois
  // lados: o catálogo do Mercado Livre frequentemente NÃO preenche o atributo
  // "Marca", e exigir o campo derrubava 11 de 45 candidatos no piloto, antes
  // mesmo de olhar escala ou modelo.
  if (!marca) return 'marca fora da lista canônica';
  const modelo = extrairModelo(titulo, a.brand, a.line);
  if (!modelo) return 'não sobrou modelo depois de limpar o título';
  // Modelo que sobrou só como ANO ("2026") ou ESCALA ("1 64") não identifica peça
  // nenhuma e vira selo em cima de qualquer coisa (o "Hot Wheels 2026" casava com
  // qualquer HW de 2026). NÃO pega código real de modelo ("F40", "GT500"): esses
  // têm letra e não são ano/escala puros.
  if (modeloEhVago(modelo)) return 'modelo vago (só ano ou escala), não identifica a peça';
  return null;
}

const RE_SO_ANO = /^(?:19|20)\d{2}$/;
/** "1 64", "1:64", "1/64", "164" — escala travestida de modelo. */
const RE_SO_ESCALA = /^1\s*[:/.]?\s*\d{2,3}$/;

/** Modelo que não identifica peça: só ano ou só escala. F40/GT500 passam. */
export function modeloEhVago(modelo: string | null | undefined): boolean {
  const m = String(modelo ?? '').trim();
  if (!m) return true;
  return RE_SO_ANO.test(m) || RE_SO_ESCALA.test(m);
}

/** Identidade do anúncio, ou null quando ele não é comparável. */
export function identidadeDe(a: AnuncioParaKPV): IdentidadeKPV | null {
  if (motivoNaoComparavel(a)) return null;

  const titulo = (a.title ?? '').trim();
  const marca = normalizarMarcaDoAnuncio(a.brand, titulo).marca as string;
  const funko = ehFunko(marca);
  // Funko: sem linha (a "linha" seria a franquia, que é o personagem no modelo),
  // sem escala ('unica' sentinela), variante e código próprios. Diecast segue igual.
  const linha = funko ? null : limparLinha((a.line ?? '').trim() || linhaNoTitulo(titulo));
  const modelo = extrairModelo(titulo, a.brand, linha);
  const variante = funko ? detectarVarianteFunko(titulo) : detectarVariante(titulo, a.description);
  const escala = funko ? 'unica' : normalizarEscala(a.scale);

  return {
    marca,
    linha: linha || null,
    modelo,
    variante,
    escala,
    condicao: CONDICAO_BASE,
    codigo: funko ? extrairCodigoFunko(titulo) : extrairCodigo(titulo, a.brand),
    // Escala nula entra como "?" em vez de sumir: peça sem escala declarada não
    // pode ser tratada como se fosse da mesma escala das outras.
    chave: [marca, linha || '-', modelo, variante, escala ?? '?', CONDICAO_BASE]
      .map(chave)
      .join('|'),
  };
}

/**
 * São a mesma peça?
 *
 * Código confiável nos dois lados decide sozinho: é o identificador oficial, e
 * o mesmo item pode estar anunciado com títulos bem diferentes. Sem código, a
 * chave inteira precisa bater.
 */
export function mesmaPeca(a: IdentidadeKPV, b: IdentidadeKPV): boolean {
  if (a.variante !== b.variante) return false;
  if (a.codigo && b.codigo) return a.codigo === b.codigo && a.marca === b.marca;
  return a.chave === b.chave;
}

/** Agrupa anúncios por peça. A chave do mapa é a `chave` da identidade. */
export function agruparPorPeca<T extends AnuncioParaKPV>(
  anuncios: T[],
): Map<string, { identidade: IdentidadeKPV; itens: T[] }> {
  const grupos = new Map<string, { identidade: IdentidadeKPV; itens: T[] }>();
  for (const a of anuncios) {
    const id = identidadeDe(a);
    if (!id) continue;
    const atual = grupos.get(id.chave);
    if (atual) atual.itens.push(a);
    else grupos.set(id.chave, { identidade: id, itens: [a] });
  }
  return grupos;
}

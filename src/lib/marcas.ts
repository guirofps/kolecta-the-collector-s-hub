// ─── Marcas de miniatura: lista canônica e normalização ──────────────────────
//
// O campo de marca no wizard de criação era texto livre. Resultado no banco:
// 343 dos 821 anúncios ativos ficaram fora da lista, com a MESMA marca escrita
// de seis jeitos ("Hot Wheels", "Hotweels", "HOT WELLS ", "HotWheels"…). Isso
// quebra o filtro da categoria, quebra a busca, e inviabiliza comparar preço de
// mercado entre anúncios do mesmo produto.
//
// Aqui fica a fonte única: a lista fechada que o formulário oferece e a função
// que conserta o que já entrou torto.

/**
 * Marcas oferecidas no formulário, em ordem de uso real no catálogo.
 * "Outra" fica sempre no fim, para quem tem uma marca fora da lista.
 */
export const MARCAS_MINIATURA = [
  // Mais usadas no catálogo hoje
  'Hot Wheels', 'Mini GT', 'Matchbox', 'Tarmac Works', 'Kaido House',
  'Pop Race', 'Inno64', 'M2 Machines', 'Bburago', 'Majorette',
  'Tomica', 'Maisto', 'Greenlight', 'Johnny Lightning', 'Solido',
  'Auto World', 'Robert Design', 'MSZ', 'Time Micro',
  // Presentes no catálogo mas que faltavam na lista
  'Minichamps', 'Jada Toys', 'Welly', 'Schuco', 'Spark', 'Norev',
  'IXO Models', 'UT Models', 'BBR Models', 'Star Model', 'MyModelCollect',
  'Mac Tools', 'Fast & Speed', 'CCA', "D'Agostini",
  // Premium 1:64 que o mercado brasileiro pede
  'AUTOart', 'Kyosho', 'Era Car', 'Stance Hunters', 'Motorhelix', 'GCD',
  // Marcas menores e customizadores que apareceram no catálogo. Sem elas o
  // vendedor era empurrado para "Outra", que apaga a informação.
  'Storehouse Custom', 'SHOOM64', 'CKS', 'D Model', 'Cool Car', 'MoreArt',
  // Coleções de banca (fascículo), que o mercado trata como marca própria.
  'BR Classics', 'Carros Inesquecíveis',
  // Fora de miniatura de carro, mas com identidade limpa e mercado próprio: o
  // KPV passou a cobrir Funko (identidade por número, sem escala). Ver
  // kpv-identidade (ramo `marca === 'Funko'`).
  'Funko',
  'Outra',
] as const;

export type MarcaMiniatura = (typeof MARCAS_MINIATURA)[number];

/**
 * Montadoras de carro. Não são fabricantes de miniatura, mas foram digitadas
 * no campo por quem entendeu "marca" como a marca do carro. Não dá para
 * adivinhar o fabricante real a partir delas, então viram revisão humana.
 */
export const MONTADORAS = [
  'ferrari', 'honda', 'nissan', 'chevrolet', 'mazda', 'mercedes-benz',
  'mercedes benz', 'bugatti', 'alfa romeo', 'porsche', 'toyota', 'subaru',
  'lamborghini', 'bmw', 'audi', 'ford', 'volkswagen', 'mitsubishi',
];

/** Tira acento, baixa a caixa e colapsa espaço. Base de toda comparação. */
function chave(texto: string): string {
  return texto
    .normalize('NFD')
    // Faixa dos diacríticos combinantes (o acento que o NFD separou da letra).
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Grafias erradas vistas no banco → marca certa.
 *
 * Só entra aqui o que foi confirmado no catálogo real. Preferimos deixar de
 * fora e mandar para revisão a arriscar um palpite errado: marca errada num
 * anúncio some da vitrine e estraga a referência de preço.
 */
const APELIDOS: Record<string, MarcaMiniatura> = {
  // Hot Wheels: a campeã de variação (6 grafias, 105 anúncios)
  hotweels: 'Hot Wheels',
  hotwheels: 'Hot Wheels',
  'hot wells': 'Hot Wheels',
  'hot whells': 'Hot Wheels',
  'hot wheel': 'Hot Wheels',
  'hot wheel / mattel': 'Hot Wheels',
  mattel: 'Hot Wheels',
  // Mini GT
  minigt: 'Mini GT',
  'mini-gt': 'Mini GT',
  // Outras confirmadas
  burago: 'Bburago',
  bburago: 'Bburago',
  tarmac: 'Tarmac Works',
  'tarmak workserie': 'Tarmac Works',
  m2: 'M2 Machines',
  'match box': 'Matchbox',
  timemicro: 'Time Micro',
  inno: 'Inno64',
  'ixo model': 'IXO Models',
  ixo: 'IXO Models',
  bbr: 'BBR Models',
  'ut models': 'UT Models',
  minichamps: 'Minichamps',
  jada: 'Jada Toys',
  storehouse: 'Storehouse Custom',
  storehousecustom: 'Storehouse Custom',
  'more art': 'MoreArt',
  'br classics escala miniaturas': 'BR Classics',
  // Funko. Sem "pop" sozinho de propósito: colidiria com "Pop Race"/"Pop Culture".
  funko: 'Funko',
  'funko pop': 'Funko',
  'funko pop!': 'Funko',
  'boneco funko': 'Funko',
  'boneco funko pop': 'Funko',
};

/** Marcas canônicas indexadas pela chave normalizada. */
const CANONICAS = new Map<string, MarcaMiniatura>(
  MARCAS_MINIATURA.map((m) => [chave(m), m]),
);

export interface MarcaNormalizada {
  /** Marca canônica, ou null quando não deu para decidir com segurança. */
  marca: MarcaMiniatura | null;
  /**
   * - `exata`: já estava certa
   * - `corrigida`: erro de digitação/caixa/espaço, mapeado com segurança
   * - `extraida`: veio um título inteiro e a marca foi achada no começo dele
   * - `montadora`: é marca de carro, não de miniatura → revisão humana
   * - `desconhecida`: não bate com nada → revisão humana
   */
  origem: 'exata' | 'corrigida' | 'extraida' | 'montadora' | 'desconhecida';
}

/**
 * Descobre a marca canônica a partir do que o vendedor digitou.
 *
 * Nunca chuta: o que não dá para decidir volta com `marca: null` para revisão.
 */
export function normalizarMarca(bruto: string | null | undefined): MarcaNormalizada {
  // Guardamos o valor CRU para decidir se houve mudança. Comparar o texto já
  // aparado com o canônico dizia "exata" para "Hot Wheels " (com espaço no
  // fim), e 22 anúncios ficaram para trás na primeira normalização: para o
  // banco, "Hot Wheels " e "Hot Wheels" são marcas diferentes.
  const original = bruto ?? '';
  const texto = original.trim();
  if (!texto) return { marca: null, origem: 'desconhecida' };

  const k = chave(texto);

  // 1) Já é uma marca da lista (ignorando caixa, acento e espaço sobrando).
  const exata = CANONICAS.get(k);
  if (exata) {
    return { marca: exata, origem: original === exata ? 'exata' : 'corrigida' };
  }

  // 2) Grafia errada conhecida.
  const apelido = APELIDOS[k];
  if (apelido) return { marca: apelido, origem: 'corrigida' };

  // 3) Colaboração ("Mini GT x Kaido House"): fica com a primeira marca citada,
  //    que é como o mercado indexa esse tipo de item.
  const separadores = /\s*(?:\bx\b|\/|\+|&)\s*/i;
  if (separadores.test(texto)) {
    for (const parte of texto.split(separadores)) {
      const p = normalizarMarca(parte);
      if (p.marca) return { marca: p.marca, origem: 'corrigida' };
    }
  }

  // 4) O título inteiro foi colado no campo. A marca costuma estar no começo,
  //    então procuramos a canônica mais longa que prefixa o texto.
  const porTamanho = [...MARCAS_MINIATURA]
    .filter((m) => m !== 'Outra')
    .sort((a, b) => b.length - a.length);
  for (const m of porTamanho) {
    if (k.startsWith(chave(m))) return { marca: m, origem: 'extraida' };
  }
  for (const [apelidoK, m] of Object.entries(APELIDOS)) {
    if (k.startsWith(apelidoK)) return { marca: m, origem: 'extraida' };
  }

  // 5) Marca de carro no lugar do fabricante: não dá para adivinhar.
  if (MONTADORAS.some((mo) => k === mo || k.startsWith(mo + ' '))) {
    return { marca: null, origem: 'montadora' };
  }

  return { marca: null, origem: 'desconhecida' };
}

/**
 * Procura uma marca conhecida DENTRO de um texto livre (o título do anúncio).
 *
 * Devolve a que aparece mais cedo; empatando, a mais longa (para "Mini GT"
 * ganhar de "Mini" caso um dia exista). Só serve como reserva: o campo próprio
 * continua sendo a fonte preferida.
 */
export function marcaNoTexto(texto: string | null | undefined): MarcaMiniatura | null {
  const k = chave(texto ?? '');
  if (!k) return null;

  let melhor: { marca: MarcaMiniatura; onde: number; tam: number } | null = null;
  const considerar = (marca: MarcaMiniatura, agulha: string) => {
    const onde = k.indexOf(agulha);
    if (onde < 0) return;
    if (
      !melhor ||
      onde < melhor.onde ||
      (onde === melhor.onde && agulha.length > melhor.tam)
    ) {
      melhor = { marca, onde, tam: agulha.length };
    }
  };

  for (const m of MARCAS_MINIATURA) {
    if (m === 'Outra') continue;
    considerar(m, chave(m));
  }
  for (const [apelido, m] of Object.entries(APELIDOS)) considerar(m, apelido);

  return melhor ? melhor.marca : null;
}

/**
 * Marca do anúncio olhando o campo E, como reserva, o título.
 *
 * Existe por um caso concreto e comum: o vendedor entende "marca" como a marca
 * do CARRO e digita "Nissan", mas escreve o fabricante no título —
 * `marca="Nissan"`, `título="Hot Wheels Premium - Nissan Skyline GT-R (R32)"`.
 * O campo sozinho não tem conserto; com o título, tem.
 */
export function normalizarMarcaDoAnuncio(
  brand: string | null | undefined,
  title: string | null | undefined,
): MarcaNormalizada {
  const peloCampo = normalizarMarca(brand);
  if (peloCampo.marca) return peloCampo;

  // O campo não resolveu (montadora ou desconhecida). Tenta o título.
  const doTitulo = marcaNoTexto(title);
  if (doTitulo) return { marca: doTitulo, origem: 'extraida' };

  return peloCampo;
}

/**
 * Todas as grafias conhecidas de uma marca: a canônica e os apelidos.
 *
 * Serve para LIMPAR texto. O KPV precisa tirar a marca do título antes de
 * comparar o modelo, e tirar só a forma canônica não basta: "Hot Wheels Nissan
 * Skyline" e "Hotwheels Nissan Skyline" viravam peças diferentes porque a
 * segunda ficava com "hotwheels" grudado no nome do modelo.
 */
export function grafiasDaMarca(marca: MarcaMiniatura): string[] {
  const apelidos = Object.entries(APELIDOS)
    .filter(([, m]) => m === marca)
    .map(([a]) => a);
  // Mais longa primeiro: remover "hot wheels" antes de "hw" evita deixar sobra.
  return [marca, ...apelidos].sort((a, b) => b.length - a.length);
}

/**
 * Marca pronta para gravar, aplicada na hora de montar o payload.
 *
 * Existe porque a lista fechada no formulário NÃO basta. Dois vazamentos reais,
 * vistos no banco depois que o seletor subiu:
 *
 *  - Na edição, o anúncio antigo chega com "Mini Gt". O seletor não acha opção
 *    equivalente e mostra vazio, mas o valor no formulário continua "Mini Gt" e
 *    volta ao banco intacto se o vendedor não encostar no campo.
 *  - "Hotwheels " (com espaço no fim) entrou por um caminho que não passa pelo
 *    seletor.
 *
 * Normalizar aqui, onde todo caminho de escrita converge, resolve os dois de
 * uma vez, e o próximo caminho novo já nasce protegido.
 *
 * O que não dá para decidir é preservado aparado, nunca descartado: marca
 * pequena de verdade fora da lista é informação, e apagá-la seria pior do que
 * a grafia torta.
 */
export function marcaParaSalvar(
  bruto: string | null | undefined,
  titulo?: string | null,
): string | undefined {
  const texto = (bruto ?? '').trim();
  const { marca } = normalizarMarcaDoAnuncio(texto, titulo);
  return marca ?? (texto || undefined);
}

// ─── Escala ──────────────────────────────────────────────────────────────────

export const ESCALAS_MINIATURA = [
  // 1:41 é a escala da coleção Shell Ferrari (Bburago). Fora da lista, os
  // anúncios dela caíam em "Outra" e sumiam de qualquer filtro por escala.
  '1:64', '1:43', '1:41', '1:32', '1:24', '1:18', '1:12', 'Outra',
] as const;

/**
 * Normaliza a escala. Aceita "1/64" e "1-64", que aparecem no banco, e devolve
 * sempre o formato com dois pontos.
 */
/** Escala pronta para gravar. Mesma ideia de `marcaParaSalvar`. */
export function escalaParaSalvar(bruto: string | null | undefined): string | undefined {
  const texto = (bruto ?? '').trim();
  return normalizarEscala(texto) ?? (texto || undefined);
}

export function normalizarEscala(bruto: string | null | undefined): string | null {
  const texto = (bruto ?? '').trim();
  if (!texto) return null;

  const padrao = texto.replace(/\s+/g, '').replace(/[/\-]/g, ':');
  const achou = ESCALAS_MINIATURA.find((e) => e === padrao);
  if (achou) return achou;

  return chave(texto) === 'outra' ? 'Outra' : null;
}

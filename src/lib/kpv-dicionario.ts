// ─── KPV: dicionário de identidade (EAN e SKU do fabricante) ─────────────────
//
// Muda o jogo do casamento. Até aqui, decidir se dois anúncios são a mesma peça
// era comparar nome com nome e confiar num porteiro, que erra para os dois
// lados: recusa peça certa e às vezes deixa passar peça errada.
//
// Com EAN não se compara, se VERIFICA. O código bate ou não bate. Confirmado na
// prática: o EAN 810152148402 devolveu UM produto no catálogo do Mercado Livre,
// com `GTIN=00810152148402` nos atributos. Um resultado, o certo.
//
// O SKU do fabricante sozinho NÃO serve como busca: procurar "T64T-TL001"
// devolveu televisão e tampa de vaso. Ele entra só como confirmação quando já
// se tem candidato.
//
// A fonte é a exportação do catálogo de uma loja própria: 577 produtos, todos
// com SKU e 91% com EAN. Vale como DICIONÁRIO, não como fonte de preço: usar o
// preço da própria casa como "referência de mercado" seria circular.

export interface EntradaDicionario {
  nome: string;
  /** Código do fabricante, ex: MGT00902-007E, T64T-TL001-CC, JHW63. */
  sku: string;
  /** EAN-13 já validado. Vazio quando o produto não tem. */
  ean: string;
  marca: string;
}

// ─── EAN ─────────────────────────────────────────────────────────────────────

/**
 * Valida um EAN-13 pelo dígito verificador.
 *
 * Não é preciosismo: a planilha é preenchida à mão, e EAN com dígito errado
 * simplesmente não existe em catálogo nenhum. Consultar um assim é gastar
 * chamada de API para receber zero resultado, e pior, é achar que a peça não
 * existe quando o errado era o código.
 */
export function eanValido(bruto: string | null | undefined): boolean {
  const d = String(bruto ?? '').replace(/\D/g, '');
  // EAN-8 e UPC-A (12) também aparecem; normalizamos para 13 com zeros.
  if (![8, 12, 13].includes(d.length)) return false;
  const cheio = d.length === 13 ? d : d.padStart(13, '0');
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += Number(cheio[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (soma % 10)) % 10 === Number(cheio[12]);
}

/** Deixa o EAN no formato de 13 dígitos, ou vazio quando não é válido. */
export function normalizarEan(bruto: string | null | undefined): string {
  const d = String(bruto ?? '').replace(/\D/g, '');
  if (!eanValido(d)) return '';
  return d.length === 13 ? d : d.padStart(13, '0');
}

// ─── Leitura da planilha ─────────────────────────────────────────────────────

/**
 * Divide um CSV respeitando aspas.
 *
 * Escrito à mão de propósito: a descrição dos produtos tem ponto e vírgula e
 * quebra de linha DENTRO do campo, e um split ingênuo transforma 577 produtos
 * em 3.600 linhas quebradas.
 */
export function dividirCSV(texto: string, separador = ';'): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else dentroDeAspas = false;
      } else campo += c;
    } else if (c === '"') dentroDeAspas = true;
    else if (c === separador) { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

/** Monta o dicionário a partir do conteúdo do CSV exportado. */
export function lerDicionario(csv: string): EntradaDicionario[] {
  const linhas = dividirCSV(csv);
  if (!linhas.length) return [];
  const cabecalho = linhas[0].map((c) => c.trim());
  const col = (nome: string) => cabecalho.indexOf(nome);
  const iNome = col('Nome');
  const iSku = col('SKU');
  const iEan = col('Código de barras');
  const iMarca = col('Marca');
  if (iNome < 0) return [];

  const vistos = new Set<string>();
  const entradas: EntradaDicionario[] = [];
  for (const l of linhas.slice(1)) {
    const nome = (l[iNome] ?? '').trim();
    // Linha de continuação da descrição não tem nome nem colunas suficientes.
    if (!nome || l.length < cabecalho.length / 2) continue;
    const sku = (l[iSku] ?? '').trim();
    const chave = `${nome}|${sku}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    entradas.push({
      nome,
      sku,
      ean: normalizarEan(l[iEan]),
      marca: (l[iMarca] ?? '').trim(),
    });
  }
  return entradas;
}

// ─── Casamento por nome ──────────────────────────────────────────────────────

function chave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Palavras que não identificam peça nenhuma.
 *
 * O NOME DAS MARCAS entra aqui, e isso é o ponto mais importante do arquivo.
 * Sem elas, qualquer "Hot Wheels X" casava com qualquer "Hot Wheels Y" curto,
 * porque as duas palavras da marca sozinhas já davam 67% de sobreposição. O
 * estrago foi medido: 231 de 349 peças receberam o EAN de outra peça, e 45
 * carros distintos apontaram todos para uma Barbie.
 */
const RUIDO = new Set([
  // Genéricos de anúncio
  'miniatura', 'miniaturas', 'carrinho', 'carro', 'escala', 'de', 'da', 'do',
  'e', 'a', 'o', 'com', 'em', 'para', 'novo', 'nova', 'lacrado', 'lacrada',
  'original', 'colecionavel', 'colecao', 'premium', 'serie', 'series',
  '1', '64', '43', '32', '24', '18', '12',
  // Marcas: são o que os dois lados SEMPRE têm em comum, e por isso não
  // distinguem nada.
  'hot', 'wheels', 'hotwheels', 'mini', 'gt', 'minigt', 'matchbox', 'mattel',
  'tarmac', 'works', 'kaido', 'house', 'inno64', 'inno', 'pop', 'race',
  'bburago', 'burago', 'majorette', 'tomica', 'maisto', 'greenlight',
  'johnny', 'lightning', 'solido', 'auto', 'world', 'm2', 'machines',
  'jada', 'toys', 'welly', 'schuco', 'spark', 'norev', 'ixo', 'models',
  'minichamps', 'kyosho', 'autoart', 'funko', 'msz',
]);

function palavras(texto: string): Set<string> {
  return new Set(chave(texto).split(' ').filter((t) => t.length >= 2 && !RUIDO.has(t)));
}

/**
 * Quantas palavras identificadoras os dois nomes têm em comum, no mínimo, para
 * o casamento valer.
 *
 * Uma palavra só não basta: "Porsche" aparece em dezenas de peças diferentes.
 */
const MINIMO_PALAVRAS_COMUNS = 2;

/**
 * Número de coleção presente no nome, ex: "#902" ou o 00902 de "MGT00902".
 *
 * É o identificador mais forte que dá para tirar de um nome solto, e casa o
 * anúncio nosso com a linha da planilha mesmo quando o resto do texto é
 * completamente diferente.
 */
export function numeroDeColecao(texto: string | null | undefined): string | null {
  const t = String(texto ?? '');
  const porSku = /\b(?:mgt|khmg)0*(\d{3,4})\b/i.exec(t);
  if (porSku) return porSku[1];
  const porHash = /#\s?0*(\d{3,4})\b/.exec(t);
  if (porHash) return porHash[1];
  return null;
}

export interface Casamento {
  entrada: EntradaDicionario;
  /** Como foi decidido. `numero` é forte, `nome` é por semelhança. */
  por: 'numero' | 'nome';
  /** Sobreposição de palavras, de 0 a 1. */
  forca: number;
}

/**
 * Acha no dicionário a linha que corresponde a um anúncio nosso.
 *
 * Devolve null quando a semelhança não é convincente. Casar errado aqui é pior
 * do que não casar: o EAN errado leva a um produto errado no Mercado Livre, e
 * dessa vez com aparência de certeza absoluta, porque veio de código.
 */
export function casarNoDicionario(
  titulo: string | null | undefined,
  dicionario: EntradaDicionario[],
  minimo = 0.6,
): Casamento | null {
  const t = String(titulo ?? '').trim();
  if (!t) return null;

  const numero = numeroDeColecao(t);
  const meus = palavras(t);
  if (!meus.size) return null;

  let melhor: Casamento | null = null;

  for (const e of dicionario) {
    // A marca do dicionário NÃO entra na comparação: ela é o que os dois lados
    // sempre têm em comum, e por isso não distingue nada.
    const dele = palavras(e.nome);
    if (!dele.size) continue;
    let comuns = 0;
    for (const p of meus) if (dele.has(p)) comuns++;
    const forca = comuns / Math.min(meus.size, dele.size);

    // Número de coleção batendo é sinal forte, mas ainda exige que o nome
    // tenha relação: numeração se repete entre marcas diferentes.
    // O próprio número aparece nas duas listas de palavras, então ele sozinho
    // já daria uma "palavra em comum". Exigir duas garante que pelo menos uma
    // seja de verdade: sem isso, "Tomica Supra #902" casava com o BMW #902.
    const numDele = numeroDeColecao(`${e.nome} ${e.sku}`);
    if (numero && numDele === numero && comuns >= MINIMO_PALAVRAS_COMUNS) {
      if (!melhor || melhor.por === 'nome' || forca > melhor.forca) {
        melhor = { entrada: e, por: 'numero', forca };
      }
      continue;
    }

    // Proporção E quantidade absoluta. Só a proporção deixava passar nome
    // curto: duas palavras iguais num nome de três davam 67%, e bastava a
    // marca para chegar lá.
    if (
      forca >= minimo
      && comuns >= MINIMO_PALAVRAS_COMUNS
      && (!melhor || (melhor.por === 'nome' && forca > melhor.forca))
    ) {
      melhor = { entrada: e, por: 'nome', forca };
    }
  }

  return melhor;
}

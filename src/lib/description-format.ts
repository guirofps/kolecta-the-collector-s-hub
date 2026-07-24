// ─── Formatação da descrição do anúncio ──────────────────────
// O vendedor escreve num campo de texto livre e o resultado sai amassado por
// dois motivos:
//
//  1. HTML colapsa quebra de linha. O vendedor separa em linhas, e a tela
//     junta tudo num parágrafo só.
//  2. Muita gente lista os diferenciais com marcador no meio da frase
//     ("Diferenciais ✓ item um. ✓ item dois."), esperando que virem uma lista.
//
// Aqui a descrição é lida e transformada em blocos: parágrafo ou lista. Nada é
// inventado nem reescrito, só reorganizado. O texto do vendedor é dele.

/** Marcadores que as pessoas usam para listar, no começo da linha ou no meio. */
const MARCADORES = ['✓', '✔', '☑', '•', '●', '▪', '►', '→', '·'];

export type Bloco =
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'lista'; itens: string[] };

/** Espaço repetido e linha em branco demais viram espaçamento normal. */
function limpar(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Tira o marcador do início e a pontuação solta do fim. */
function limparItem(texto: string): string {
  let t = texto.trim();
  for (const m of MARCADORES) {
    if (t.startsWith(m)) { t = t.slice(m.length).trim(); break; }
  }
  // Hífen ou asterisco como marcador, mas só quando seguido de espaço: assim
  // "1-2 dias úteis" e "3*4cm" não são confundidos com item de lista.
  t = t.replace(/^[-*]\s+/, '');
  return t.replace(/[.;,]+$/, '').trim();
}

/** A linha começa com marcador? */
function ehItem(linha: string): boolean {
  const t = linha.trim();
  return MARCADORES.some((m) => t.startsWith(m)) || /^[-*]\s+\S/.test(t);
}

/**
 * Quebra em linhas os marcadores usados no meio do texto.
 * "Diferenciais ✓ um. ✓ dois." vira três linhas.
 */
function quebrarMarcadoresInline(texto: string): string {
  const classe = MARCADORES.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
  // Só quebra quando o marcador não está já no início da linha.
  return texto.replace(new RegExp(`(?<!^)(?<!\\n)\\s*([${classe}])\\s*`, 'g'), '\n$1 ');
}

/**
 * Lê a descrição crua e devolve os blocos a renderizar.
 * Texto vazio devolve lista vazia, e a tela decide o que mostrar.
 */
export function formatarDescricao(bruto: string | null | undefined): Bloco[] {
  const texto = limpar(bruto ?? '');
  if (!texto) return [];

  // Linha vazia NÃO é descartada: ela é o que separa um parágrafo do outro.
  const linhas = quebrarMarcadoresInline(texto)
    .split('\n')
    .map((l) => l.trim());

  const blocos: Bloco[] = [];
  let itens: string[] = [];
  let paragrafo: string[] = [];

  const fecharLista = () => {
    if (itens.length) { blocos.push({ tipo: 'lista', itens }); itens = []; }
  };
  const fecharParagrafo = () => {
    if (paragrafo.length) {
      blocos.push({ tipo: 'paragrafo', texto: paragrafo.join(' ') });
      paragrafo = [];
    }
  };

  for (const linha of linhas) {
    if (!linha) {
      // Linha em branco fecha o bloco atual: é a separação de parágrafo.
      fecharParagrafo();
      fecharLista();
    } else if (ehItem(linha)) {
      fecharParagrafo();
      const item = limparItem(linha);
      if (item) itens.push(item);
    } else {
      fecharLista();
      paragrafo.push(linha);
    }
  }
  fecharParagrafo();
  fecharLista();

  // Lista de um item só não é lista: vira parágrafo, para não ficar um
  // marcador solto na tela.
  return blocos.map((b) =>
    b.tipo === 'lista' && b.itens.length === 1
      ? { tipo: 'paragrafo' as const, texto: b.itens[0] }
      : b,
  );
}

/** A descrição tem algum conteúdo depois de limpa? */
export function temDescricao(bruto: string | null | undefined): boolean {
  return formatarDescricao(bruto).length > 0;
}

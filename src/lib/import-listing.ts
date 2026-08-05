// ─── Importação de anúncios por planilha ─────────────────────
//
// O modelo antigo pedia title, price, condition, description, images e alguns
// campos soltos. Não pedia CATEGORIA, não exigia fotos, não pedia peso nem
// dimensões, e listava condições de um vocabulário que o sistema abandonou
// (lacrado/novo/mint/usado, quando o banco grava novo-lacrado e afins).
//
// O resultado apareceu em produção: um vendedor subiu 363 anúncios, quase todos
// sem categoria, sem marca e sem dados de frete. Anúncio assim não aparece na
// busca certa e cobra frete errado. A culpa não é de quem preencheu.
//
// Aqui o modelo passa a pedir tudo que o formulário exige, e a planilha é
// validada ANTES de subir: o vendedor corrige na origem em vez de descobrir o
// estrago depois de 300 anúncios publicados.

import { CONDITIONS } from '@/lib/conditions';
import { CATEGORY_FIELDS, fieldsForCategory } from '@/lib/category-fields';
import { MIN_PHOTOS, MAX_PHOTOS } from '@/lib/photos';

export const MIN_TITLE = 10;
export const MIN_DESCRIPTION = 30;
// Reexportado porque a planilha e o validador já eram importados daqui. O
// número mora em lib/photos, fonte única da regra.
export { MIN_PHOTOS, MAX_PHOTOS };

/** Colunas do modelo, na ordem em que aparecem na planilha. */
export interface ColunaModelo {
  chave: string;
  titulo: string;
  obrigatoria: boolean;
  ajuda: string;
  exemplo: string;
}

export const COLUNAS: ColunaModelo[] = [
  {
    chave: 'title', titulo: 'Título', obrigatoria: true,
    ajuda: `Mínimo ${MIN_TITLE} caracteres`,
    exemplo: 'Hot Wheels Nissan Skyline GT-R R34 Premium',
  },
  {
    chave: 'category', titulo: 'Categoria', obrigatoria: true,
    // A causa raiz: sem isto o anúncio não aparece na categoria certa e o
    // comprador nunca acha o item.
    ajuda: Object.keys(CATEGORY_FIELDS).join(' | '),
    exemplo: 'miniaturas-diecast',
  },
  {
    chave: 'condition', titulo: 'Condição', obrigatoria: true,
    ajuda: CONDITIONS.map((c) => c.value).join(' | '),
    exemplo: 'novo-lacrado',
  },
  {
    chave: 'description', titulo: 'Descrição', obrigatoria: true,
    ajuda: `Mínimo ${MIN_DESCRIPTION} caracteres. Use " - " no começo da linha para virar item de lista`,
    exemplo: 'Lacrado, nunca aberto. Card protegido desde o primeiro dia.',
  },
  {
    chave: 'price', titulo: 'Preço (R$)', obrigatoria: true,
    ajuda: 'Use ponto ou vírgula. Ex: 149.90 ou 149,90',
    exemplo: '149.90',
  },
  {
    chave: 'images', titulo: 'Fotos (URLs)', obrigatoria: true,
    ajuda: `De ${MIN_PHOTOS} a ${MAX_PHOTOS} URLs separadas por vírgula`,
    exemplo: 'https://site.com/1.jpg, https://site.com/2.jpg, https://site.com/3.jpg',
  },
  {
    chave: 'brand', titulo: 'Marca / Fabricante', obrigatoria: false,
    ajuda: 'Obrigatório em miniaturas e action figures',
    exemplo: 'Hot Wheels',
  },
  {
    chave: 'scale', titulo: 'Escala', obrigatoria: false,
    ajuda: 'Obrigatório em miniaturas. Ex: 1:64',
    exemplo: '1:64',
  },
  {
    chave: 'jogo', titulo: 'Jogo / Universo', obrigatoria: false,
    ajuda: 'Obrigatório em cards. Ex: Pokémon',
    exemplo: '',
  },
  {
    chave: 'line', titulo: 'Linha / Série', obrigatoria: false,
    ajuda: 'Obrigatório em action figures e Funko',
    exemplo: 'Premium',
  },
  {
    chave: 'personagem', titulo: 'Personagem', obrigatoria: false,
    ajuda: 'Obrigatório em action figures',
    exemplo: '',
  },
  {
    chave: 'numero', titulo: 'Número do Pop', obrigatoria: false,
    ajuda: 'Obrigatório em Funko Pop',
    exemplo: '',
  },
  {
    chave: 'tituloObra', titulo: 'Título da obra', obrigatoria: false,
    ajuda: 'Obrigatório em mangás e HQs',
    exemplo: '',
  },
  {
    chave: 'weight_grams', titulo: 'Peso (g)', obrigatoria: true,
    // Sem peso e medida o frete sai errado e alguém paga a diferença.
    ajuda: 'Peso da embalagem pronta, em gramas',
    exemplo: '150',
  },
  {
    chave: 'width_cm', titulo: 'Largura (cm)', obrigatoria: true,
    ajuda: 'Embalagem pronta', exemplo: '15',
  },
  {
    chave: 'height_cm', titulo: 'Altura (cm)', obrigatoria: true,
    ajuda: 'Embalagem pronta', exemplo: '10',
  },
  {
    chave: 'length_cm', titulo: 'Comprimento (cm)', obrigatoria: true,
    ajuda: 'Embalagem pronta', exemplo: '5',
  },
  {
    chave: 'sku', titulo: 'SKU', obrigatoria: false,
    // Pedido dos lojistas: é o código deles, para casar a venda aqui com o
    // controle de estoque que já usam. Opcional de propósito, porque
    // colecionador pessoa física não trabalha com SKU.
    ajuda: 'Opcional. Seu código interno de estoque',
    exemplo: 'HW-R34-001',
  },
  {
    chave: 'stock', titulo: 'Quantidade', obrigatoria: false,
    // Em branco vira 1, que é o caso da maioria em colecionável. Marcar como
    // obrigatória quebraria as planilhas que os vendedores já montaram, e o
    // efeito prático seria o mesmo: todo mundo digitando 1.
    ajuda: 'Quantas unidades iguais. Em branco = 1',
    exemplo: '1',
  },
  {
    chave: 'year', titulo: 'Ano', obrigatoria: false,
    ajuda: 'Opcional', exemplo: '2023',
  },
  {
    chave: 'edition', titulo: 'Edição', obrigatoria: false,
    ajuda: 'Opcional', exemplo: '',
  },
  {
    chave: 'editora', titulo: 'Editora', obrigatoria: false,
    ajuda: 'Obrigatória em mangas-hqs. É por ela que o comprador navega na categoria',
    exemplo: 'Panini',
  },
  {
    chave: 'tipo', titulo: 'Tipo de acessório', obrigatoria: false,
    ajuda: 'Obrigatório em acessorios. Ex: Rodas | Pneus | Expositor / Display',
    exemplo: 'Rodas',
  },
  {
    chave: 'escalaCompativel', titulo: 'Escala compatível', obrigatoria: false,
    ajuda: 'Obrigatória em acessorios. Ex: 1:64 | 1:18 | Várias',
    exemplo: '1:64',
  },
];

/** Escapa um campo para CSV (aspas duplas quando há vírgula, aspas ou quebra). */
function csvCampo(valor: string): string {
  return /[",\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/**
 * Gera o CSV modelo, com cabeçalho, uma linha de instruções e um exemplo.
 *
 * O BOM (﻿) no início faz o Excel abrir com acento correto. Sem ele,
 * "Condição" vira "CondiÃ§Ã£o" e o vendedor acha que a planilha está quebrada.
 */
export function gerarTemplateCsv(): string {
  const cabecalho = COLUNAS.map((c) => c.chave).join(',');
  const rotulos = COLUNAS.map((c) => csvCampo(c.titulo + (c.obrigatoria ? ' *' : ''))).join(',');
  const ajudas = COLUNAS.map((c) => csvCampo(c.ajuda)).join(',');
  const exemplo = COLUNAS.map((c) => csvCampo(c.exemplo)).join(',');
  return `﻿${cabecalho}\n${rotulos}\n${ajudas}\n${exemplo}\n`;
}

// ─── Leitura do CSV ──────────────────────────────────────────

/**
 * Parser de CSV que respeita aspas, vírgula dentro do campo e quebra de linha
 * dentro de aspas. A descrição costuma ter vírgula, então um `split(',')` cru
 * embaralharia as colunas e o vendedor levaria a culpa.
 */
export function lerCsv(texto: string): Record<string, string>[] {
  const limpo = texto.replace(/^﻿/, ''); // BOM do Excel
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (dentroDeAspas) {
      if (c === '"' && limpo[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') dentroDeAspas = false;
      else campo += c;
    } else if (c === '"') dentroDeAspas = true;
    else if (c === ',' || c === ';') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  if (!linhas.length) return [];

  const cabecalho = linhas.shift()!.map((h) => h.trim());
  return linhas
    // Descarta linha totalmente vazia (o Excel costuma deixar uma no fim) e as
    // duas linhas de ajuda do próprio modelo, para não virarem erro.
    .filter((l) => l.some((c) => c.trim() !== ''))
    .map((l) => Object.fromEntries(cabecalho.map((h, i) => [h, (l[i] ?? '').trim()])))
    .filter((obj) => {
      const t = (obj.title ?? '').trim();
      return t !== '' && t !== 'Título *' && !t.startsWith('Mínimo ');
    });
}

// ─── Validação ───────────────────────────────────────────────

export interface ErroLinha {
  linha: number;      // número da linha no arquivo, como o vendedor vê
  campo: string;
  mensagem: string;
}

export interface ResultadoValidacao {
  totalLinhas: number;
  validas: number;
  erros: ErroLinha[];
}

const SLUGS_CATEGORIA = Object.keys(CATEGORY_FIELDS);
const VALORES_CONDICAO = CONDITIONS.map((c) => c.value);

/** Aceita "149.90", "149,90" e "R$ 149,90". Devolve null quando não dá para ler. */
export function lerPreco(bruto: string): number | null {
  const limpo = (bruto ?? '').replace(/[R$\s]/gi, '').trim();
  if (!limpo) return null;
  const norm = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = Number(norm);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Quantidade em estoque da planilha. Vazio vira 1, que é o caso da maioria em
 * colecionável e evita quebrar as planilhas montadas antes desta coluna existir.
 */
export function lerEstoque(bruto: string): number {
  const n = Number((bruto ?? '').replace(',', '.').trim());
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Divide as URLs de foto e descarta o que não for link. */
export function lerFotos(bruto: string): string[] {
  return (bruto ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\/\S+$/i.test(s));
}

/** Valida uma linha da planilha. `numeroLinha` é o que o vendedor vê no Excel. */
export function validarLinha(
  linha: Record<string, string>,
  numeroLinha: number,
): ErroLinha[] {
  const erros: ErroLinha[] = [];
  const add = (campo: string, mensagem: string) =>
    erros.push({ linha: numeroLinha, campo, mensagem });
  const val = (k: string) => (linha[k] ?? '').trim();

  const titulo = val('title');
  if (!titulo) add('title', 'Título vazio');
  else if (titulo.length < MIN_TITLE) add('title', `Título muito curto (mínimo ${MIN_TITLE} caracteres)`);

  const categoria = val('category');
  if (!categoria) add('category', 'Categoria vazia');
  else if (!SLUGS_CATEGORIA.includes(categoria)) {
    add('category', `Categoria desconhecida. Use: ${SLUGS_CATEGORIA.join(', ')}`);
  }

  const condicao = val('condition');
  if (!condicao) add('condition', 'Condição vazia');
  else if (!VALORES_CONDICAO.includes(condicao)) {
    add('condition', `Condição inválida. Use: ${VALORES_CONDICAO.join(', ')}`);
  }

  const descricao = val('description');
  if (!descricao) add('description', 'Descrição vazia');
  else if (descricao.length < MIN_DESCRIPTION) {
    add('description', `Descrição muito curta (mínimo ${MIN_DESCRIPTION} caracteres)`);
  }

  if (lerPreco(val('price')) === null) {
    add('price', 'Preço inválido ou zerado. Ex: 149.90');
  }

  const fotos = lerFotos(val('images'));
  if (fotos.length < MIN_PHOTOS) {
    add('images', `Envie de ${MIN_PHOTOS} a ${MAX_PHOTOS} URLs de foto (encontrei ${fotos.length})`);
  } else if (fotos.length > MAX_PHOTOS) {
    add('images', `Máximo de ${MAX_PHOTOS} fotos (encontrei ${fotos.length})`);
  }

  // Frete: número inteiro maior que zero nos quatro campos.
  for (const [chave, rotulo] of [
    ['weight_grams', 'Peso'], ['width_cm', 'Largura'],
    ['height_cm', 'Altura'], ['length_cm', 'Comprimento'],
  ] as const) {
    const n = Number(val(chave).replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      add(chave, `${rotulo} inválido. Sem isso o frete sai errado.`);
    }
  }

  // Quantidade: vazio é aceito e vira 1 (ver lerEstoque). Só recusa o que foi
  // preenchido errado, como 0 ou texto, porque anúncio no ar com estoque zero
  // é uma venda que não pode ser cumprida.
  const estoqueCru = val('stock');
  if (estoqueCru) {
    const n = Number(estoqueCru.replace(',', '.'));
    if (!Number.isInteger(n) || n < 1) {
      add('stock', 'Quantidade inválida. Use um número inteiro a partir de 1, ou deixe em branco.');
    }
  }

  // Campos que a categoria escolhida exige. Só faz sentido checar se a
  // categoria for válida, senão o erro vira ruído.
  if (SLUGS_CATEGORIA.includes(categoria)) {
    for (const campo of fieldsForCategory(categoria)) {
      if (!campo.required) continue;
      if (!val(campo.key)) {
        add(campo.key, `${campo.label} é obrigatório em ${categoria}`);
      }
    }
  }

  return erros;
}

/** Valida a planilha inteira. Devolve o resumo e todos os erros. */
export function validarPlanilha(linhas: Record<string, string>[]): ResultadoValidacao {
  const erros: ErroLinha[] = [];
  let validas = 0;
  linhas.forEach((linha, i) => {
    // +2: a linha 1 é o cabeçalho, então a primeira de dados é a 2 no Excel.
    const doArquivo = i + 2;
    const dela = validarLinha(linha, doArquivo);
    if (dela.length === 0) validas++;
    erros.push(...dela);
  });
  return { totalLinhas: linhas.length, validas, erros };
}

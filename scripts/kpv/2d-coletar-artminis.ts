// ─── KPV passo 2d: preço da planilha (loja parceira) ─────────────────────────
//
//   npx vite-node scripts/kpv/2d-coletar-artminis.ts
//
// Fonte de CUSTO ZERO. A exportação de catálogo de uma loja de varejo real (a
// mesma que virou dicionário de EAN) tem preço em 577 produtos. Não é a
// Kolecta: é uma revendedora, e o preço dela é preço de mercado como o de
// qualquer loja. Já está no disco, então não gasta uma requisição.
//
// Casa por EAN (via dicionário) ou por nome, e adiciona o preço como UMA
// amostra de loja. Vale como reforço e como SEGUNDA FONTE (o que leva à
// confiança alta), nunca sozinha: um vendedor só não passa da regra dos 3.
//
// Ressalva do próprio Guilherme: essa loja tende a ter preço mais BAIXO. Como
// é um ponto entre vários e nunca publica sozinha (1 vendedor < 3), a mediana
// das outras fontes segura. Só ajuda quem já tem amostra de ML/eBay.

import { readFileSync } from 'node:fs';
import { carregar, salvar, brl } from './comum';
import { dividirCSV, normalizarEan } from '../../src/lib/kpv-dicionario';
import { casarNoDicionario, type EntradaDicionario } from '../../src/lib/kpv-dicionario';
import type { AmostraPreco } from '../../src/lib/kpv-referencia';
import type { ItemDaFila } from './1-preparar';
import type { Coleta } from './2-coletar';

const CSV = 'C:\\Users\\Guilherme Rojas\\Downloads\\Planilha importacao .csv';

interface Produto extends EntradaDicionario {
  precoEmCentavos: number;
}

// ── Lê a planilha COM preço ──
const linhas = dividirCSV(readFileSync(CSV).toString('latin1'));
const cab = linhas[0].map((c) => c.trim());
const col = (n: string) => cab.indexOf(n);
const iNome = col('Nome'), iSku = col('SKU'), iEan = col('Código de barras'), iMarca = col('Marca');
const iPreco = col('Preço'), iPromo = col('Preço promocional');

const preco = (s: string) => Math.round((Number(String(s ?? '').replace(',', '.')) || 0) * 100);

const produtos: Produto[] = [];
for (const l of linhas.slice(1)) {
  const nome = (l[iNome] ?? '').trim();
  if (!nome || l.length < cab.length / 2) continue;
  // Preço de venda: o promocional quando existe, senão o cheio. É o que a peça
  // custa de fato na prateleira.
  const p = preco(l[iPromo]) || preco(l[iPreco]);
  if (!p) continue;
  produtos.push({
    nome, sku: (l[iSku] ?? '').trim(), ean: normalizarEan(l[iEan]),
    marca: (l[iMarca] ?? '').trim(), precoEmCentavos: p,
  });
}
console.log(`planilha: ${produtos.length} produtos com preço`);

// Índice por EAN, para casamento verificado.
const porEan = new Map<string, Produto>();
for (const p of produtos) if (p.ean) porEan.set(p.ean, p);

const fila = carregar<ItemDaFila[]>('fila.json');
let jaFeitas: Coleta[] = [];
try { jaFeitas = carregar<Coleta[]>('coletas.json'); } catch { jaFeitas = []; }
const jaComArtminis = new Set(
  jaFeitas.filter((c) => c.fonte === 'loja' && c.amostras.some((a) => a.vendedorId === 'loja:artminis')).map((c) => c.chave),
);

const coletas: Coleta[] = [...jaFeitas];
let porEanCount = 0, porNome = 0;
const casados: { titulo: string; via: string; preco: number }[] = [];

// A fila (passo 1) já contém só peças comparáveis, então não há o que refiltrar.
for (const item of fila) {
  if (jaComArtminis.has(item.chave)) continue;

  let achado: Produto | null = null;
  let via = 'nome';

  // 1) EAN, quando a fila já tem.
  if (item.ean && porEan.has(item.ean)) { achado = porEan.get(item.ean)!; via = 'ean'; }

  // 2) Nome, pelo mesmo casador do dicionário.
  if (!achado) {
    const c = casarNoDicionario(item.anuncios[0].title, produtos as EntradaDicionario[]);
    if (c) { achado = produtos.find((p) => p.sku === c.entrada.sku && p.nome === c.entrada.nome) ?? null; }
  }
  if (!achado || !achado.precoEmCentavos) continue;

  // Adiciona o preço da planilha como uma amostra de loja NA coleta existente
  // da peça (se houver), ou cria uma nova. Assim ele soma às outras fontes.
  const amostra: AmostraPreco = {
    precoEmCentavos: achado.precoEmCentavos,
    fonte: 'loja',
    vendedorId: 'loja:artminis',
  };
  const existente = coletas.find((c) => c.chave === item.chave && c.fonte === 'loja');
  if (existente) existente.amostras.push(amostra);
  else coletas.push({ chave: item.chave, fonte: 'loja', casadoCom: 'planilha', via: via as any, amostras: [amostra] });

  if (via === 'ean') porEanCount++; else porNome++;
  casados.push({ titulo: item.anuncios[0].title.slice(0, 50), via, preco: achado.precoEmCentavos });
}

salvar('coletas.json', coletas);

console.log(`\ncasados com a planilha: ${casados.length}  (${porEanCount} por EAN, ${porNome} por nome)`);
console.log(`${'─'.repeat(60)}`);
for (const c of casados.slice(0, 30)) {
  console.log(`  [${c.via === 'ean' ? 'EAN' : 'nome'}] ${brl(c.preco).padStart(11)}  ${c.titulo}`);
}
if (casados.length > 30) console.log(`  ... e mais ${casados.length - 30}`);
console.log(`\ngravado. próximo: npx vite-node scripts/kpv/3-consolidar.ts`);

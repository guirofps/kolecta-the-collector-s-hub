// ─── KPV passo 2b: coletar no eBay ───────────────────────────────────────────
//
//   npx vite-node scripts/kpv/2b-coletar-ebay.ts        (todas as peças eBay)
//   npx vite-node scripts/kpv/2b-coletar-ebay.ts 15     (só as 15 primeiras)
//
// Segunda fonte, para o que o Mercado Livre não tem: chase, Treasure Hunt e
// exclusivo de evento, que o vendedor brasileiro não anuncia em marketplace
// grande. A fila (passo 1) já roteou essas peças para 'ebay'.
//
// Diferente do ML, o eBay não tem catálogo de produto: é busca de anúncio. Cada
// anúncio passa pelo mesmo porteiro do ML, e o preço em dólar vira real com
// imposto de importação — usar o dólar cru subestimaria o mercado brasileiro
// pela metade.

import { writeFileSync } from 'node:fs';
import { carregar, salvar, buscarEbay, buscarEbayGtin, cotacaoDolar, pausa, brl, PASTA_DADOS } from './comum';
import { identidadeDe, CONDICAO_BASE } from '../../src/lib/kpv-identidade';
import { candidatoServe, converterDeDolar } from '../../src/lib/kpv-fonte';
import type { AmostraPreco } from '../../src/lib/kpv-referencia';
import type { ItemDaFila } from './1-preparar';
import type { Coleta } from './2-coletar';

const limite = Number(process.argv[2]) || Infinity;
// `--todas` varre o eBay em TODA peça comparável, não só as especiais. O eBay é
// o maior mercado de miniatura do mundo, então serve de segunda fonte para o
// que o ML já tem (leva à confiança alta) e de cobertura para o que ele não
// achou. Sem a flag, roda só as roteadas (chase/exclusivo), como antes.
const todas = process.argv.includes('--todas');
const fila = carregar<ItemDaFila[]>('fila.json');

let jaFeitas: Coleta[] = [];
try { jaFeitas = carregar<Coleta[]>('coletas.json'); } catch { jaFeitas = []; }
// Não reconsulta peça que já rendeu preço no eBay.
const resolvidasEbay = new Set(
  jaFeitas.filter((c) => c.fonte === 'ebay' && c.amostras.length > 0).map((c) => c.chave),
);
const alvo = fila
  .filter((f) => (todas || f.fonte === 'ebay') && !resolvidasEbay.has(f.chave))
  .slice(0, limite);

// Imposto de importação (Remessa Conforme, 2026): até US$50 são 20%, acima
// US$50 são 60%. ICMS unificado em 17%. O câmbio é o do dia.
const cambio = await cotacaoDolar();
console.log(`fila eBay: ${fila.filter((f) => f.fonte === 'ebay').length} peças`);
console.log(`nesta rodada: ${alvo.length}   |   dólar hoje: R$ ${cambio.toFixed(2)}\n`);

const coletas: Coleta[] = [...jaFeitas];
const recusas: Record<string, number> = {};
let feitas = 0;
let comPreco = 0;

for (const item of alvo) {
  feitas++;
  if (feitas % 5 === 0) {
    writeFileSync(
      `${PASTA_DADOS}\\progresso.txt`,
      `eBay ${feitas}/${alvo.length} · ${comPreco} com preço · ${new Date().toLocaleTimeString('pt-BR')}\n`,
      'utf8',
    );
    console.log(`  ... ${feitas}/${alvo.length}`);
  }
  if (feitas % 25 === 0) salvar('coletas.json', coletas);

  // EAN primeiro: é o caminho exato, recupera peça que a busca por nome não
  // acha (nome torto ou em português). Só cai no nome se a peça não tem EAN ou
  // se o EAN não devolveu nada no eBay.
  let anuncios = item.ean ? await buscarEbayGtin(item.ean, 50) : [];
  let viaEan = anuncios.length > 0;
  await pausa(400);
  if (!anuncios.length) {
    const termo = `${item.identidade.marca} ${item.identidade.modelo}`.slice(0, 90);
    anuncios = await buscarEbay(termo, 50);
    viaEan = false;
    await pausa(400);
  }

  // Menor preço por vendedor entre os que passam pelo porteiro.
  const porVendedor = new Map<string, { usd: number; url: string }>();
  let ultimaRecusa = 'nenhum anúncio no eBay';
  for (const a of anuncios) {
    if (a.condicao.toLowerCase() !== 'new') continue;
    const cand = identidadeDe({ title: a.titulo, condition: CONDICAO_BASE, scale: item.identidade.escala });
    if (!cand) { ultimaRecusa = 'anúncio sem identidade'; continue; }
    const v = candidatoServe(item.identidade, cand);
    if (!v.serve) { ultimaRecusa = v.motivo!; continue; }
    const atual = porVendedor.get(a.vendedor);
    if (!atual || a.precoUsd < atual.usd) porVendedor.set(a.vendedor, { usd: a.precoUsd, url: a.url });
  }

  if (!porVendedor.size) {
    const chave = ultimaRecusa.replace(/\(.*\)/, '').trim();
    recusas[chave] = (recusas[chave] ?? 0) + 1;
    coletas.push({ chave: item.chave, fonte: 'ebay', amostras: [], recusa: chave });
    continue;
  }

  // Dólar → real com imposto. O custo DESEMBARCADO (peça + frete + impostos) é
  // o que serve de teto para o preço no Brasil: se importar sai por X, ninguém
  // paga muito mais que X aqui.
  const amostras: AmostraPreco[] = [];
  for (const [vendedor, { usd, url }] of porVendedor) {
    const importacao = usd > 50 ? 0.6 : 0.2;
    const { custoDesembarcadoEmReais } = converterDeDolar(usd, { cambio, importacao, icms: 0.17 });
    amostras.push({
      precoEmCentavos: Math.round(custoDesembarcadoEmReais * 100),
      fonte: 'ebay',
      vendedorId: `ebay:${vendedor}`,
      url,
      moedaOriginal: 'USD',
    });
  }
  comPreco++;
  coletas.push({ chave: item.chave, fonte: 'ebay', casadoCom: `eBay: ${anuncios[0]?.titulo.slice(0, 40)}`, via: viaEan ? 'ean' : 'nome', amostras });
}

salvar('coletas.json', coletas);

// ── Conferência do lote ──
const novas = coletas.filter((c) => c.fonte === 'ebay' && alvo.some((a) => a.chave === c.chave) && c.amostras.length > 0);
console.log(`\n${'─'.repeat(72)}\nCONFIRA OS CASAMENTOS eBay DESTE LOTE (${novas.length})\n`);
for (const c of novas) {
  const item = fila.find((f) => f.chave === c.chave)!;
  const precos = c.amostras.map((a) => a.precoEmCentavos).sort((x, y) => x - y);
  const mediana = precos[Math.floor(precos.length / 2)];
  console.log(`  nosso: ${String(item.anuncios[0].title).slice(0, 60)}`);
  console.log(`  ${c.casadoCom}`);
  console.log(`         ${c.amostras.length} vendedores · desembarcado ~${brl(mediana)} · variante ${item.identidade.variante}\n`);
}

console.log(`consultadas: ${feitas}`);
console.log(`com preço  : ${comPreco} (${Math.round(comPreco / Math.max(1, feitas) * 100)}%)`);
console.log(`\nrecusas:`);
for (const [m, n] of Object.entries(recusas).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${m}`);
console.log(`\ngravado. próximo: npx vite-node scripts/kpv/3-consolidar.ts`);

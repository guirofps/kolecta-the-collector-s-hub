// ─── KPV passo 2: coletar preço nas fontes externas ──────────────────────────
//
//   npx vite-node scripts/kpv/2-coletar.ts            (fila inteira)
//   npx vite-node scripts/kpv/2-coletar.ts 50         (só as 50 primeiras)
//
// Hoje só o Mercado Livre está ligado. O eBay entra aqui como mais um coletor
// quando a credencial sair; a fila já marca quais peças são dele.
//
// Cada candidato passa pelo porteiro (kpv-fonte). Recusar é o comportamento
// esperado e frequente: no piloto, das 45 peças testadas só 8 tinham candidato
// que de fato era a mesma peça.

import { writeFileSync } from 'node:fs';
import { getML, salvar, carregar, pausa, PASTA_DADOS } from './comum';
import { identidadeDe, CONDICAO_BASE } from '../../src/lib/kpv-identidade';
import { candidatoServe } from '../../src/lib/kpv-fonte';
import type { AmostraPreco } from '../../src/lib/kpv-referencia';
import type { ItemDaFila } from './1-preparar';

export interface Coleta {
  chave: string;
  fonte: string;
  /** Como a peça foi identificada na fonte, para auditar o casamento depois. */
  casadoCom?: string;
  amostras: AmostraPreco[];
  recusa?: string;
}

const limite = Number(process.argv[2]) || Infinity;
const refazerTudo = process.argv.includes('--refazer');
const fila = carregar<ItemDaFila[]>('fila.json');

// INCREMENTAL por padrão. Peça que já rendeu preço não é consultada de novo:
// são centenas de chamadas à API e horas de espera para chegar no mesmo lugar.
// Quem NÃO rendeu é reconsultado, porque a busca melhorou desde a última vez.
// `--refazer` força tudo, para quando a lógica de casamento mudar de verdade.
let jaFeitas: Coleta[] = [];
if (!refazerTudo) {
  try { jaFeitas = carregar<Coleta[]>('coletas.json'); } catch { jaFeitas = []; }
}
const resolvidas = new Set(jaFeitas.filter((c) => c.amostras.length > 0).map((c) => c.chave));

const alvo = fila
  .filter((f) => f.fonte === 'mercado-livre' && !resolvidas.has(f.chave))
  .slice(0, limite);

console.log(`fila: ${fila.length} peças`);
if (resolvidas.size) console.log(`já resolvidas antes: ${resolvidas.size} (puladas)`);
console.log(`nesta rodada: ${alvo.length} para o Mercado Livre`);
console.log(`(${fila.filter((f) => f.fonte === 'ebay').length} aguardam a credencial do eBay)\n`);

// Começa com o que já estava resolvido, para o arquivo final ficar completo.
const coletas: Coleta[] = jaFeitas.filter((c) => c.amostras.length > 0);
const recusas: Record<string, number> = {};
const porVia: Record<string, number> = {};
let feitas = 0;

for (const item of alvo) {
  feitas++;
  if (feitas % 10 === 0) {
    // Progresso vai para ARQUIVO, não só para o console: rodando em segundo
    // plano o Node segura o stdout até o fim, e uma coleta de meia hora fica
    // indistinguível de uma travada. O arquivo é gravado na hora.
    const pct = Math.round((feitas / alvo.length) * 100);
    const comPreco = coletas.filter((c) => c.amostras.length > 0).length;
    writeFileSync(
      `${PASTA_DADOS}\\progresso.txt`,
      `${feitas}/${alvo.length} (${pct}%) · ${comPreco} com preço · ${new Date().toLocaleTimeString('pt-BR')}\n`,
      'utf8',
    );
    console.log(`  ... ${feitas}/${alvo.length}`);
  }
  // Salva o acumulado a cada 50: se cair a luz ou eu precisar matar o
  // processo, a próxima rodada retoma daqui em vez de recomeçar do zero.
  if (feitas % 50 === 0) salvar('coletas.json', coletas);

  let escolhido: any = null;
  let ultimaRecusa = 'candidato sem identidade';
  let via: 'ean' | 'nome' = 'nome';

  // ── Caminho 1: EAN. Verifica em vez de comparar. ──
  // Quando o dicionário deu um EAN, a busca devolve o produto exato e o GTIN
  // dos atributos CONFIRMA que é ele. Nada de porteiro: ou o código bate, ou
  // não bate.
  if (item.ean) {
    const r = await getML(`/products/search?status=active&site_id=MLB&q=${item.ean}`);
    await pausa();
    for (const p of r.corpo?.results ?? []) {
      const at = Object.fromEntries((p.attributes ?? []).map((a: any) => [a.name, a.value_name]));
      const gtin = String(at['Código universal de produto'] ?? at['GTIN'] ?? '').replace(/\D/g, '');
      // Compara sem os zeros à esquerda: o ML devolve GTIN-14 e o nosso é
      // EAN-13, então "00810152148402" e "0810152148402" são o mesmo código.
      if (!gtin || gtin.replace(/^0+/, '') !== item.ean.replace(/^0+/, '')) continue;

      // O GTIN bater prova que o EAN é daquele produto, NÃO que aquele EAN é
      // da nossa peça. Se o dicionário casou errado o nome com a planilha, o
      // código está certo e a peça é outra. Custou caro descobrir: numa
      // rodada, 231 de 349 peças receberam o EAN de outra, e 45 carros
      // distintos apontaram todos para uma Barbie.
      //
      // Então o candidato passa pelo MESMO porteiro do caminho por nome. O
      // EAN acelera a busca; quem valida continua sendo a identidade.
      const cand = identidadeDe({
        title: p.name, brand: at['Marca'], line: at['Série do veículo'],
        scale: at['Escala'], condition: CONDICAO_BASE,
      });
      if (!cand) { ultimaRecusa = 'produto do EAN sem identidade'; continue; }
      const v = candidatoServe(item.identidade, cand);
      if (!v.serve) { ultimaRecusa = `EAN levou a peça diferente: ${v.motivo}`; continue; }

      escolhido = p;
      via = 'ean';
      break;
    }
    if (!escolhido && !ultimaRecusa.startsWith('EAN')) {
      ultimaRecusa = 'EAN sem produto correspondente na fonte';
    }
  }

  // ── Caminho 2: nome, com o porteiro. ──
  if (!escolhido) {
    const termo = `${item.identidade.marca} ${item.identidade.modelo}`.slice(0, 90);
    const busca = await getML(`/products/search?status=active&site_id=MLB&q=${encodeURIComponent(termo)}`);
    await pausa();

    const candidatos = busca.corpo?.results ?? [];
    if (!candidatos.length) ultimaRecusa = 'nenhum produto na fonte';

    // Testa todos os candidatos, não só o primeiro: o produto certo pode não
    // ser o mais bem rankeado pela busca deles.
    for (const p of candidatos.slice(0, 8)) {
      const at = Object.fromEntries((p.attributes ?? []).map((a: any) => [a.name, a.value_name]));
      const cand = identidadeDe({
        title: p.name, brand: at['Marca'], line: at['Série do veículo'],
        scale: at['Escala'], condition: CONDICAO_BASE,
      });
      if (!cand) continue;
      const v = candidatoServe(item.identidade, cand);
      if (v.serve) { escolhido = p; break; }
      ultimaRecusa = v.motivo!;
    }
  }

  if (!escolhido) {
    const chave = ultimaRecusa.replace(/\(.*\)/, '').trim();
    recusas[chave] = (recusas[chave] ?? 0) + 1;
    coletas.push({ chave: item.chave, fonte: 'mercado-livre', amostras: [], recusa: chave });
    continue;
  }
  porVia[via] = (porVia[via] ?? 0) + 1;

  // Anúncios reais daquele produto de catálogo.
  const amostras: AmostraPreco[] = [];
  let offset = 0;
  while (offset < 200) {
    const r = await getML(`/products/${escolhido.id}/items?limit=50&offset=${offset}`);
    if (r.status !== 200) break;
    const res = r.corpo?.results ?? [];
    for (const a of res) {
      // A condição é do ANÚNCIO, não do produto. O KPV só compara novo.
      if (a.condition !== 'new') continue;
      amostras.push({
        precoEmCentavos: Math.round(Number(a.price) * 100),
        fonte: 'mercado-livre',
        vendedorId: String(a.seller_id),
        url: a.permalink,
      });
    }
    const total = r.corpo?.paging?.total ?? 0;
    offset += 50;
    if (offset >= total || !res.length) break;
    await pausa(250);
  }
  await pausa();

  coletas.push({ chave: item.chave, fonte: 'mercado-livre', casadoCom: escolhido.name, amostras });
}

// ── Conferência do lote ──
// Trabalhar por lote só funciona se der para OLHAR o que casou. Sem isto, o
// erro só aparece no fim de uma rodada inteira, que foi como se descobriu que
// 231 de 349 peças tinham recebido o produto de outra.
const novas = coletas.filter((c) => alvo.some((a) => a.chave === c.chave) && c.casadoCom);
console.log(`\n${'─'.repeat(72)}\nCONFIRA OS CASAMENTOS DESTE LOTE (${novas.length})\n`);
for (const c of novas) {
  const item = fila.find((f) => f.chave === c.chave)!;
  const marca = item.identidade.marca;
  console.log(`  nosso: ${String(item.anuncios[0].title).slice(0, 62)}`);
  console.log(`  achou: ${String(c.casadoCom).slice(0, 62)}`);
  console.log(`         ${c.amostras.length} preços · ${item.ean ? 'via EAN' : 'via nome'} · ${marca}\n`);
}

// Assinatura de contaminação: peças diferentes apontando para o mesmo produto.
const uso = new Map<string, number>();
for (const c of coletas) if (c.casadoCom) uso.set(c.casadoCom, (uso.get(c.casadoCom) ?? 0) + 1);
const suspeitos = [...uso.entries()].filter(([, n]) => n > 1);
if (suspeitos.length) {
  console.log(`ALERTA: ${suspeitos.length} produto(s) usados por mais de uma peça nossa:`);
  for (const [prod, n] of suspeitos.slice(0, 5)) console.log(`  ${n}x  ${prod.slice(0, 58)}`);
  console.log('  Isso quase sempre é casamento errado. Verifique antes de publicar.\n');
} else {
  console.log('Nenhum produto compartilhado entre peças: sem sinal de contaminação.\n');
}

const comAmostra = coletas.filter((c) => c.amostras.length > 0);
console.log(`\nconsultadas nesta rodada: ${feitas}`);
console.log(`total acumulado: ${coletas.length}`);
console.log(`com preço: ${comAmostra.length} (${Math.round(comAmostra.length / Math.max(1, coletas.length) * 100)}%)`);
console.log(`\ncomo o produto foi identificado:`);
console.log(`  ${String(porVia.ean ?? 0).padStart(4)}  por EAN (verificado pelo GTIN)`);
console.log(`  ${String(porVia.nome ?? 0).padStart(4)}  por nome (passou pelo porteiro)`);
console.log(`\nrecusas:`);
for (const [m, n] of Object.entries(recusas).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${m}`);
}

const caminho = salvar('coletas.json', coletas);
console.log(`\ngravado em ${caminho}`);
console.log(`próximo passo: npx vite-node scripts/kpv/3-consolidar.ts`);

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

import { getML, salvar, carregar, pausa } from './comum';
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
let feitas = 0;

for (const item of alvo) {
  feitas++;
  if (feitas % 25 === 0) console.log(`  ... ${feitas}/${alvo.length}`);

  const termo = `${item.identidade.marca} ${item.identidade.modelo}`.slice(0, 90);
  const busca = await getML(`/products/search?status=active&site_id=MLB&q=${encodeURIComponent(termo)}`);
  await pausa();

  const candidatos = busca.corpo?.results ?? [];
  if (!candidatos.length) {
    coletas.push({ chave: item.chave, fonte: 'mercado-livre', amostras: [], recusa: 'nenhum produto na fonte' });
    recusas['nenhum produto na fonte'] = (recusas['nenhum produto na fonte'] ?? 0) + 1;
    continue;
  }

  // Testa todos os candidatos, não só o primeiro: o produto certo pode não ser
  // o mais bem rankeado pela busca deles.
  let escolhido: any = null;
  let ultimaRecusa = 'candidato sem identidade';
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

  if (!escolhido) {
    const chave = ultimaRecusa.replace(/\(.*\)/, '').trim();
    recusas[chave] = (recusas[chave] ?? 0) + 1;
    coletas.push({ chave: item.chave, fonte: 'mercado-livre', amostras: [], recusa: chave });
    continue;
  }

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

const comAmostra = coletas.filter((c) => c.amostras.length > 0);
console.log(`\nconsultadas nesta rodada: ${feitas}`);
console.log(`total acumulado: ${coletas.length}`);
console.log(`com preço: ${comAmostra.length} (${Math.round(comAmostra.length / Math.max(1, coletas.length) * 100)}%)`);
console.log(`\nrecusas do porteiro:`);
for (const [m, n] of Object.entries(recusas).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${m}`);
}

const caminho = salvar('coletas.json', coletas);
console.log(`\ngravado em ${caminho}`);
console.log(`próximo passo: npx vite-node scripts/kpv/3-consolidar.ts`);

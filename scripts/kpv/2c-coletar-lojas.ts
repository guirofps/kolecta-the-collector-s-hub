// ─── KPV passo 2c: coletar em lojas próprias ─────────────────────────────────
//
//   npx vite-node scripts/kpv/2c-coletar-lojas.ts        (todas as peças)
//   npx vite-node scripts/kpv/2c-coletar-lojas.ts 20     (só as 20 primeiras)
//
// Terceira fonte. Loja especializada brasileira, preço em real, sem imposto.
// Cobre o que ML e eBay deixam de fora e, quando a peça já tinha preço numa
// fonte, uma segunda fonte é o que permite CONFIANÇA ALTA (fonte única nunca
// chega lá, por regra).
//
// Roda contra QUALQUER peça, não só as roteadas: a loja é fonte adicional para
// todas. A maioria das buscas volta vazia (a loja só estoca algumas centenas
// de SKUs), e isso é esperado.
//
// Gentileza obrigatória: são sites de lojistas pequenos, não APIs. Pausa longa
// entre buscas, para não parecer ataque.

import { writeFileSync } from 'node:fs';
import { carregar, salvar, pausa, brl, PASTA_DADOS } from './comum';
import { extrairOfertas, LOJAS } from '../../src/lib/kpv-lojas';
import { identidadeDe, CONDICAO_BASE } from '../../src/lib/kpv-identidade';
import { candidatoServe } from '../../src/lib/kpv-fonte';
import type { AmostraPreco } from '../../src/lib/kpv-referencia';
import type { ItemDaFila } from './1-preparar';
import type { Coleta } from './2-coletar';

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

const limite = Number(process.argv[2]) || Infinity;
const fila = carregar<ItemDaFila[]>('fila.json');

let jaFeitas: Coleta[] = [];
try { jaFeitas = carregar<Coleta[]>('coletas.json'); } catch { jaFeitas = []; }
// Só reconsulta peça que ainda não tem preço de loja. ML e eBay ficam intactos.
const comLoja = new Set(
  jaFeitas.filter((c) => c.fonte === 'loja' && c.amostras.length > 0).map((c) => c.chave),
);
// Estas lojas são especializadas em 1:64 premium e importado. Buscar Hot
// Wheels mainline nelas é gastar requisição à toa: elas mal estocam. Miramos
// as marcas que de fato vendem, que é onde ML e eBay são mais fracos e onde
// uma segunda fonte doméstica vale mais.
const MARCAS_DE_LOJA = new Set([
  'Mini GT', 'Kaido House', 'Tarmac Works', 'Inno64', 'Pop Race', 'BBR Models',
  'MSZ', 'Minichamps', 'Time Micro', 'Stance Hunters', 'Motorhelix', 'GCD',
  'Era Car', 'MyModelCollect', 'Bburago',
]);
const alvo = fila
  .filter((f) => !comLoja.has(f.chave) && MARCAS_DE_LOJA.has(f.identidade.marca))
  .slice(0, limite);

console.log(`fila total: ${fila.length}   |   nesta rodada: ${alvo.length}`);
console.log(`lojas: ${LOJAS.map((l) => l.nome).join(', ')}\n`);

const coletas: Coleta[] = [...jaFeitas];
let feitas = 0;
let comPreco = 0;
const porLoja: Record<string, number> = {};

for (const item of alvo) {
  feitas++;
  if (feitas % 10 === 0) {
    writeFileSync(
      `${PASTA_DADOS}\\progresso.txt`,
      `lojas ${feitas}/${alvo.length} · ${comPreco} com preço · ${new Date().toLocaleTimeString('pt-BR')}\n`,
      'utf8',
    );
    console.log(`  ... ${feitas}/${alvo.length}`);
  }
  if (feitas % 30 === 0) salvar('coletas.json', coletas);

  const termo = `${item.identidade.marca} ${item.identidade.modelo}`.replace(/\s+/g, ' ').trim();
  const porVendedor = new Map<string, number>();

  for (const loja of LOJAS) {
    let html = '';
    try {
      const r = await fetch(loja.busca(termo.slice(0, 60)), { headers: UA });
      if (r.status === 200) html = await r.text();
    } catch { /* loja fora do ar: segue para a próxima */ }
    await pausa(900); // gentileza com o lojista
    if (!html) continue;

    const { ofertas } = extrairOfertas(html, loja);
    for (const o of ofertas) {
      const cand = identidadeDe({ title: o.titulo, condition: CONDICAO_BASE, scale: item.identidade.escala });
      if (!cand) continue;
      if (!candidatoServe(item.identidade, cand).serve) continue;
      // Uma oferta por loja: a loja é o "vendedor". Menor preço vence.
      const atual = porVendedor.get(o.loja);
      if (atual == null || o.precoEmCentavos < atual) porVendedor.set(o.loja, o.precoEmCentavos);
    }
  }

  if (!porVendedor.size) {
    coletas.push({ chave: item.chave, fonte: 'loja', amostras: [], recusa: 'nenhuma loja tem a peça' });
    continue;
  }

  const amostras: AmostraPreco[] = [...porVendedor].map(([loja, preco]) => ({
    precoEmCentavos: preco,
    fonte: 'loja',
    vendedorId: `loja:${loja}`,
  }));
  for (const loja of porVendedor.keys()) porLoja[loja] = (porLoja[loja] ?? 0) + 1;
  comPreco++;
  coletas.push({ chave: item.chave, fonte: 'loja', casadoCom: `${porVendedor.size} loja(s)`, via: 'nome', amostras });
}

salvar('coletas.json', coletas);

const novas = coletas.filter((c) => c.fonte === 'loja' && alvo.some((a) => a.chave === c.chave) && c.amostras.length > 0);
console.log(`\n${'─'.repeat(72)}\nCONFIRA OS CASAMENTOS EM LOJA (${novas.length})\n`);
for (const c of novas) {
  const item = fila.find((f) => f.chave === c.chave)!;
  const precos = c.amostras.map((a) => a.precoEmCentavos).sort((x, y) => x - y);
  console.log(`  nosso: ${String(item.anuncios[0].title).slice(0, 60)}`);
  console.log(`         ${c.casadoCom} · ${precos.map(brl).join(', ')}\n`);
}

console.log(`consultadas: ${feitas}   |   com preço em loja: ${comPreco}`);
console.log(`por loja: ${Object.entries(porLoja).map(([l, n]) => `${l}=${n}`).join(' · ') || '(nenhuma)'}`);
console.log(`\ngravado. próximo: npx vite-node scripts/kpv/3-consolidar.ts`);

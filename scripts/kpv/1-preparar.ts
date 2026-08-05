// ─── KPV passo 1: montar a fila de trabalho ──────────────────────────────────
//
// Lê o catálogo, descarta o que não é comparável, agrupa anúncios que são a
// mesma peça e diz de qual fonte cada uma deve ser buscada.
//
//   npx vite-node scripts/kpv/1-preparar.ts
//
// Sai um arquivo em scripts/kpv/dados/fila.json, que o passo 2 consome.

import { consultar, salvar } from './comum';
import { identidadeDe, motivoNaoComparavel, type AnuncioParaKPV, type IdentidadeKPV } from '../../src/lib/kpv-identidade';
import { fonteRecomendada, type FonteKPV } from '../../src/lib/kpv-fonte';

interface AnuncioBanco extends AnuncioParaKPV {
  id: string;
  price_in_cents: string | null;
}

export interface ItemDaFila {
  chave: string;
  identidade: IdentidadeKPV;
  fonte: FonteKPV;
  /** Anúncios nossos que são esta peça. */
  anuncios: { id: string; title: string; precoEmCentavos: number }[];
}

const rows = await consultar<AnuncioBanco>(`
  SELECT id, title, COALESCE(description,'') AS description, brand, line, scale,
         condition, price_in_cents
  FROM listings
  WHERE status = 'active'
    AND category_id = (SELECT id FROM categories WHERE slug = 'miniaturas-diecast')`);

console.log(`catálogo ativo em miniaturas: ${rows.length}`);

const descartes: Record<string, number> = {};
const grupos = new Map<string, ItemDaFila>();

for (const r of rows) {
  const motivo = motivoNaoComparavel(r);
  if (motivo) {
    // Agrupa o motivo sem o valor específico, para o relatório não virar lista.
    const chave = motivo.replace(/"[^"]*"/g, '…');
    descartes[chave] = (descartes[chave] ?? 0) + 1;
    continue;
  }
  const id = identidadeDe(r)!;
  const atual = grupos.get(id.chave);
  const anuncio = {
    id: r.id,
    title: String(r.title),
    precoEmCentavos: Number(r.price_in_cents) || 0,
  };
  if (atual) atual.anuncios.push(anuncio);
  else grupos.set(id.chave, { chave: id.chave, identidade: id, fonte: fonteRecomendada(id), anuncios: [anuncio] });
}

const fila = [...grupos.values()]
  // Peça com mais anúncios nossos primeiro: a referência dela serve mais gente.
  // Empate desempata pelo preço, porque errar caro dói mais.
  .sort((a, b) => b.anuncios.length - a.anuncios.length
    || Math.max(...b.anuncios.map((x) => x.precoEmCentavos)) - Math.max(...a.anuncios.map((x) => x.precoEmCentavos)));

const porFonte: Record<string, number> = {};
for (const f of fila) porFonte[f.fonte] = (porFonte[f.fonte] ?? 0) + 1;

console.log(`\nfora da comparação:`);
for (const [m, n] of Object.entries(descartes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${m}`);
}
console.log(`\npeças distintas na fila: ${fila.length}`);
for (const [f, n] of Object.entries(porFonte)) console.log(`  ${String(n).padStart(4)}  ${f}`);
console.log(`  ${fila.filter((f) => f.anuncios.length > 1).length} peças têm mais de um anúncio nosso`);

const caminho = salvar('fila.json', fila);
console.log(`\nfila gravada em ${caminho}`);
console.log(`próximo passo: npx vite-node scripts/kpv/2-coletar.ts`);

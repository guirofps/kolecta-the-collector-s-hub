// ─── KPV passo 1: montar a fila de trabalho ──────────────────────────────────
//
// Lê o catálogo, descarta o que não é comparável, agrupa anúncios que são a
// mesma peça e diz de qual fonte cada uma deve ser buscada.
//
//   npx vite-node scripts/kpv/1-preparar.ts
//
// Sai um arquivo em scripts/kpv/dados/fila.json, que o passo 2 consome.

import { readFileSync, existsSync } from 'node:fs';
import { consultar, salvar } from './comum';
import { lerDicionario, casarNoDicionario } from '../../src/lib/kpv-dicionario';
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
  /**
   * EAN, quando o dicionário conseguiu identificar a peça. Com ele o coletor
   * VERIFICA em vez de comparar nome, e acerta o produto em 93% dos casos.
   */
  ean?: string;
  sku?: string;
  /** Anúncios nossos que são esta peça. */
  anuncios: { id: string; title: string; precoEmCentavos: number }[];
}

// ── Dicionário de EAN ──
// Exportação de catálogo de loja própria. Vale como identidade, NÃO como preço:
// usar o preço da própria casa como "referência de mercado" seria circular.
const CAMINHO_DICIONARIO = 'C:\\Users\\Guilherme Rojas\\Downloads\\Planilha importacao .csv';
const dicionario = existsSync(CAMINHO_DICIONARIO)
  ? lerDicionario(readFileSync(CAMINHO_DICIONARIO).toString('latin1'))
  : [];
console.log(dicionario.length
  ? `dicionário: ${dicionario.length} produtos, ${dicionario.filter((e) => e.ean).length} com EAN válido`
  : 'dicionário: não encontrado, seguindo só por nome');

// Categorias que o KPV cobre. Diecast é o núcleo; Funko entrou com identidade
// própria (ver kpv-identidade, ramo `marca === 'Funko'`).
const rows = await consultar<AnuncioBanco & { category_slug: string }>(`
  SELECT l.id, l.title, COALESCE(l.description,'') AS description, l.brand, l.line,
         l.scale, l.condition, l.price_in_cents, c.slug AS category_slug
  FROM listings l JOIN categories c ON c.id = l.category_id
  WHERE l.status = 'active'
    AND c.slug IN ('miniaturas-diecast', 'funko-pop')`);

const nFunko = rows.filter((r) => r.category_slug === 'funko-pop').length;
console.log(`catálogo ativo: ${rows.length} (miniaturas ${rows.length - nFunko} + funko ${nFunko})`);

const descartes: Record<string, number> = {};
const grupos = new Map<string, ItemDaFila>();

for (const rBruto of rows) {
  // A categoria funko-pop é a verdade sobre a marca: força 'Funko' para o ramo
  // Funko da identidade pegar mesmo quando o título diz só "POP" (sem "Funko").
  const r =
    rBruto.category_slug === 'funko-pop' ? { ...rBruto, brand: 'Funko' } : rBruto;
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
  if (atual) { atual.anuncios.push(anuncio); continue; }

  const casado = dicionario.length ? casarNoDicionario(anuncio.title, dicionario) : null;
  grupos.set(id.chave, {
    chave: id.chave,
    identidade: id,
    fonte: fonteRecomendada(id),
    ean: casado?.entrada.ean || undefined,
    sku: casado?.entrada.sku || undefined,
    anuncios: [anuncio],
  });
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
const comEan = fila.filter((f) => f.ean).length;
console.log(`  ${comEan} peças com EAN (${Math.round((comEan / fila.length) * 100)}%): casamento verificado, não estimado`);

const caminho = salvar('fila.json', fila);
console.log(`\nfila gravada em ${caminho}`);
console.log(`próximo passo: npx vite-node scripts/kpv/2-coletar.ts`);

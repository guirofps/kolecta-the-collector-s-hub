// ─── KPV passo 3: virar referência publicável ────────────────────────────────
//
//   npx vite-node scripts/kpv/3-consolidar.ts
//
// Aplica as guardas (um preço por vendedor, extremos fora, tamanho mínimo,
// concentração de vendedor) e mostra como cada referência apareceria embaixo
// do anúncio. Não escreve no banco: isso é o passo 4, e sai como SQL para
// revisão.

import { carregar, salvar, brl } from './comum';
import { consolidar, avaliarAnuncio, type ReferenciaKPV } from '../../src/lib/kpv-referencia';
import type { ItemDaFila } from './1-preparar';
import type { Coleta } from './2-coletar';

export interface ReferenciaGravavel {
  chave: string;
  marca: string;
  linha: string | null;
  modelo: string;
  variante: string;
  escala: string | null;
  referencia: ReferenciaKPV;
  casadoCom?: string;
  /** Nossos anúncios desta peça, com a nota de cada um. */
  anuncios: { id: string; title: string; precoEmCentavos: number; nota: string }[];
}

const fila = carregar<ItemDaFila[]>('fila.json');
const coletas = carregar<Coleta[]>('coletas.json');
const porChave = new Map(fila.map((f) => [f.chave, f]));

const publicaveis: ReferenciaGravavel[] = [];
const recusadas: { chave: string; motivo: string }[] = [];

// Junta as coletas de TODAS as fontes da mesma peça antes de consolidar: é o
// que permite a confiança alta, que fonte única nunca alcança.
const amostrasPorChave = new Map<string, Coleta['amostras']>();
for (const c of coletas) {
  const atual = amostrasPorChave.get(c.chave) ?? [];
  atual.push(...c.amostras);
  amostrasPorChave.set(c.chave, atual);
}

for (const [chave, amostras] of amostrasPorChave) {
  const item = porChave.get(chave);
  if (!item) continue;
  const r = consolidar(amostras, { variante: item.identidade.variante });
  if (!r.publicavel) {
    recusadas.push({ chave, motivo: r.motivo });
    continue;
  }
  publicaveis.push({
    chave,
    marca: item.identidade.marca,
    linha: item.identidade.linha,
    modelo: item.identidade.modelo,
    variante: item.identidade.variante,
    escala: item.identidade.escala,
    referencia: r,
    casadoCom: coletas.find((c) => c.chave === chave)?.casadoCom,
    anuncios: item.anuncios.map((a) => ({
      ...a, nota: avaliarAnuncio(a.precoEmCentavos, r).nota,
    })),
  });
}

publicaveis.sort((a, b) => b.referencia.amostra - a.referencia.amostra);

console.log(`peças com coleta : ${amostrasPorChave.size}`);
console.log(`PUBLICÁVEIS      : ${publicaveis.length}`);
console.log(`recusadas        : ${recusadas.length}\n`);

const porConf: Record<string, number> = {};
for (const p of publicaveis) porConf[p.referencia.confianca] = (porConf[p.referencia.confianca] ?? 0) + 1;
console.log(`confiança: ${Object.entries(porConf).map(([k, v]) => `${k}=${v}`).join('  ')}`);

const notas: Record<string, number> = {};
for (const p of publicaveis) for (const a of p.anuncios) notas[a.nota] = (notas[a.nota] ?? 0) + 1;
console.log(`nossos anúncios: ${Object.entries(notas).map(([k, v]) => `${k}=${v}`).join('  ')}`);

console.log(`\n${'─'.repeat(70)}\nCOMO APARECERIA EMBAIXO DO ANÚNCIO (10 melhores amostras)\n`);
for (const p of publicaveis.slice(0, 10)) {
  const r = p.referencia;
  for (const a of p.anuncios.slice(0, 1)) {
    console.log(`┌─ ${a.title.slice(0, 62)}`);
    console.log(`│  anunciado por ${brl(a.precoEmCentavos)}`);
    console.log(`├─ REFERÊNCIA KOLECTA`);
    console.log(`│  Preço de mercado: ${brl(r.medianaEmCentavos)}`);
    console.log(`│  Faixa usual:      ${brl(r.p25EmCentavos)} a ${brl(r.p75EmCentavos)}`);
    console.log(`│  Este anúncio:     ${avaliarAnuncio(a.precoEmCentavos, r).texto}`);
    console.log(`└─ ${r.amostra} vendedores · novo lacrado · confiança ${r.confianca}`);
    if (r.ressalvas.length) console.log(`   ressalva: ${r.ressalvas.join('; ')}`);
    console.log();
  }
}

const motivos: Record<string, number> = {};
for (const r of recusadas) motivos[r.motivo.replace(/\d+/g, 'N')] = (motivos[r.motivo.replace(/\d+/g, 'N')] ?? 0) + 1;
console.log(`${'─'.repeat(70)}\npor que as recusadas não passaram:`);
for (const [m, n] of Object.entries(motivos).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${m}`);
}

const caminho = salvar('referencias.json', publicaveis);
console.log(`\ngravado em ${caminho}`);
console.log(`próximo passo: npx vite-node scripts/kpv/4-subir.ts (gera o SQL para você revisar)`);

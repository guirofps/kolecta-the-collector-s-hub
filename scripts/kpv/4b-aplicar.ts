// ─── KPV passo 4b: aplicar as referências direto no banco ────────────────────
//
//   npx vite-node scripts/kpv/4b-aplicar.ts          (confere e pede confirmação)
//   npx vite-node scripts/kpv/4b-aplicar.ts --agora   (aplica de fato)
//
// O passo 4 gera um .sql para colar no console do Turso. Quando o arquivo fica
// grande demais para o console, este passo grava direto pela API do Turso, em
// lote e de forma idempotente:
//
//  - json_patch grava os campos kpv* sem tocar no resto de `attributes` (marca,
//    escala, pré-venda). Rodar de novo só atualiza, então repetir é seguro.
//  - Anúncio que TINHA selo e não tem mais referência (peça reprovada, ex.: um
//    conjunto que a trava barrou) é LIMPO com json_remove, senão ficaria um
//    selo órfão no ar.
//
// Escrita mora aqui, não em comum.ts: lá `consultar` continua só-leitura de
// propósito, para o resto da esteira não escrever no banco por acidente.

import { lerEnv, carregar, consultar, brl, RAIZ } from './comum';
import { gravarKpv } from '../../src/lib/kpv-anuncio';
import type { ReferenciaGravavel } from './3-consolidar';

const ENV_BACKEND = 'C:\\Users\\Guilherme Rojas\\Desktop\\kolecta-backend\\.env';
const CAMPOS_KPV = [
  'kpvMedianaEmCentavos', 'kpvP25EmCentavos', 'kpvP75EmCentavos', 'kpvAmostra',
  'kpvConfianca', 'kpvFontes', 'kpvApuradoEm', 'kpvRessalvas',
];

type Arg = { type: 'text'; value: string };
const txt = (v: string): Arg => ({ type: 'text', value: v });

/** Executa statements de escrita em lote, num único pipeline. */
async function escrever(stmts: { sql: string; args: Arg[] }[]): Promise<void> {
  const env = lerEnv(ENV_BACKEND);
  const url = env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '') + '/v2/pipeline';
  const requests = [...stmts.map((s) => ({ type: 'execute', stmt: { sql: s.sql, args: s.args } })), { type: 'close' }];
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TURSO_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  const d: any = await r.json();
  const erro = (d.results ?? []).find((s: any) => s?.type === 'error');
  if (erro) throw new Error(JSON.stringify(erro.error).slice(0, 300));
}

// ── Monta os patches ──
const referencias = carregar<ReferenciaGravavel[]>('referencias.json');
const apuradoEm = new Date().toISOString();
const patches: { id: string; json: string }[] = [];
for (const r of referencias) {
  const bloco = JSON.stringify(gravarKpv(r.referencia, apuradoEm));
  for (const a of r.anuncios) patches.push({ id: a.id, json: bloco });
}
const idsComReferencia = new Set(patches.map((p) => p.id));

// ── Descobre selos órfãos: tem kpv no banco, mas não está mais nas referências ──
const badgeados = await consultar<{ id: string }>(
  `SELECT id FROM listings WHERE attributes LIKE '%kpvApuradoEm%'`,
);
const orfaos = badgeados.map((b) => b.id).filter((id) => !idsComReferencia.has(id));

console.log(`referências        : ${referencias.length} peças`);
console.log(`anúncios com selo  : ${patches.length}`);
console.log(`selos a limpar     : ${orfaos.length}`);
console.log(`\namostra:`);
for (const r of referencias.slice(0, 4)) {
  console.log(`  ${r.marca} ${r.modelo.slice(0, 36)} · ${brl(r.referencia.medianaEmCentavos)} · ${r.referencia.amostra} vend · ${r.referencia.confianca}`);
}

if (!process.argv.includes('--agora')) {
  console.log(`\nnada gravado. Rode com --agora para aplicar.`);
  process.exit(0);
}

// ── Aplica, em lotes de 100 para não estourar o payload ──
const patch = `UPDATE listings SET attributes = json_patch(`
  + `CASE WHEN json_valid(COALESCE(attributes,'')) THEN attributes ELSE '{}' END, ?2) WHERE id = ?1`;

let feitos = 0;
for (let i = 0; i < patches.length; i += 100) {
  const lote = patches.slice(i, i + 100);
  await escrever(lote.map((p) => ({ sql: patch, args: [txt(p.id), txt(p.json)] })));
  feitos += lote.length;
  console.log(`  gravados ${feitos}/${patches.length}`);
}

if (orfaos.length) {
  const remove = `UPDATE listings SET attributes = json_remove(attributes, `
    + CAMPOS_KPV.map((c) => `'$.${c}'`).join(', ') + `) WHERE id = ?1`;
  for (let i = 0; i < orfaos.length; i += 100) {
    const lote = orfaos.slice(i, i + 100);
    await escrever(lote.map((id) => ({ sql: remove, args: [txt(id)] })));
  }
  console.log(`  limpos ${orfaos.length} selos órfãos`);
}

console.log(`\npronto. Selo no ar reflete ${referencias.length} peças.`);
void RAIZ;

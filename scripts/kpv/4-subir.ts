// ─── KPV passo 4: gerar o SQL que grava as referências ───────────────────────
//
//   npx vite-node scripts/kpv/4-subir.ts
//
// NÃO escreve no banco. Gera um arquivo .sql na Área de Trabalho para você
// conferir e rodar no console do Turso. Referência de preço errada se corrige;
// UPDATE errado em centenas de anúncios, nem sempre.
//
// A referência entra em `attributes`, o JSON que o anúncio já tem e que a API
// já devolve, com `json_patch` para não apagar o que já estava lá (marca,
// escala, pré-venda).

import { writeFileSync } from 'node:fs';
import { carregar, brl } from './comum';
import { gravarKpv } from '../../src/lib/kpv-anuncio';
import type { ReferenciaGravavel } from './3-consolidar';

const SAIDA = 'C:\\Users\\Guilherme Rojas\\Desktop\\kolecta-KPV-referencias.sql';

const referencias = carregar<ReferenciaGravavel[]>('referencias.json');
const apuradoEm = new Date().toISOString();

// Um comando por anúncio seria centenas de comandos, e o console do Turso roda
// um de cada vez. Um CASE só resolve tudo numa colada.
const patches: { id: string; json: string }[] = [];
for (const r of referencias) {
  const bloco = gravarKpv(r.referencia, apuradoEm);
  for (const a of r.anuncios) {
    patches.push({ id: a.id, json: JSON.stringify(bloco) });
  }
}

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const linhas: string[] = [
  '-- ============================================================',
  '-- KOLECTA — referências de preço (KPV)',
  `-- Gerado em ${apuradoEm}`,
  '--',
  `-- ${referencias.length} peças, ${patches.length} anúncios recebem referência.`,
  '--',
  '-- Grava em `attributes` com json_patch: NÃO apaga marca, escala nem',
  '-- pré-venda que já estavam lá. Rodar de novo em cima do mesmo anúncio',
  '-- apenas atualiza os campos kpv*, então é seguro repetir.',
  '-- ============================================================',
  '',
  'UPDATE listings SET attributes = json_patch(',
  "  CASE WHEN json_valid(COALESCE(attributes,'')) THEN attributes ELSE '{}' END,",
  '  CASE',
];
for (const p of patches) {
  linhas.push(`    WHEN id = ${q(p.id)} THEN ${q(p.json)}`);
}
linhas.push("    ELSE '{}'");
linhas.push('  END');
linhas.push(')');
linhas.push(`WHERE id IN (${patches.map((p) => q(p.id)).join(', ')});`);

writeFileSync(SAIDA, linhas.join('\n') + '\n', 'utf8');

console.log(`peças com referência : ${referencias.length}`);
console.log(`anúncios beneficiados: ${patches.length}`);

const porConf: Record<string, number> = {};
for (const r of referencias) porConf[r.referencia.confianca] = (porConf[r.referencia.confianca] ?? 0) + 1;
console.log(`confiança            : ${Object.entries(porConf).map(([k, v]) => `${k}=${v}`).join('  ')}`);

console.log(`\namostra do que vai ser gravado:`);
for (const r of referencias.slice(0, 5)) {
  console.log(`  ${r.marca} ${r.modelo.slice(0, 38)}`);
  console.log(`     ${brl(r.referencia.medianaEmCentavos)} (faixa ${brl(r.referencia.p25EmCentavos)} a ${brl(r.referencia.p75EmCentavos)}) · ${r.referencia.amostra} vendedores`);
}

console.log(`\nSQL em ${SAIDA}`);
console.log('Confira e rode no console do Turso.');

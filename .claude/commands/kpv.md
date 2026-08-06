---
description: Roda a esteira de referência de preço de mercado (KPV) do catálogo Kolecta
---

Rode a esteira de referência de preço de mercado (KPV) para atualizar o selo "Levantamento Kolecta" do catálogo.

## Regras (obrigatórias)
- A esteira vive em `scripts/kpv/` e roda com `npx vite-node scripts/kpv/<arquivo>.ts` (NUNCA `node` — os scripts reusam as libs testadas de `src/lib`).
- Credenciais em `.env.kpv` (gitignored): Mercado Livre e eBay.
- SEMPRE em LOTE. Nunca rode o catálogo inteiro de uma vez: rode um lote, CONFIRA os casamentos que o script imprime, corrija, e só então siga. É o que pega erro cedo e poupa token/quota de API.
- Nunca misturar variante (chase / Treasure Hunt / exclusivo de evento) com regular, nem escalas, condições ou edições diferentes. O preço é SEMPRE de novo lacrado.
- Na vitrine o selo nunca cita concorrente: o texto diz "com base em N vendedores no mercado".

## Passos
1. `npx vite-node scripts/kpv/1-preparar.ts` — lê o catálogo, agrupa por peça, roteia a fonte, casa com o dicionário de EAN.
2. `npx vite-node scripts/kpv/2-coletar.ts` — Mercado Livre (catálogo de produto, incremental; `--refazer` força tudo).
3. `npx vite-node scripts/kpv/2b-coletar-ebay.ts 30 --sem-preco --todas` — eBay em lote de 30 (chase/exclusivo + o que sobrou sem preço). Confira os casamentos impressos.
4. `npx vite-node scripts/kpv/3-consolidar.ts` — aplica as guardas (um preço por vendedor, extremos fora, mínimo de 3 vendedores, concentração) e mostra como cada referência apareceria no card.
5. `npx vite-node scripts/kpv/4b-aplicar.ts` (dry-run) e depois `npx vite-node scripts/kpv/4b-aplicar.ts --agora` — grava as referências direto no banco (idempotente, em lote, limpa selo órfão).

## Antes de começar
Me pergunte qual é o objetivo desta rodada e siga em lote, conferindo comigo:
- atualizar tudo,
- só as peças ainda sem preço (`--sem-preco`),
- ou uma fonte específica.

$ARGUMENTS

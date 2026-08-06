# KPV — esteira de referência de preço de mercado

Gera o selo "Levantamento Kolecta" (preço de mercado) que aparece embaixo dos
anúncios de miniatura. Busca preço em fontes externas (Mercado Livre, eBay, e a
planilha Artminis), casa peça por peça pela identidade (marca, modelo, escala,
variante, condição) e grava a referência em `attributes` do anúncio.

## Como rodar

No Claude Code, digite **`/kpv`** — o comando conduz a esteira em lote e confere
os casamentos com você. Ou rode à mão, sempre com `npx vite-node` (nunca `node`):

```bash
npx vite-node scripts/kpv/1-preparar.ts                        # agrupa por peça, roteia fonte
npx vite-node scripts/kpv/2-coletar.ts                         # Mercado Livre (incremental)
npx vite-node scripts/kpv/2b-coletar-ebay.ts 30 --sem-preco --todas   # eBay, lote de 30
npx vite-node scripts/kpv/3-consolidar.ts                      # aplica guardas, mostra o card
npx vite-node scripts/kpv/4b-aplicar.ts                        # dry-run
npx vite-node scripts/kpv/4b-aplicar.ts --agora                # grava no banco (idempotente)
```

## Regras que não se quebram

- **Sempre em lote.** Rode um pedaço, confira os casamentos que o script imprime,
  corrija, siga. Rodar tudo de uma vez custa token e quota de API pra descobrir
  erro só no fim.
- **Nunca misturar** variante (chase / Treasure Hunt / exclusivo de evento) com
  regular, nem escalas, condições ou edições diferentes. Preço é sempre de novo
  lacrado.
- **A vitrine nunca cita concorrente.** O selo diz "com base em N vendedores no
  mercado, em mais de uma plataforma".

## Credenciais

`.env.kpv` na raiz (gitignored): `ML_APP_ID`, `ML_SECRET`, `EBAY_APP_ID`,
`EBAY_SECRET`. Não é commitado — se trocar de máquina, recriar pelos painéis de
desenvolvedor do Mercado Livre e do eBay. O acesso ao banco vem do `.env` do
backend (Turso), lido por `comum.ts`.

## Arquivos

| arquivo | o que faz |
|---|---|
| `comum.ts` | infra: leitura de credencial, banco (só leitura), clientes ML/eBay, câmbio |
| `1-preparar.ts` | lê catálogo, agrupa por peça, roteia fonte, casa EAN |
| `2-coletar.ts` | Mercado Livre |
| `2b-coletar-ebay.ts` | eBay (`--sem-preco`, `--todas`, número = tamanho do lote) |
| `2c-coletar-lojas.ts` | lojas nuvemshop/loja-integrada |
| `2d-coletar-artminis.ts` | planilha Artminis (fonte de preço, nunca vendedora no site) |
| `3-consolidar.ts` | aplica guardas, mostra o card |
| `4-subir.ts` | gera SQL para colar no Turso |
| `4b-aplicar.ts` | grava direto no banco (`--agora`), idempotente, limpa selo órfão |

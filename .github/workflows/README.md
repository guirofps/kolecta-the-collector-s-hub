# CI/CD — o que falta fazer no painel

O `ci.yml` roda sozinho a partir do primeiro push: `build` (que inclui
`tsc --noEmit`) e os 879 testes, em toda branch e todo PR. Isso ja vale por si —
codigo que nao compila ou quebra teste aparece vermelho antes do merge.

O **deploy gateado** precisa de configuracao manual. Enquanto ela nao acontecer,
o passo de deploy so avisa que o segredo nao existe e nao falha a rodada.

## 1. Criar o Deploy Hook na Vercel

1. Vercel → projeto → **Settings** → **Git** → **Deploy Hooks**
2. Criar um hook para a branch `main` e copiar a URL

A URL e um segredo: quem tiver ela dispara deploy na sua producao.

## 2. Guardar como segredo no GitHub

1. GitHub → repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Nome: `VERCEL_DEPLOY_HOOK_URL`
4. Valor: a URL do passo 1

## 3. Impedir que a Vercel deploye sozinha

Este e o passo que faz o gate valer, e e o mais chato dos dois lados.

Hoje a Vercel escuta o push do GitHub e sobe direto, sem olhar teste nenhum.
Enquanto isso continuar, o workflow dispara um deploy e a Vercel dispara outro
em paralelo — inclusive quando o CI esta vermelho.

Duas formas de resolver, e **nao consegui verificar daqui qual se comporta
melhor com Deploy Hook** — vale testar antes de confiar:

- **Ignored Build Step** (Settings → Git): um comando que sai com codigo 0 faz a
  Vercel pular o build. Serve para barrar o gatilho automatico mantendo o
  projeto conectado ao Git.
- **`git.deploymentEnabled`** no `vercel.json`: desliga o deploy automatico por
  branch. Confirme que o Deploy Hook continua funcionando com ela desligada
  antes de adotar — se nao continuar, a `main` fica sem deploy nenhum.

Se preferir nao mexer nisso agora, o CI sozinho ja resolve a maior parte: voce
enxerga o vermelho no PR. O que fica sem rede e o push direto na `main`.

## O que NAO esta no gate

`npm run lint` esta fora: 118 problemas acumulados hoje (110 erros). CI que vive
vermelho ensina todo mundo a ignorar o sinal. Quando a divida for paga, e so
acrescentar o passo no job `test`.

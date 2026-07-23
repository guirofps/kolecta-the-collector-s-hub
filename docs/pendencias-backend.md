# Pendências do backend

Documento único do que depende do backend para a Kolecta lançar em 25/07.

Levantado a partir de uma varredura no painel admin, no fluxo de anúncio e no
programa de Fundadores, cruzando o front com os dados reais do banco.

**Como ler:** cada item diz o que acontece hoje, por que é problema e o que
precisa mudar. O front já está pronto e esperando em quase todos: onde o dado
começar a chegar, a tela mostra sozinha, sem trabalho novo no front.

O fluxo de e-mails transacionais está em `docs/emails-transacionais.md` e já foi
enviado antes. Não repito aqui, mas ele continua valendo.

---

## 1. Bloqueia o lançamento

### 1.1. O selo de Fundador está sendo concedido sozinho

**Hoje:** o backend atribui número de Fundador ao avaliar a qualificação na
leitura de `GET /api/founder/me`. Quem cumpriu os 5 anúncios virou Fundador
automaticamente, com número e selo público.

**Por que é grave:** a seleção dos 100 Fundadores é **curada pela equipe** e o
resultado só sai em 25/07. Havia perfis em produção marcados como Fundador sem
ninguém ter escolhido. Se ninguém mexer, no dia 25 os selos que aparecerem serão
os que o sistema distribuiu sozinho, não os que a equipe escolheu.

**O que muda:**
1. Parar de conceder na leitura. Separar `candidato` (cumpriu os 5 anúncios) de
   `fundador` (escolhido pela equipe).
2. A concessão vira uma ação explícita do admin, com o número definido por nós.
3. Limpar ou revisar os números já atribuídos antes da virada.

**No front:** já travado. Nenhum selo aparece antes de 25/07, e os créditos de
destaque também estão segurados. A trava está em `useIsFounderActive`, fonte
única. Isso esconde o sintoma; a raiz é no backend.

### 1.2. Existem dois status de "aguardando aprovação"

**Hoje:** o banco tem `pending_review` (358 anúncios) e `draft` (251). O painel
do vendedor conta `pending_review` como "em análise". A fila do admin buscava só
`draft`.

**Por que é grave:** 358 anúncios eram invisíveis para a moderação. O vendedor
via "aguardando aprovação" e o anúncio nunca chegava para ser aprovado.

**O que muda:** definir o que cada status significa e, de preferência, unificar.
- Se `draft` for anúncio salvo e **não enviado** pelo vendedor, ele não deveria
  entrar na fila de aprovação, e os 251 precisam sair de lá.
- Se `draft` for vocabulário antigo, migrar tudo para `pending_review`.

**Isso muda o que a equipe aprova no dia 25**, por isso é urgente.

**No front:** a fila já busca os dois e mostra a quebra ("358 em análise, 251 em
rascunho"). É um remendo até a definição vir.

### 1.3. O backend não valida o anúncio

**Hoje:** as regras (mínimo de 3 fotos, campos obrigatórios por categoria,
título e descrição mínimos, preço maior que zero) existem só no navegador.

**Por que é grave:** anúncio criado antes das travas, ou enviado direto pela API,
entra incompleto. Existem anúncios publicados com 2 fotos, sem marca e sem dados
de frete. Frete sem peso e dimensão sai errado e alguém perde dinheiro.

**O que muda:** replicar as validações no backend, na criação e na edição.

Regras atuais (fonte: `src/lib/category-fields.ts` e o wizard):

| Regra | Valor |
|---|---|
| Título | mínimo 10 caracteres |
| Descrição | mínimo 30 caracteres |
| Fotos | mínimo 3, máximo 8 |
| Preço / lance inicial | maior que zero |
| Preço de reserva | não pode ser menor que o lance inicial |

Campos obrigatórios por categoria:

| Categoria | Obrigatórios |
|---|---|
| Miniaturas | marca, escala |
| Cards | jogo/universo |
| Action Figures | marca, linha, personagem |
| Funko Pop | número do Pop, linha |
| Mangás e HQs | título da obra |

---

## 2. Importante, não bloqueia

### 2.1. O motivo da reprovação não é gravado

**Hoje:** `PATCH /api/admin/listings/:id/status` passou a receber também `reason`
quando o status é `rejected`. É o motivo escolhido pelo admin mais a observação
livre. O backend ignora.

**Por que importa:** sem isso o vendedor nunca sabe o que corrigir, e o e-mail
`anuncioRejeitado` chega sem motivo, que é a parte útil dele.

**O que muda:** persistir o campo e devolvê-lo na leitura do anúncio.

### 2.2. A config do leilão não vem na fila de moderação

**Hoje:** `GET /api/admin/listings` devolve o `Listing`, que não tem nenhum campo
de leilão. Eles vivem na tabela `auctions`.

**Por que importa:** o admin aprova um leilão sem ver lance inicial, incremento
mínimo, preço de reserva nem duração, que é exatamente o que precisa ser
conferido antes de publicar.

**O que muda:** incluir no anúncio quando `type = 'auction'`:

| Campo esperado | Origem |
|---|---|
| `startingBidInCents` | `auctions.starting_bid_in_cents` |
| `minIncrementInCents` | `auctions.min_increment_in_cents` |
| `reservePriceInCents` | `auctions.reserve_price_in_cents` |
| `durationHours` | `auctions.duration_hours` |
| `antiSniper` | `auctions.anti_sniper` |
| `endsAt` | `auctions.ends_at` |

**No front:** já preparado. Chegando os campos, a tela mostra tudo sozinha.
Enquanto não chegam, exibe aviso vermelho em vez de fingir que está completo.

### 2.3. Confirmar se `attributes` vem na fila de moderação

**Hoje:** o wizard grava os campos por categoria (jogo, raridade, personagem,
número do Pop, etc.) na coluna `attributes`, em JSON. A moderação agora lê essa
coluna para mostrar os campos certos de cada categoria.

**O que muda:** confirmar que `GET /api/admin/listings` devolve `attributes`. Se
não devolver, a moderação mostra "faltando" em campo que na verdade foi
preenchido.

### 2.4. Não existe registro de quem moderou

**Hoje:** a tabela de anúncios não tem nenhum campo de auditoria. Não há como
saber quem aprovou ou reprovou um anúncio, nem quando.

**Por que importa:** já apareceram anúncios aprovados sem ninguém da equipe ter
aprovado, e não há como investigar.

**O que muda:** gravar em toda mudança de status quem fez e quando
(`moderated_by`, `moderated_at`), e devolver isso no admin.

### 2.5. Variáveis do Resend vão no Render

**Hoje:** o backend roda no Render (`kolecta-backend.onrender.com`). As variáveis
do Resend podem ter sido colocadas na Vercel.

**O que muda:** `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_RESPOSTA` precisam
estar no serviço do Render. A Vercel só serve o frontend, que não manda e-mail.
E nunca com prefixo `VITE_`: isso publica a chave no JavaScript do site.

---

## 3. Perguntas abertas

Precisam de resposta antes de virar tarefa.

### 3.1. Por que 663 anúncios no banco e só 192 com dono conhecido?

O banco tem 663 anúncios. Uma consulta agrupando por usuário cadastrado soma
192. Sobram cerca de 470 sem explicação.

Uma pista: a linha de exemplo do banco tem `seller_id = "seller-001"`, que é uma
conta semente de teste.

**Perguntas:** esses ~470 são de contas semente ou de importação em lote? Existe
anúncio com `seller_id` que não corresponde a nenhum usuário? O `seller_id`
aponta para `users.id` ou para uma tabela de perfil de vendedor?

Consulta que responde:

```sql
SELECT CASE WHEN u.id IS NULL THEN 'sem dono real' ELSE 'com dono real' END AS tipo,
       COUNT(*) AS qtd
FROM listings l LEFT JOIN users u ON u.id = l.seller_id
GROUP BY tipo;
```

**Por que importa:** a lista de candidatos a Fundador foi montada com a contagem
por usuário. Se ela estiver subcontando, tem gente que qualificava e não foi
contatada.

### 3.2. Quem aprovou os anúncios que já estão ativos?

Existem 51 anúncios `active`. A equipe não aprovou. Foi teste, ou existe algum
caminho aprovando sozinho? (ver 2.4, que hoje impede investigar)

### 3.3. O KPI "Anúncios" do painel deve contar o quê?

`/api/admin/stats` devolve 663, que é o total de linhas da tabela. A conta está
certa, mas inclui semente, teste e rascunho nunca enviado. Faz sentido o painel
mostrar isso, ou deveria contar só anúncio real?

---

## 4. Higiene do repositório

- **`.env` e `.env.production` estão versionados.** Hoje só têm variáveis `VITE_*`
  (públicas por natureza) e chave `pk_test`, então não há vazamento. O risco é
  futuro: no dia em que alguém colocar ali uma chave que não seja `VITE_`, ela vai
  para o GitHub sozinha. Vale tirar do versionamento.
- **Erro de lint antigo** em `src/lib/api.ts:37` (`no-explicit-any`), que faz
  `npm run lint` falhar. Não foi mexido para não conflitar.

---

## 5. O que já está pronto no front esperando conexão

Nada aqui precisa de trabalho novo no front. É só o dado começar a chegar.

| O que | Espera do backend |
|---|---|
| 12 e-mails transacionais (`emails/`) | copiar a pasta, `npm install resend`, chamar `enviarEmail()` nos gatilhos |
| Ficha completa do anúncio na moderação | `attributes` e campos de leilão no `GET /api/admin/listings` |
| Motivo da reprovação | persistir `reason` no `PATCH .../status` |
| Selo de Fundador | separar candidato de fundador escolhido |
| Preferências de notificação do vendedor | a tela já salva; falta o envio respeitar (está no kit) |

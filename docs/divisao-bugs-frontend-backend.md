# Divisão de trabalho: bugs mapeados na varredura de 21/07

> ## ✅ Status de resolução — 22/07/2026
>
> **Todos os 42 pontos foram atacados.** Trabalho em duas branches:
> - Frontend: `fix/varredura-42-bugs` — F1–F34 resolvidos.
> - Backend: `feat/varredura-backend-deps` — B1–B5 + dependências de D.
>
> **Frontend (F1–F34):** todos resolvidos. Notas: F8 (paridade do editar) — o
> editar de leilão deixou de gravar no campo errado e remete ao gerenciador de
> leilões (paridade total de campos de leilão/categoria fica como feature futura).
>
> **Backend (B1–B5):** B1 — coluna `attributes` (JSON) em `listings` + DTO/serviço
> (migração aplicada via `drizzle-kit push`). B5 — `antiSniper` aceito na criação.
> B2/B3/B4 — telas cenográficas (cartões, verificação, métricas do vendedor)
> removidas/tornadas honestas (decisão D8). F26 — `seller/mine` passou a devolver
> `totalBids` e `winnerName`.
>
> **Decisões (D1–D8):** D1 quantidade travada em 1 no carrinho · D2 saque R$50
> alinhado · D3 formato JSON em `attributes` · D4 aba "Aguardando pagamento"
> removida · D5 desfecho de leilão por heurística real · D6 mantida paginação
> no cliente (server-side re-quebraria abas multi-status) · D7 regra do 1º lance
> mantida · D8 telas cenográficas escondidas até existirem de verdade.
>
> Validação: backend build ✅ · frontend build ✅ · 80/80 testes ✅.

---

Varredura completa de UX feita em 21/07/2026 sobre a `main` (já incluindo o push
do PIX/Pagar.me). Foram 42 problemas confirmados por leitura de código, com
arquivo e linha. Este documento divide a responsabilidade:

- **Frontend (Guilherme + Claude):** corrige neste repositório.
- **Backend (Daniel):** precisa de API/servidor.
- **Decisão conjunta:** a correção depende de escolher um caminho antes.

## Regra de ouro do período (vale para todo mundo)

O site segue FECHADO até 25/07. O público só pode: se cadastrar, fazer login,
acessar `/conta` e `/painel` (criar anúncios) e ver páginas institucionais.
O `LaunchGate` é fail-closed (rota nova nasce bloqueada). Ninguém adiciona
rota ao `OPEN_PREFIXES` sem combinar antes, e os testes do gate
(`src/test/LaunchGate.test.tsx`) precisam passar em todo push.

Legenda de urgência:
- **AGORA** = página aberta no pré-lançamento; o bug atinge os fundadores hoje.
- **DIA 25** = página bloqueada pelo gate; o bug detona no lançamento se ficar.

---

## 1. Frontend (Guilherme + Claude)

### Criação e edição de anúncio (todos AGORA, é o fluxo dos fundadores)

| # | Problema | Onde | Gravidade |
|---|---|---|---|
| F1 | Preço com centavos multiplicado até 100x: `toCents` trata "10.5" como "105" (input `type=number` entrega ponto decimal, o parser assume formato BR) | `CreateListing.tsx` (toCents) | CRÍTICA |
| F2 | `brand/line/scale/year/edition` são enviados sempre vazios; a UI grava em `categoryFields.*` e ninguém copia para o topo do payload | `CreateListing.tsx` (handleSubmit) | ALTA |
| F3 | Incremento mínimo do leilão coletado e exibido, mas nunca enviado (o payload da API já tem `minIncrementInCents`) | `CreateListing.tsx` | ALTA |
| F4 | Validação aceita preço/lance 0 ou negativo | `CreateListing.tsx` passo 4 | MÉDIA |
| F5 | Sem aviso quando preço de reserva é menor que o lance inicial | `CreateListing.tsx` | MÉDIA |
| F6 | Clique em "Enviar para Aprovação" durante o loading do endereço não faz nada e não avisa | `CreateListing.tsx` | BAIXA |
| F7 | Editar leilão: "Lance inicial" carrega vazio (lê `priceInCents`, que é null em leilão) e salva no campo errado | `EditListing.tsx` | ALTA |
| F8 | Editar não tem paridade com criar: sem campos de leilão (duração/reserva/incremento) e sem campos por categoria | `EditListing.tsx` | MÉDIA |

### Área do comprador

| # | Problema | Onde | Gravidade | Quando |
|---|---|---|---|---|
| F9 | Aba "Em andamento" filtra pelo status `active`, que não existe; sempre vazia | `account/Orders.tsx` | ALTA | AGORA |
| F10 | Paginação quebrada: quem tem mais de 10 pedidos nunca vê o 11º | `account/Orders.tsx` | ALTA | AGORA |
| F11 | Status `completed` sem tradução (aparece em inglês) e fora da aba "Entregues" | `account/Orders.tsx` | MÉDIA | AGORA |
| F12 | Botões "Avaliar compra" e "Confirmar recebimento" sem ação (a API de confirmar entrega existe) | `account/Orders.tsx` | MÉDIA | DIA 25 |
| F13 | "Ver anúncio" nas mensagens leva a rota inexistente `/anuncio/` (o certo é `/produto/`) | `account/Messages.tsx` | ALTA | AGORA |
| F14 | Favoritos mostram condição crua ("novo-lacrado" em vez de "Novo na embalagem") | `account/Favorites.tsx` | MÉDIA | AGORA |
| F15 | Botão de carrinho nos favoritos sem ação | `account/Favorites.tsx` | MÉDIA | DIA 25 |
| F16 | Botão copiar código de rastreio sem ação | `account/OrderDetail.tsx` | BAIXA | DIA 25 |
| F17 | Pós-compra: "Rastrear Meus Pedidos" leva ao painel do VENDEDOR (`/painel/pedidos`) em vez de `/conta/pedidos` | `OrderConfirmation.tsx` | ALTA | DIA 25 |
| F18 | Status cru na confirmação ("paid", "processing") | `OrderConfirmation.tsx` | MÉDIA | DIA 25 |
| F19 | Carrinho esvazia ao atualizar a página (sem persistência local) | `CartContext.tsx` | MÉDIA | DIA 25 |

### Painel do vendedor e páginas públicas

| # | Problema | Onde | Gravidade | Quando |
|---|---|---|---|---|
| F20 | Pedido NÃO PAGO aparece como "Pagamento confirmado" com botões de etiqueta/envio liberados (risco de despachar sem receber) | `seller/OrderDetail.tsx` | CRÍTICA | AGORA |
| F21 | Texto do saque diz mínimo R$ 20, validação exige R$ 50 (ver decisão D2) | `seller/Financial.tsx` | ALTA | AGORA |
| F22 | "Ver Anúncio" nas mensagens do vendedor leva a `/anuncio/` (404) | `seller/Messages.tsx` | MÉDIA | AGORA |
| F23 | Filtro "Com Disputa" das mensagens sempre vazio (condição ignora o filtro) | `seller/Messages.tsx` | BAIXA | AGORA |
| F24 | Filtro "Período" dos pedidos não faz nada (estado nunca usado) | `seller/Orders.tsx` | MÉDIA | AGORA |
| F25 | Todo leilão encerrado vira "Vendido", inclusive cancelado ou sem lances (ver decisão D5) | `seller/AuctionManager.tsx` | ALTA | AGORA |
| F26 | Leilões sempre com "0 lances" e vencedor exibido como código de usuário (a API de lances por leilão existe) | `seller/AuctionManager.tsx` | MÉDIA | AGORA |
| F27 | Busca: filtro de categoria compara slug com id, nunca bate, resultado sempre vazio | `Search.tsx` | ALTA | DIA 25 |
| F28 | Busca: ordenar por "Terminando em breve" esvazia a lista; "Mais lances" não faz nada | `Search.tsx` | MÉDIA | DIA 25 |
| F29 | Página de categoria faz busca de TEXTO pelo slug em vez de filtrar por categoria | `CategoryPage.tsx` | ALTA | DIA 25 |
| F30 | Busca e categoria: todo item mostra selo "vendedor verificado" e nota 5 fixos no código | `Search.tsx`, `CategoryPage.tsx`, `ProductCard.tsx` | ALTA | DIA 25 |
| F31 | Chat iniciado no produto redireciona para `/account/messages` (404; o certo é `/conta/mensagens`) | `ProductDetail.tsx` | ALTA | DIA 25 |
| F32 | Perfil público do vendedor: parse de imagem sem proteção pode derrubar a página; card aponta para `/vendedor/undefined` | `SellerProfile.tsx` | ALTA | DIA 25 |
| F33 | Taxa antiga na home ("Apenas 12%") e na Ajuda ("entre 10% e 14%"); o oficial é 11% (`lib/fees.ts`) | `Index.tsx`, `Help.tsx` | MÉDIA | Ajuda: AGORA. Home: DIA 25 |
| F34 | Confirmação mostra "Pagamento Aprovado!" para qualquer status não pendente, inclusive falha (o caso PIX pendente já foi tratado pelo Daniel) | `OrderConfirmation.tsx` | BAIXA | DIA 25 |

## 2. Backend (Daniel)

| # | Problema | O que precisa no servidor |
|---|---|---|
| B1 | Campos por categoria (marca, escala, raridade, grading, etc.) são descartados no envio: hoje NÃO existe onde salvá-los | Aceitar e armazenar os campos por categoria no anúncio (sugestão: coluna JSON). Depois disso o frontend passa a enviá-los (par do F2) |
| B2 | Página de cartões do comprador é cenográfica (cartões falsos locais) | Cofre de cartões real (Stripe) ou confirmar a decisão D8 de esconder a tela |
| B3 | Página de verificação de identidade é cenográfica | Fluxo real de verificação ou decisão D8 |
| B4 | Perfil do vendedor exibe "1-2 dias de envio" e "98% resposta" fixos | Endpoint com métricas reais ou decisão D8 |
| B5 | Anti-sniper: o toggle do wizard não tem campo aceito no payload de criação | Confirmar se a API aceita `antiSniper` na criação; se aceitar, o frontend passa a enviar; se não, aceitar ou remover o toggle |

## 3. Decisões conjuntas (bater o martelo antes de corrigir)

| # | Decisão | Opções |
|---|---|---|
| D1 | Quantidade no checkout: o carrinho deixa aumentar e mostra total multiplicado, mas o pedido é criado com 1 unidade (o código diz "MVP: 1 item por seller") | (a) Frontend trava quantidade em 1 até o pós-lançamento, ou (b) backend passa a aceitar quantidade |
| D2 | Saque mínimo: tela diz R$ 20, validação diz R$ 50. Qual é a regra real do servidor? | Daniel responde o valor; frontend alinha os dois textos |
| D3 | Formato de armazenamento dos campos por categoria (par do B1) e prazo | Definir formato e data; frontend prepara o envio em cima |
| D4 | Aba "Aguardando pagamento" do painel de leilões nunca enche (o servidor não tem esse status) | (a) Backend cria o status, ou (b) frontend remove a aba |
| D5 | Leilão cancelado/sem venda: qual status o servidor devolve para o frontend rotular certo em vez de "Vendido"? | Daniel confirma os status reais de encerramento |
| D6 | Paginação de pedidos: a API devolve o total de registros? | Se sim, frontend usa; se não, backend adiciona o total na resposta |
| D7 | Primeiro lance precisa superar o lance inicial + incremento (o valor anunciado nunca é dado). É intencional? | Confirmar regra de leilão no backend |
| D8 | Cartões, verificação e métricas do vendedor: construir de verdade agora ou esconder as telas até existir? | Esconder é rápido (frontend) e honesto; construir é backend |

## Ordem sugerida (frontend)

1. F1 (preço inflado) e F20 (envio sem pagamento): os dois críticos.
2. Demais itens AGORA do wizard e do painel (F2-F8, F9-F14, F21-F26, F33-Ajuda).
3. Itens DIA 25 (busca, categoria, produto, carrinho, confirmação), para o
   lançamento abrir com o passeio básico redondo.
4. Congelado até sincronizar com o Daniel: `Checkout.tsx` e
   `OrderConfirmation.tsx` (arquivos do push do PIX). Itens F17, F18, F34 e D1
   só depois desse alinhamento.

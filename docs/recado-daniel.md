# Para o Daniel

O que o front já espera e o backend ainda não entrega. Ordenado por urgência.

O documento completo das pendências está em `docs/pendencias-backend.md`. Este
aqui é o resumo do que mudou nas últimas horas e precisa de você.

---

## 1. Campo novo: SKU no anúncio

**Pedido dos lojistas.** É o código interno de estoque deles, para casar a venda
na Kolecta com o controle que já usam.

Já está no front: aparece na criação, na edição, na lista de anúncios do
vendedor, na moderação e na planilha de importação.

**O que precisa no backend:**

- Coluna `sku` em `listings`, texto, **nullable** (a maioria não vai usar).
- Aceitar `sku` no `POST /api/listings` e no `PATCH /api/listings/:id`.
- Devolver `sku` no anúncio (o front já lê).
- Aceitar a coluna `sku` na importação por planilha.

**Não é obrigatório.** Colecionador pessoa física não trabalha com SKU, e exigir
travaria a publicação dele. Sem unicidade também: o mesmo código pode se repetir
entre vendedores diferentes, e cada um só enxerga o próprio.

---

## 2. Importação por planilha: colunas novas

O modelo antigo não pedia categoria, fotos, peso nem dimensões, e mandava usar
condições de um vocabulário abandonado (`lacrado`, `novo`, `mint`, `usado`).
Foi o que fez um vendedor subir 363 anúncios quase todos incompletos.

O modelo foi refeito e a planilha agora é conferida no navegador antes de subir.
Colunas que o arquivo passa a trazer:

| Coluna | Obrigatória | Observação |
|---|---|---|
| `title` | sim | mínimo 10 caracteres |
| `category` | sim | slug: `miniaturas-diecast`, `cards-colecionaveis`, `action-figures`, `funko-pop`, `mangas-hqs` |
| `condition` | sim | `novo-lacrado`, `novo-sem-caixa`, `usado-conservado`, `usado-com-marcas` |
| `description` | sim | mínimo 30 caracteres |
| `price` | sim | aceita `149.90` e `149,90` |
| `images` | sim | 3 a 8 URLs separadas por vírgula |
| `weight_grams` | sim | frete sai errado sem isso |
| `width_cm` `height_cm` `length_cm` | sim | idem |
| `brand` `scale` `jogo` `line` `personagem` `numero` `tituloObra` | conforme a categoria | ver a regra por categoria abaixo |
| `sku` `year` `edition` | não | |

**O que precisa no backend:**

- Aceitar essas colunas no `POST /api/listings/import`, principalmente
  `category` e os dados de frete, que hoje se perdem.
- **Validar no servidor também.** A conferência do front protege quem usa a
  tela; quem chamar a API direto continua criando anúncio incompleto.
- Atualizar (ou desativar) o template servido em
  `GET /api/listings/import/template`. O front hoje gera o modelo por conta
  própria justamente porque o do servidor está com o vocabulário antigo.

Campos obrigatórios por categoria (mesma regra do formulário, em
`src/lib/category-fields.ts`):

| Categoria | Exige |
|---|---|
| `miniaturas-diecast` | `brand`, `scale` |
| `cards-colecionaveis` | `jogo` |
| `action-figures` | `brand`, `line`, `personagem` |
| `funko-pop` | `numero`, `line` |
| `mangas-hqs` | `tituloObra` |

---

## 3. Anúncio reprovado precisa voltar para a fila

Você já implementou `rejectionReason`, `moderatedBy` e `moderatedAt`, e o
e-mail de "precisa de ajuste" está saindo certo. O front agora mostra o motivo
para o vendedor, na lista e na tela de edição.

**Falta confirmar uma coisa:** quando o vendedor edita e salva um anúncio com
status `rejected`, ele volta para `pending_review` automaticamente?

Se não voltar, o anúncio corrigido fica preso em "Reprovado" para sempre e
nunca mais aparece na moderação. O vendedor corrige e não acontece nada.

---

## 4. Aprovação automática de anúncio

Alguns vendedores têm 100% dos anúncios em `active` e zero em `pending_review`
(por exemplo `jeanvitor1984@gmail.com`, com 56 de 56). Outros têm quase tudo
esperando.

São dois comportamentos diferentes no mesmo banco, o que sugere dois caminhos
de criação, um deles publicando sem passar pela moderação.

**Vale investigar antes do lançamento**, porque na prática significa que o
controle de qualidade não está valendo para todo mundo.

---

## 5. Os dois status de espera

O banco tem `pending_review` (358) e `draft` (251). O painel do vendedor conta
`pending_review` como "em análise"; a fila do admin buscava só `draft` e por
isso 358 anúncios ficaram invisíveis para a moderação (já contornado no front,
que agora busca os dois).

**Precisa de definição:** `draft` é anúncio salvo e não enviado, ou é
vocabulário antigo? Se for salvo e não enviado, esses 251 não deveriam estar na
fila de aprovação. Se for vocabulário antigo, vale migrar.

Isso muda o que a equipe aprova no dia 25.

---

## 6. E-mails transacionais

Você já ligou o `anuncioRejeitado` usando o kit em `emails/`, e criou um
template próprio para "conta de vendedor aprovada".

Duas observações:

**O template da conta aprovada não segue o visual do kit** (sem logo, sem as
cores da marca). O vendedor recebe um e-mail com identidade quando o anúncio é
reprovado e um genérico quando a conta é aprovada. Para alinhar, use `render()`
de `emails/layout.mjs`, que entrega a casca pronta e a versão em texto puro.

**Faltam 11 dos 12 templates.** Prioridade para o lançamento:

1. `anuncioAprovado`: vão ser centenas de aprovações, e hoje isso acontece no
   silêncio para o vendedor.
2. `novoPedidoVendedor`: sem isso o vendedor não descobre que vendeu.
3. `pedidoConfirmado`: recibo para o comprador.
4. `boasVindas`: primeiro contato.

Todos prontos em `emails/templates.mjs`. Roda `node emails/preview.mjs` para
ver como ficam.

Lembrando que `RESEND_API_KEY`, `EMAIL_REMETENTE` e `EMAIL_RESPOSTA` vão no
**Render**, não na Vercel.

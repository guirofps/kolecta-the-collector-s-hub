# E-mails transacionais da Kolecta

Documento de handoff. Para o Daniel implementar no backend (Render).

## O problema, em uma frase

A Kolecta não manda nenhum e-mail de negócio. Hoje o cliente faz cadastro,
publica anúncio, vende, recebe, e não chega nada na caixa dele. O único e-mail
que sai é o do Clerk (confirmação de login e recuperação de senha), que roda na
infraestrutura do Clerk, não na nossa.

Pior: em `src/pages/seller/Settings.tsx` já existe, no ar, a tela de Notificações
onde o vendedor liga e desliga e-mail para seis eventos. A preferência salva no
backend. Nenhum e-mail é enviado. O vendedor liga a chave e não acontece nada.
Metade do contrato já está construída. Falta o remetente.

## Como funciona: três peças, papéis separados

A confusão mais comum é achar que o Resend "cuida de tudo". Não cuida. São três
peças com papéis distintos:

| Peça | Papel | Quem faz |
|---|---|---|
| **O conteúdo** | os e-mails prontos: layout, copy, dados | já feito, pasta `emails/` |
| **O gatilho** | detectar o evento e chamar o Resend | backend no Render (Daniel) |
| **A entrega** | pegar o e-mail pronto e entregar na caixa | Resend |

Uma analogia: o Resend é a transportadora. Ele entrega o pacote que você
despachar, mas não sabe que houve uma venda nem decide quando despachar. Quem
percebe "o pagamento caiu" e despacha o pacote é o backend. O pacote em si, já
embrulhado, é o que está pronto na pasta `emails/`.

## Divisão de trabalho

- **Guilherme + design (aqui):** montamos os e-mails, a copy, o fluxo. Feito.
- **Daniel (backend no Render):** liga os gatilhos, ou seja, chama `enviarEmail()`
  nos pontos onde a API dele já processa cada evento.
- **Resend:** entrega.

O Daniel não escreve e-mail nem mexe em layout. O trabalho dele é fiação: nos
lugares onde o código já faz "confirmar pagamento", "aprovar anúncio", "registrar
lance", adicionar uma linha que chama o envio.

## O fluxo completo do marketplace

O mapa de toda a jornada e onde cada e-mail entra. A coluna Estado diz o que já
está pronto neste kit e o que é adição futura.

### Cadastro e conta
| Momento | E-mail | Para | Estado |
|---|---|---|---|
| Criou a conta | `boasVindas` | novo usuário | pronto |
| Confirmar e-mail, recuperar senha | (do Clerk) | usuário | já existe, fora do kit |

### Anúncio
| Momento | E-mail | Para | Estado |
|---|---|---|---|
| Anúncio aprovado na moderação | `anuncioAprovado` | vendedor | pronto |
| Anúncio rejeitado, com motivo | `anuncioRejeitado` | vendedor | pronto |

### Compra direta
| Momento | E-mail | Para | Estado |
|---|---|---|---|
| Pagamento confirmado | `novoPedidoVendedor` | vendedor | pronto |
| Pagamento confirmado | `pedidoConfirmado` | comprador | pronto |
| Vendedor postou, com rastreio | `pedidoEnviado` | comprador | pronto |
| Entregue, confirmar recebimento | `pedidoEntregue` | comprador | futuro |
| Pedido concluído, avaliar | `pedirAvaliacao` | comprador | futuro |
| PIX gerado e não pago, lembrete | `pagamentoPendente` | comprador | futuro |

### Modo lance (leilão)
| Momento | E-mail | Para | Estado |
|---|---|---|---|
| Novo lance no seu leilão | `lanceRecebido` | vendedor | pronto |
| Cobriram o seu lance | `lanceSuperado` | comprador anterior | pronto |
| Você arrematou | `leilaoVencido` | arrematante | pronto |
| Leilão encerrando em breve | `leilaoEncerrando` | interessados | futuro |

### Conversas
| Momento | E-mail | Para | Estado |
|---|---|---|---|
| Nova mensagem na conversa | `mensagemRecebida` | destinatário | pronto |

### Dinheiro
| Momento | E-mail | Para | Estado |
|---|---|---|---|
| Repasse liberado ao vendedor | `repasseRealizado` | vendedor | pronto |
| Saque para a conta bancária | `saqueRealizado` | vendedor | futuro |

### Disputa
| Momento | E-mail | Para | Estado |
|---|---|---|---|
| Comprador abriu disputa | `disputaAberta` | vendedor | pronto |
| Disputa resolvida | `disputaResolvida` | ambos | futuro |

**12 e-mails prontos** cobrem o núcleo. Os marcados como futuro fecham as pontas
soltas (confirmar recebimento, avaliação, disputa resolvida) e podem ser montados
depois do lançamento, na mesma estrutura, sem retrabalho.

## O que já está pronto neste repositório

Pasta `emails/`, em Node puro, sem React nem Vite. Foi escrita assim de propósito
para o backend copiar e usar direto.

| Arquivo | O que é |
|---|---|
| `emails/layout.mjs` | casca visual, cores da marca, botão, caixas, versão em texto puro |
| `emails/templates.mjs` | os 12 e-mails, cada um devolve `{ assunto, html, texto }` |
| `emails/enviar-resend.mjs` | implementação de referência do envio, é só copiar |
| `emails/preview.mjs` | gera todos com dados de exemplo para conferir |

Para ver como ficaram:

```bash
node emails/preview.mjs
```

Depois abra `emails/preview/index.html`.

Já validado: os 12 renderizam, nenhum estoura a largura em tela de 375px, todos
têm versão em texto puro (sem ela o e-mail perde ponto no filtro de spam) e todos
trazem a logo com texto alternativo estilizado, para o caso do cliente de e-mail
bloquear imagem.

## O que o Daniel faz, passo a passo

### 1. Copiar o kit

Copie a pasta `emails/` para o repositório do backend e instale a dependência:

```bash
npm install resend
```

### 2. As variáveis vão no RENDER, não na Vercel

Este é o ponto que mais confunde. O backend roda no **Render**
(`kolecta-backend.onrender.com`). É lá que as variáveis entram, no serviço
`kolecta-backend`, seção Environment:

| Variável | Valor |
|---|---|
| `RESEND_API_KEY` | chave do painel do Resend |
| `EMAIL_REMETENTE` | `Kolecta <avisos@send.kolecta.com.br>` |
| `EMAIL_RESPOSTA` | `contato@kolecta.com.br` |
| `EMAIL_ATIVO` | `false` desliga tudo sem precisar de deploy |

Se essas variáveis foram colocadas na Vercel, elas não servem para isto. A Vercel
hospeda só o frontend, que não manda e-mail. Quem manda é o backend no Render, e
o backend só enxerga as variáveis do próprio ambiente dele.

E nunca em variável `VITE_`: tudo que começa com `VITE_` é compilado dentro do
JavaScript público do site. Uma chave do Resend ali deixa qualquer visitante
mandar e-mail assinado como Kolecta.

### 3. Ligar os gatilhos

Nos pontos onde a API já processa cada evento, chamar `enviarEmail()`. O mapa:

| Onde, no backend | Chamada |
|---|---|
| Webhook de pagamento confirma o pedido | `novoPedidoVendedor` (vendedor) e `pedidoConfirmado` (comprador) |
| Admin aprova o anúncio | `anuncioAprovado` |
| Admin rejeita o anúncio | `anuncioRejeitado` |
| Gera etiqueta ou marca envio | `pedidoEnviado` |
| Registra lance | `lanceRecebido` (vendedor) e `lanceSuperado` (lance anterior) |
| Leilão encerra com vencedor | `leilaoVencido` |
| Nova mensagem | `mensagemRecebida` |
| Libera repasse | `repasseRealizado` |
| Abre disputa | `disputaAberta` |
| Cria usuário | `boasVindas` |

A função `enviarEmail()` em `emails/enviar-resend.mjs` já resolve o resto: monta
o template, checa a preferência do usuário e manda.

### 4. Três cuidados que evitam dor de cabeça

**Respeitar a preferência do usuário.** A tela de Notificações promete que o
vendedor controla o que recebe. A função `devoEnviar()` já faz essa checagem,
usando as mesmas chaves (`newOrder`, `newBid`, etc.) que a tela salva. Os
essenciais (recibo de pagamento, pedido enviado) passam sempre, porque ninguém
deveria conseguir desligar o aviso de que o pedido dele foi despachado.

**Usar a chave de idempotência.** Webhook de pagamento reprocessa. Sem isso, o
vendedor recebe o mesmo "você vendeu" três vezes. O campo `idempotencia` na
chamada vira o header que o Resend usa para descartar duplicata em 24h.

**Não bloquear a resposta ao usuário esperando o e-mail.** O pedido foi pago; se
o aviso falhar, isso se resolve depois. Dispare sem aguardar, ou jogue numa fila.
A implementação de referência já engole o erro e loga, para o e-mail nunca
derrubar a request principal.

## Domínio e DNS

Já resolvido. O domínio de envio é **`send.kolecta.com.br`**, verificado no
Resend com SPF e DKIM próprios.

Foi usado um subdomínio, e não a raiz `kolecta.com.br`, de propósito: a raiz já
tem o SPF da Hostinger, onde ficam as caixas de e-mail. Um domínio não pode ter
dois registros SPF; um segundo invalidaria os dois e derrubaria a entrega da
caixa que hoje funciona. Com o subdomínio, Hostinger e Resend convivem sem se
tocar.

O disparo da pré-seleção de founders já saiu por esse domínio, com entrega ok.
Então o canal está provado. O que falta é só a fiação do Daniel.

## Prioridade para o dia 25

Não precisa dos 12 no lançamento. Estes quatro resolvem o essencial:

1. **`anuncioAprovado`**, porque tem 176 anúncios parados em análise. Quando forem
   aprovados em lote, 20 e poucos vendedores precisam saber que a vitrine ficou no
   ar. Sem esse e-mail, a aprovação acontece no silêncio.
2. **`novoPedidoVendedor`**, senão o vendedor não descobre que vendeu e o pedido
   estoura o prazo de postagem.
3. **`pedidoConfirmado`**, para o comprador ter recibo do que pagou.
4. **`boasVindas`**, primeiro contato e onde a pessoa aprende que pode vender.

O resto entra depois, sem pressa, na mesma estrutura.

## O que não fazer

- Não colocar a chave do Resend em variável `VITE_`. Isso publica a chave.
- Não colocar a chave na Vercel achando que resolve. O backend está no Render.
- Não verificar o domínio raiz no Resend, pelo motivo do SPF acima.
- Não disparar e-mail ignorando `notificationPrefs`. A tela existe e promete
  controle ao vendedor.
- Não misturar isto com e-mail de marketing. Transacional e campanha têm
  reputação separada; misturar derruba a entrega dos dois.

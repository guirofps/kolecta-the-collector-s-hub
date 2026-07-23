# E-mails transacionais da Kolecta

Documento de integração. Para o Daniel implementar no repositório da API.

## Situação hoje

A Kolecta não manda nenhum e-mail próprio. Os únicos que saem são os do Clerk
(confirmação de cadastro e recuperação de senha), que rodam na infraestrutura
dele, não na nossa.

**Isso já é uma promessa quebrada em produção.** Em `src/pages/seller/Settings.tsx`
existe a tela de Notificações, no ar, onde o vendedor liga e desliga e-mail para
seis eventos. A preferência salva no backend via `PUT /api/seller/notification-preferences`.
Nenhum e-mail é enviado. O vendedor liga a chave e não acontece nada.

Ou seja: metade do contrato já está construída. Falta o remetente.

## O que já está pronto neste repositório

Pasta `emails/`, em Node puro, sem React, sem Vite, sem nada do frontend.
Foi escrita assim de propósito para o backend copiar e usar direto.

| Arquivo | O que é |
|---|---|
| `emails/layout.mjs` | casca visual, cores da marca, botão, caixas, versão em texto puro |
| `emails/templates.mjs` | os 12 e-mails, cada um devolvendo `{ assunto, html, texto }` |
| `emails/enviar-resend.mjs` | implementação de referência do envio, é só copiar |
| `emails/preview.mjs` | gera todos com dados de exemplo para conferir no navegador |

Para ver como ficaram:

```bash
node emails/preview.mjs
```

Depois abra `emails/preview/index.html`.

Já validado: os 12 renderizam, nenhum estoura a largura em tela de 375px, todos
têm versão em texto puro (sem ela o e-mail perde ponto nos filtros de spam) e
todos trazem a logo com texto alternativo estilizado, para o caso do cliente de
e-mail bloquear imagem.

## Os 12 templates e seus gatilhos

`prefKey` é a chave que já existe na tela de Notificações. Antes de enviar,
o backend consulta a preferência do usuário. `essencial` é recibo de transação
e não tem opção de desligar: ninguém deveria conseguir desativar o aviso de que
o pedido dele foi enviado.

| Template | Quando dispara | Vai para | Trava |
|---|---|---|---|
| `boasVindas` | cadastro concluído | novo usuário | essencial |
| `anuncioAprovado` | admin aprova o anúncio | vendedor | `listingReview` |
| `anuncioRejeitado` | admin rejeita o anúncio | vendedor | `listingReview` |
| `novoPedidoVendedor` | pagamento confirmado | vendedor | `newOrder` |
| `pedidoConfirmado` | pagamento confirmado | comprador | essencial |
| `pedidoEnviado` | vendedor gera etiqueta ou marca envio | comprador | essencial |
| `lanceRecebido` | novo lance no leilão | vendedor | `newBid` |
| `lanceSuperado` | outro comprador cobre o lance | comprador anterior | `newBid` |
| `leilaoVencido` | leilão encerra com vencedor | arrematante | essencial |
| `mensagemRecebida` | nova mensagem na conversa | destinatário | `buyerMessage` |
| `repasseRealizado` | repasse liberado ao vendedor | vendedor | `transferDone` |
| `disputaAberta` | comprador abre disputa | vendedor | `disputeOpened` |

A função `devoEnviar(template, prefs)` em `templates.mjs` já resolve essa lógica.
Preferência ausente conta como ligada, senão quem nunca abriu a tela de
configurações perderia aviso de venda sem saber.

## O que precisa ser feito

### 1. Conta no Resend

Plano gratuito cobre 3.000 e-mails por mês, folgado para o volume atual.

### 2. Verificar o domínio, e aqui tem uma armadilha

**Verifique `send.kolecta.com.br`, não `kolecta.com.br`.**

O motivo é concreto. O domínio raiz já tem SPF apontando para a Hostinger, que
é onde ficam as caixas de e-mail:

```
v=spf1 include:_spf.mail.hostinger.com ~all
```

Um domínio **não pode ter dois registros SPF**. Se alguém publicar um segundo
para o Resend, os dois passam a ser inválidos e o e-mail da empresa inteira
começa a cair em spam, inclusive o da caixa que já funciona hoje. Daria para
resolver mesclando os `include` num registro só, mas aí qualquer mudança futura
em um dos serviços mexe na configuração do outro.

Usando um subdomínio, os dois convivem sem se tocar: a Hostinger continua dona
de `kolecta.com.br` e o Resend passa a ser dono de `send.kolecta.com.br`.
Verifiquei e o subdomínio está livre, nada aponta para ele hoje.

O Resend vai pedir três registros no DNS, todos dentro do subdomínio: um MX
para o retorno de mensagem que não pôde ser entregue, um TXT com o SPF dele e
um TXT de DKIM. Copie os valores do painel do Resend, porque eles mudam
conforme a região escolhida.

O DMARC atual (`p=none`) não precisa mudar agora. Ele só monitora, não bloqueia.

### 3. Variáveis na API

No ambiente onde a API roda, nunca no frontend:

| Variável | Valor |
|---|---|
| `RESEND_API_KEY` | chave do painel do Resend |
| `EMAIL_REMETENTE` | `Kolecta <avisos@send.kolecta.com.br>` |
| `EMAIL_RESPOSTA` | `contato@kolecta.com.br`, para a resposta cair na caixa de verdade |
| `EMAIL_ATIVO` | `false` desliga tudo sem precisar de deploy |

**A chave não pode encostar no frontend.** Tudo que o Vite compila vira código
público no navegador. Uma `RESEND_API_KEY` no bundle deixa qualquer visitante
mandar e-mail assinado como Kolecta.

### 4. Ligar os gatilhos

Copie `emails/` para o repositório da API, instale `resend` e chame
`enviarEmail()` nos pontos da tabela acima.

Três cuidados que evitam dor de cabeça:

**E-mail não pode derrubar a request.** O pedido foi pago; se o aviso falhar,
isso se resolve depois. A implementação de referência já engole o erro e loga.

**Use a chave de idempotência.** Webhook de pagamento reprocessa. Sem isso, o
vendedor recebe o mesmo "você vendeu" três vezes. O campo `idempotencia` vira
o header que o Resend usa para descartar duplicata em 24h.

**Não bloqueie a resposta ao usuário esperando o envio.** Dispare sem aguardar,
ou jogue numa fila.

## Prioridade para o dia 25

Não precisa dos 12 no lançamento. Estes quatro resolvem o essencial:

1. **`anuncioAprovado`**, porque temos 176 anúncios parados em análise. Quando
   forem aprovados em lote, 20 e poucos vendedores precisam saber que a vitrine
   deles ficou no ar. Sem esse e-mail, a aprovação acontece no silêncio.
2. **`novoPedidoVendedor`**, senão o vendedor não descobre que vendeu e o pedido
   estoura o prazo de postagem.
3. **`pedidoConfirmado`**, para o comprador ter recibo do que pagou.
4. **`boasVindas`**, que é o primeiro contato e onde a pessoa aprende que pode
   vender.

O resto entra depois do lançamento, sem pressa.

## O que não fazer

- Não colocar a chave do Resend em variável `VITE_*`. Isso publica a chave.
- Não verificar o domínio raiz no Resend, pelo motivo do SPF explicado acima.
- Não disparar e-mail ignorando `notificationPrefs`. A tela existe e promete
  controle ao vendedor.
- Não mandar e-mail de marketing por este caminho. Transacional e campanha têm
  reputação separada; misturar os dois derruba a entrega dos dois.

# Disparo de e-mail dos Membros Fundadores

Script de linha de comando que monta e envia o e-mail da pré-seleção de Fundador.
Roda na máquina, nunca no navegador: a senha do e-mail não pode existir no bundle
do site, senão qualquer visitante conseguiria mandar e-mail se passando pela Kolecta.

## Quem recebe

O script lê o CSV exportado do Turso e separa em dois grupos:

| Grupo | Critério | CTA do e-mail |
|---|---|---|
| `preselecionado` | 5 anúncios ou mais | botão para o WhatsApp da Kolecta |
| `quase-la` | 3 ou 4 anúncios | botão para publicar o próximo anúncio |

Contas internas, de teste e a marca-mãe estão na lista `INTERNOS` dentro de
`enviar.mjs` e nunca recebem.

## Configuração

Crie `scripts/email-fundadores/.env` (o git ignora este arquivo, não commite):

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=contato@kolecta.com.br
SMTP_PASS=a-senha-da-caixa
REMETENTE=Kolecta <contato@kolecta.com.br>
RESPONDER_PARA=contato@kolecta.com.br
WHATSAPP=5511987654321
```

`WHATSAPP` vai no formato internacional, só dígitos: 55 + DDD + número.

## Uso

Exporte a base do Turso para `dados.csv` nesta pasta, depois:

```bash
# 1. Dry-run. Gera os previews em preview/ e não manda nada.
node scripts/email-fundadores/enviar.mjs

# 2. Confira abrindo qualquer arquivo de preview/ no navegador.

# 3. Teste real, só para você.
node scripts/email-fundadores/enviar.mjs --so seu@email.com --enviar

# 4. Disparo de verdade. Pede confirmação digitada no terminal.
node scripts/email-fundadores/enviar.mjs --enviar
```

Flags:

- `--csv <arquivo>` outro caminho de base
- `--grupo preselecionado|quase-la|todos` filtra o grupo
- `--so <email>` manda para um endereço só
- `--enviar` sai do dry-run e envia de verdade

## Travas de segurança

O script foi feito para ser difícil de disparar por acidente:

1. Sem `--enviar` ele nunca manda nada, só escreve os previews.
2. Com `--enviar` ele ainda exige que você digite `ENVIAR` no terminal.
3. Recusa começar se faltar variável no `.env` ou se o WhatsApp não estiver no formato certo.
4. Grava cada envio em `enviados.json`. Rodar de novo pula quem já recebeu, então
   ninguém leva o mesmo e-mail duas vezes.
5. Pausa de 4 segundos entre envios, para não parecer disparo em massa.

## Cuidados de entrega

- O domínio já tem SPF, DKIM e DMARC configurados na Hostinger, então o e-mail
  sai autenticado. Confira em https://www.mail-tester.com antes do disparo grande.
- A logo do topo é carregada de `https://kolecta.com.br/emails/kolecta-logo.png`.
  Se esse arquivo sair do `public/`, o e-mail fica com imagem quebrada.
- O volume aqui é pequeno, algumas dezenas. Para volume de verdade, o certo é
  mover isso para o backend com um provedor dedicado, não SMTP de caixa comum.

## Dados pessoais

`dados.csv`, `preview/`, `enviados.json` e `.env` estão no `.gitignore`.
Não commite nenhum deles.

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

O envio usa o Resend, mesmo canal e domínio verificado dos e-mails
transacionais. A chave sai da sua sessão de terminal, nunca de arquivo.

O número do WhatsApp de contato já vem embutido no script como padrão
(`5511910027211`), porque é público de qualquer forma: aparece no botão de
todo e-mail. Para trocar, defina `WHATSAPP` na sessão ou num `.env` local.

Variáveis lidas do ambiente (ou de um `.env` local, que o git ignora):

| Variável | O que colocar |
|---|---|
| `RESEND_API_KEY` | chave do painel do Resend (obrigatória para enviar) |
| `EMAIL_REMETENTE` | opcional, padrão `Kolecta <avisos@send.kolecta.com.br>` |
| `EMAIL_RESPOSTA` | opcional, padrão `contato@kolecta.com.br` |
| `WHATSAPP` | opcional, sobrescreve o número padrão |

## Uso

Exporte a base do Turso para `dados.csv` nesta pasta, depois:

```bash
# 1. Dry-run. Gera os previews em preview/ e não manda nada.
node scripts/email-fundadores/enviar.mjs

# 2. Confira abrindo qualquer arquivo de preview/ no navegador.

# 3. Ponha a chave na sessão (PowerShell). Ela nao fica salva em disco.
$env:RESEND_API_KEY="re_..."

# 4. Teste real, só para você.
node scripts/email-fundadores/enviar.mjs --so seu@email.com --enviar

# 5. Disparo de verdade. Pede confirmação digitada no terminal.
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
3. Recusa começar se faltar a chave do Resend ou se o WhatsApp não estiver no formato certo.
4. Grava cada envio em `enviados.json`. Rodar de novo pula quem já recebeu, então
   ninguém leva o mesmo e-mail duas vezes. O Resend ainda reforça isso com o
   header de idempotência, descartando duplicata na janela de 24h.
5. Pausa de 4 segundos entre envios, para não parecer disparo em massa.

## Cuidados de entrega

- O envio sai por `send.kolecta.com.br`, domínio verificado no Resend com SPF e
  DKIM próprios. Faça o teste em você mesmo (`--so seu@email.com`) antes do
  disparo grande e confira se caiu na caixa de entrada, não no spam.
- A logo do topo é carregada de `https://kolecta.com.br/emails/kolecta-logo.png`.
  Se esse arquivo sair do `public/`, o e-mail fica com imagem quebrada.

## Dados pessoais

`dados.csv`, `preview/`, `enviados.json` e `.env` estão no `.gitignore`.
Não commite nenhum deles. A chave do Resend nunca entra em arquivo: vive só na
sessão de terminal na hora de disparar.

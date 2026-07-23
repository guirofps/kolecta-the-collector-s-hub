#!/usr/bin/env node
// Manda UMA copia do e-mail de founder (versao pre-selecionado) para um
// endereco qualquer, mesmo que ele nao seja candidato. So para conferir o
// layout na propria caixa antes do disparo real.
//
//   node scripts/email-fundadores/teste-para.mjs voce@email.com

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarEmail, montarTexto, assunto, primeiroNome, linkWhatsapp } from './template.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

// Carrega o .env local (mesma leitura do enviar.mjs).
const envPath = path.join(AQUI, '.env');
if (fs.existsSync(envPath)) {
  for (const linha of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
}

const para = process.argv[2];
const chave = process.env.RESEND_API_KEY;
const remetente = process.env.EMAIL_REMETENTE || 'Kolecta <avisos@send.kolecta.com.br>';
const whatsapp = process.env.WHATSAPP || '5511910027211';

if (!para || !para.includes('@')) { console.error('Passe o e-mail: node ... teste-para.mjs voce@email.com'); process.exit(1); }
if (!chave || chave.includes('COLE_A_CHAVE')) { console.error('RESEND_API_KEY nao esta preenchida no .env.'); process.exit(1); }

// Dados de exemplo iguais ao maior candidato real, so para o preview parecer
// com o que sai de verdade.
const nome = primeiroNome('StopGames');
const dados = {
  nome, anuncios: 24, tipo: 'preselecionado',
  whatsapp: linkWhatsapp(whatsapp, nome, 'preselecionado'),
};

console.log(`Enviando teste "${assunto(dados)}" para ${para}...\n`);

const resp = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: remetente, to: para, reply_to: process.env.EMAIL_RESPOSTA || 'contato@kolecta.com.br',
    subject: assunto(dados), html: montarEmail(dados), text: montarTexto(dados),
  }),
});
const corpo = await resp.json().catch(() => ({}));

if (resp.ok) {
  console.log('ENVIADO. id:', corpo.id);
  console.log('Confira a caixa (e o spam).');
} else {
  console.error(`FALHOU (HTTP ${resp.status}):`, JSON.stringify(corpo));
  if (resp.status === 401) console.error('  -> chave invalida ou revogada.');
  if (resp.status === 403) console.error('  -> remetente nao bate com dominio verificado no Resend.');
  process.exit(1);
}

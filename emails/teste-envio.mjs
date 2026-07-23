#!/usr/bin/env node
// ── Teste de envio real via Resend ────────────────────────────────────────
//
// Prova, de ponta a ponta, que a chave do Resend e o domínio funcionam,
// sem depender do backend do Daniel e sem ninguém colar a chave em lugar
// que fique registrado.
//
// A chave sai da SUA sessão de terminal, nunca do código nem de arquivo.
// Uso no PowerShell (Windows):
//
//   $env:RESEND_API_KEY="a-chave-nova-do-resend"
//   node emails/teste-envio.mjs seu-email@exemplo.com
//
// Uso no bash/git-bash:
//
//   RESEND_API_KEY="a-chave-nova-do-resend" node emails/teste-envio.mjs seu-email@exemplo.com
//
// Zero dependência: fala com a API do Resend por fetch puro.

import { boasVindas } from './templates.mjs';

const chave = process.env.RESEND_API_KEY;
const para = process.argv[2];
const remetente = process.env.EMAIL_REMETENTE || 'Kolecta <avisos@send.kolecta.com.br>';

if (!chave) {
  console.error('Falta a chave. Defina RESEND_API_KEY na sessão antes de rodar.');
  console.error('  PowerShell: $env:RESEND_API_KEY="re_..."');
  console.error('  bash:       RESEND_API_KEY="re_..." node emails/teste-envio.mjs voce@email.com');
  process.exit(1);
}
if (!para || !para.includes('@')) {
  console.error('Passe o e-mail de destino: node emails/teste-envio.mjs voce@email.com');
  process.exit(1);
}

// Usa o template de verdade, para o teste mostrar exatamente o que a pessoa
// vai receber no cadastro real.
const { assunto, html, texto } = boasVindas({ nome: 'Teste Kolecta' });

console.log(`Enviando "${assunto}"`);
console.log(`  de:   ${remetente}`);
console.log(`  para: ${para}\n`);

const resp = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${chave}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ from: remetente, to: para, subject: assunto, html, text: texto }),
});

const corpo = await resp.json().catch(() => ({}));

if (resp.ok) {
  console.log('ENVIADO. id:', corpo.id);
  console.log('\nConfira a caixa (e o spam). Se chegou, a chave e o domínio estão ok.');
} else {
  console.error(`FALHOU (HTTP ${resp.status}):`, JSON.stringify(corpo, null, 2));
  console.error('\nPistas comuns:');
  console.error('  401  chave inválida ou revogada');
  console.error('  403  o "from" não bate com um domínio verificado no Resend');
  console.error('  422  e-mail de destino malformado');
  process.exit(1);
}

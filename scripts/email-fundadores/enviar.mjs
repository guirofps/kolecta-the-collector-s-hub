#!/usr/bin/env node
// ── Disparo dos e-mails de Membro Fundador ────────────────────────────────
//
// Roda na máquina, NUNCA no navegador: a senha do e-mail não pode existir no
// bundle do site. Por padrão o script é dry-run, ou seja, só gera os previews
// em disco e não manda nada. Enviar de verdade exige a flag --enviar.
//
//   node scripts/email-fundadores/enviar.mjs --csv dados.csv
//   node scripts/email-fundadores/enviar.mjs --csv dados.csv --enviar
//
// Configuração em scripts/email-fundadores/.env, que o git ignora. As chaves
// esperadas e o que vai em cada uma estão no README desta pasta. Nunca cole
// essas credenciais em chat nem commite o arquivo.
//
// Exemplo com host, usuário e senha juntos fica fora daqui de propósito: mesmo
// com valor inventado, isso dispara o detector de segredo do GitHub.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { montarEmail, montarTexto, assunto, primeiroNome, linkWhatsapp } from './template.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

// ── Configuração ──────────────────────────────────────────────────────────
const MIN_CANDIDATO = 5;       // a partir daqui a pessoa está pré-selecionada
const MIN_QUASE_LA = 3;        // de 3 a 4 anúncios recebe o e-mail de empurrão
const PAUSA_MS = 4000;         // respiro entre envios, para não parecer disparo em massa

// Contas internas, de teste ou da marca-mãe. Não recebem e-mail.
const INTERNOS = new Set([
  'vendedor@email.com', 'admin@kolecta.com.br', 'joao@email.com',
  'dansalgaado@gmail.com', 'kolecta.contato@gmail.com',
  'danielsalgadomatozinho@gmail.com', 'guilhermerojasiqueira@gmail.com',
  'artminiss.toys@gmail.com',
]);

// ── Argumentos ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (nome) => args.includes(nome);
const valor = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};

const ENVIAR_DE_VERDADE = flag('--enviar');
const SO_ESTE = valor('--so', null);            // manda para um e-mail só, para teste
const GRUPO = valor('--grupo', 'todos');        // preselecionado | quase-la | todos
const CSV = valor('--csv', path.join(AQUI, 'dados.csv'));
const SAIDA = path.join(AQUI, 'preview');
const LOG = path.join(AQUI, 'enviados.json');

// ── .env ──────────────────────────────────────────────────────────────────
const envPath = path.join(AQUI, '.env');
if (fs.existsSync(envPath)) {
  for (const linha of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
}

const WHATSAPP = process.env.WHATSAPP || '';

// ── Leitura do CSV ────────────────────────────────────────────────────────
// Parser pequeno mas que respeita aspas e vírgula dentro do campo, porque a
// coluna de títulos tem vírgula.
function lerCsv(arquivo) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  const linhas = [];
  let campo = '', linha = [], dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') dentroDeAspas = false;
      else campo += c;
    } else if (c === '"') dentroDeAspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }

  const cab = linhas.shift().map((h) => h.trim());
  return linhas
    .filter((l) => l.length === cab.length)
    .map((l) => Object.fromEntries(cab.map((h, i) => [h, l[i]])));
}

const num = (v) => {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

// ── Monta a lista ─────────────────────────────────────────────────────────
if (!fs.existsSync(CSV)) {
  console.error(`CSV não encontrado: ${CSV}`);
  console.error('Passe o caminho com --csv <arquivo>');
  process.exit(1);
}

const todos = lerCsv(CSV);
const destinatarios = [];

for (const r of todos) {
  const email = (r.email || '').trim().toLowerCase();
  const anuncios = num(r.enviados);
  if (!email || INTERNOS.has(email)) continue;

  let tipo = null;
  if (anuncios >= MIN_CANDIDATO) tipo = 'preselecionado';
  else if (anuncios >= MIN_QUASE_LA) tipo = 'quase-la';
  if (!tipo) continue;
  if (GRUPO !== 'todos' && GRUPO !== tipo) continue;
  if (SO_ESTE && email !== SO_ESTE.toLowerCase()) continue;

  const nome = primeiroNome(r.nome);
  destinatarios.push({
    email,
    nome,
    anuncios,
    tipo,
    faltam: Math.max(0, MIN_CANDIDATO - anuncios),
    whatsapp: WHATSAPP ? linkWhatsapp(WHATSAPP, nome, tipo) : '',
  });
}

destinatarios.sort((a, b) => b.anuncios - a.anuncios);

const preSel = destinatarios.filter((d) => d.tipo === 'preselecionado').length;
const quase = destinatarios.filter((d) => d.tipo === 'quase-la').length;
console.log(`Base: ${todos.length} cadastros`);
console.log(`Vão receber: ${destinatarios.length} (${preSel} pré-selecionados, ${quase} quase lá)\n`);

// ── Gera os previews, sempre ──────────────────────────────────────────────
fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(SAIDA, { recursive: true });

for (const d of destinatarios) {
  const html = montarEmail(d);
  const arq = path.join(SAIDA, `${d.tipo}-${d.email.replace(/[^a-z0-9]/gi, '_')}.html`);
  fs.writeFileSync(arq, html, 'utf8');
}
console.log(`Previews em: ${SAIDA}`);

if (!WHATSAPP) {
  console.warn('\nATENÇÃO: WHATSAPP não está definido no .env.');
  console.warn('O botão do e-mail vai sair sem link. Preencha antes de enviar.');
}

// ── Daqui para baixo, só com --enviar ─────────────────────────────────────
if (!ENVIAR_DE_VERDADE) {
  console.log('\nDRY-RUN. Nada foi enviado.');
  console.log('Abra um preview no navegador para conferir e rode de novo com --enviar.');
  for (const d of destinatarios.slice(0, 5)) {
    console.log(`   ${d.email.padEnd(38)} ${String(d.anuncios).padStart(2)} anúncios  ${d.tipo}`);
  }
  if (destinatarios.length > 5) console.log(`   ... e mais ${destinatarios.length - 5}`);
  process.exit(0);
}

// Travas antes de qualquer envio real.
const faltando = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'REMETENTE']
  .filter((k) => !process.env[k]);
if (faltando.length) {
  console.error(`\nFaltam variáveis no .env: ${faltando.join(', ')}`);
  process.exit(1);
}
if (!/^\d{12,13}$/.test(WHATSAPP)) {
  console.error('\nWHATSAPP inválido. Use o formato 55DDDNUMERO, por exemplo 5511987654321.');
  process.exit(1);
}

// Quem já recebeu não recebe de novo, mesmo se o script rodar duas vezes.
const jaEnviados = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : {};
const fila = destinatarios.filter((d) => !jaEnviados[d.email]);
if (fila.length !== destinatarios.length) {
  console.log(`${destinatarios.length - fila.length} já receberam antes e foram pulados.`);
}
if (!fila.length) {
  console.log('Ninguém novo na fila. Nada a fazer.');
  process.exit(0);
}

// Confirmação no terminal. Envio de e-mail não tem desfazer.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const resposta = await new Promise((res) =>
  rl.question(`\nEnviar ${fila.length} e-mails de verdade, a partir de ${process.env.REMETENTE}? (digite ENVIAR) `, res)
);
rl.close();
if (resposta.trim() !== 'ENVIAR') {
  console.log('Cancelado.');
  process.exit(0);
}

const { default: nodemailer } = await import('nodemailer');
const transporte = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

await transporte.verify();
console.log('Conexão SMTP ok. Começando.\n');

let ok = 0, erro = 0;
for (const d of fila) {
  try {
    await transporte.sendMail({
      from: process.env.REMETENTE,
      to: d.email,
      replyTo: process.env.RESPONDER_PARA || process.env.SMTP_USER,
      subject: assunto(d),
      text: montarTexto(d),
      html: montarEmail(d),
    });
    jaEnviados[d.email] = new Date().toISOString();
    fs.writeFileSync(LOG, JSON.stringify(jaEnviados, null, 2), 'utf8');
    ok++;
    console.log(`  ok    ${d.email}`);
  } catch (e) {
    erro++;
    console.error(`  ERRO  ${d.email}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, PAUSA_MS));
}

console.log(`\nEnviados: ${ok}. Erros: ${erro}.`);
console.log(`Registro em ${LOG}`);

#!/usr/bin/env node
// Gera todos os e-mails com dados de exemplo, para conferir no navegador.
//
//   node emails/preview.mjs
//   depois abra emails/preview/index.html
//
// Nenhum e-mail é enviado aqui. Isto só escreve HTML em disco.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES, devoEnviar } from './templates.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'preview');

// Dados de exemplo por template. Nomes de peça reais do catálogo, para o
// preview parecer com o que a pessoa vai receber de verdade.
const EXEMPLOS = {
  boasVindas: { nome: 'RAQUEL FERREIRA DOS SANTOS' },

  anuncioAprovado: {
    nome: 'StopGames', anuncioId: 'lst_8842',
    tituloAnuncio: 'Funko Pop Teddiursa 985 Pokemon',
  },
  anuncioRejeitado: {
    nome: 'wilbur da silva', anuncioId: 'lst_8843',
    tituloAnuncio: 'Hot Wheels Premium Ferrari 250 GTO',
    motivo: 'As fotos estão desfocadas e não dá para ler o estado da embalagem. Refaça com boa luz e envie de novo.',
  },

  novoPedidoVendedor: {
    nome: 'Wagner Conte', pedidoId: 'KOL-10427', comprador: 'Pedro B.',
    itens: [
      { titulo: 'Hot Wheels F1 2025 Mclaren 4 Formula 1 Team', preco: 89.9 },
      { titulo: 'Hot Wheels F1 2025 Moneygram Haas 31', preco: 89.9 },
    ],
    total: 194.7,
  },
  pedidoConfirmado: {
    nome: 'Pedro Belford', pedidoId: 'KOL-10427', vendedor: 'Racer Toys',
    itens: [
      { titulo: 'Hot Wheels F1 2025 Mclaren 4 Formula 1 Team', preco: 89.9 },
      { titulo: 'Hot Wheels F1 2025 Moneygram Haas 31', preco: 89.9 },
    ],
    total: 194.7,
  },
  pedidoEnviado: {
    nome: 'Pedro Belford', pedidoId: 'KOL-10427',
    transportadora: 'Correios PAC', rastreio: 'AA123456789BR',
    urlRastreio: 'https://rastreamento.correios.com.br/app/index.php',
  },

  lanceRecebido: {
    nome: 'xCL TCG', leilaoId: 'auc_331', totalLances: 7,
    tituloAnuncio: 'Gardevoir (7/132) Padrao de Foil Saturno', valorLance: 640,
  },
  lanceSuperado: {
    nome: 'Bruno Cavalcanti', leilaoId: 'auc_331',
    tituloAnuncio: 'Gardevoir (7/132) Padrao de Foil Saturno',
    seuLance: 610, lanceAtual: 640, terminaEm: '2 horas e 14 minutos',
  },
  leilaoVencido: {
    nome: 'Bruno Cavalcanti', pedidoId: 'KOL-10431',
    tituloAnuncio: 'Gardevoir (7/132) Padrao de Foil Saturno', valorFinal: 675,
  },

  mensagemRecebida: {
    nome: 'Tato & Cuco Toys', deQuem: 'Christian R.', conversaId: 'cnv_774',
    tituloAnuncio: 'Hot Wheels Ferrari Testarossa',
    trecho: 'Boa tarde! A embalagem tem algum amassado? Consegue mandar foto do verso do blister?',
  },

  repasseRealizado: { nome: 'BR2 Importados', valor: 1743.2, pedidoId: 'KOL-10389' },

  disputaAberta: { nome: 'Luis Sbarra', pedidoId: 'KOL-10402', disputaId: 'dsp_58' },
};

fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(SAIDA, { recursive: true });

const linhas = [];
let erros = 0;

for (const [nome, fn] of Object.entries(TEMPLATES)) {
  const dados = EXEMPLOS[nome];
  if (!dados) {
    console.error(`  SEM EXEMPLO  ${nome}`);
    erros++;
    continue;
  }
  try {
    const { assunto, html, texto } = fn(dados);
    fs.writeFileSync(path.join(SAIDA, `${nome}.html`), html, 'utf8');
    fs.writeFileSync(path.join(SAIDA, `${nome}.txt`), texto, 'utf8');

    const trava = fn.essencial ? 'essencial' : (fn.prefKey ?? 'sem trava');
    linhas.push(
      `<tr><td><a href="${nome}.html">${nome}</a></td><td>${assunto}</td><td>${trava}</td>` +
      `<td><a href="${nome}.txt">texto</a></td></tr>`
    );
    console.log(`  ok  ${nome.padEnd(22)} ${assunto}`);
  } catch (e) {
    console.error(`  ERRO  ${nome}: ${e.message}`);
    erros++;
  }
}

fs.writeFileSync(path.join(SAIDA, 'index.html'), `<!doctype html>
<meta charset="utf-8"><title>E-mails da Kolecta</title>
<style>
 body{background:#101218;color:#E8E9ED;font:15px Arial,Helvetica,sans-serif;padding:40px;}
 h1{color:#FFD700;font-size:22px;} table{border-collapse:collapse;width:100%;max-width:1000px;}
 td,th{border-bottom:1px solid #2A2D38;padding:10px 12px;text-align:left;font-size:14px;}
 th{color:#9A9DA8;text-transform:uppercase;font-size:11px;letter-spacing:1px;}
 a{color:#FFD700;}
</style>
<h1>E-mails transacionais da Kolecta</h1>
<p style="color:#9A9DA8">Preview com dados de exemplo. Nada foi enviado.</p>
<table><tr><th>Template</th><th>Assunto</th><th>Trava de preferência</th><th>Texto puro</th></tr>
${linhas.join('\n')}
</table>`, 'utf8');

// Confere a regra de preferência, que é a parte fácil de errar.
console.log('\nRegra de envio:');
console.log('  venda com prefs vazias  ->', devoEnviar('novoPedidoVendedor', {}), '(deve ser true)');
console.log('  venda com newOrder off  ->', devoEnviar('novoPedidoVendedor', { newOrder: { email: false } }), '(deve ser false)');
console.log('  pedido enviado off      ->', devoEnviar('pedidoEnviado', { qualquer: { email: false } }), '(essencial, deve ser true)');

console.log(`\n${linhas.length} templates gerados em ${SAIDA}`);
if (erros) { console.error(`${erros} com problema.`); process.exit(1); }

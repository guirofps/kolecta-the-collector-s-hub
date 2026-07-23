// ── Envio via Resend: implementação de referência ─────────────────────────
//
// Este arquivo é para o BACKEND. Copie para o repositório da API e chame de
// dentro dos handlers. Não importe isto no frontend: a RESEND_API_KEY daria a
// qualquer visitante o poder de mandar e-mail se passando pela Kolecta.
//
// Node puro. A única dependência é `resend`:
//   npm install resend
//
// Variáveis de ambiente esperadas na API (Vercel, Railway, onde ela rodar):
//   RESEND_API_KEY   chave do painel do Resend
//   EMAIL_REMETENTE  ex: Kolecta <avisos@send.kolecta.com.br>
//   EMAIL_RESPOSTA   ex: contato@kolecta.com.br  (opcional)
//   EMAIL_ATIVO      "false" desliga o envio sem precisar de deploy

import { Resend } from 'resend';
import { TEMPLATES, devoEnviar } from './templates.mjs';

const resend = new Resend(process.env.RESEND_API_KEY);

const ATIVO = process.env.EMAIL_ATIVO !== 'false';

/**
 * Manda um e-mail transacional.
 *
 * @param {object} p
 * @param {string} p.template  chave de TEMPLATES, ex: 'novoPedidoVendedor'
 * @param {string} p.para      e-mail do destinatário
 * @param {object} p.dados     o que o template pede
 * @param {object} [p.prefs]   notificationPrefs do usuário, vindo do banco
 * @param {string} [p.idempotencia]  chave para não mandar o mesmo aviso duas vezes
 * @returns {Promise<{enviado: boolean, motivo?: string, id?: string}>}
 */
export async function enviarEmail({ template, para, dados, prefs, idempotencia }) {
  const fn = TEMPLATES[template];
  if (!fn) throw new Error(`Template desconhecido: ${template}`);
  if (!para) return { enviado: false, motivo: 'sem destinatário' };

  // A tela de Notificações do painel promete que o vendedor controla isso.
  // Se ignorarmos a preferência aqui, a promessa vira mentira.
  if (!devoEnviar(template, prefs)) {
    return { enviado: false, motivo: 'usuário desligou este aviso' };
  }

  if (!ATIVO) return { enviado: false, motivo: 'envio desligado por EMAIL_ATIVO' };

  const { assunto, html, texto } = fn(dados);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_REMETENTE,
      to: para,
      replyTo: process.env.EMAIL_RESPOSTA,
      subject: assunto,
      html,
      text: texto,
      // O Resend usa isto para descartar duplicata em janela de 24h. Vale ouro
      // quando um retry do webhook de pagamento reprocessa o mesmo pedido.
      ...(idempotencia ? { headers: { 'X-Entity-Ref-ID': idempotencia } } : {}),
    });

    if (error) {
      // E-mail que falha não pode derrubar a request principal. O pedido foi
      // pago; o aviso não ter saído é problema menor e resolvível depois.
      console.error(`[email] falhou ${template} para ${para}:`, error);
      return { enviado: false, motivo: error.message };
    }

    return { enviado: true, id: data?.id };
  } catch (e) {
    console.error(`[email] exceção em ${template} para ${para}:`, e);
    return { enviado: false, motivo: e.message };
  }
}

// ── Exemplo de uso dentro de um handler ───────────────────────────────────
//
// Depois de confirmar o pagamento do pedido:
//
//   await enviarEmail({
//     template: 'novoPedidoVendedor',
//     para: vendedor.email,
//     prefs: vendedor.notificationPrefs,
//     idempotencia: `pedido-pago-${pedido.id}`,
//     dados: {
//       nome: vendedor.name,
//       pedidoId: pedido.codigo,
//       itens: pedido.itens.map(i => ({ titulo: i.titulo, preco: i.preco })),
//       total: pedido.total,
//       comprador: comprador.name,
//     },
//   });
//
// Repare que não tem `await` bloqueando a resposta ao usuário em nenhum ponto
// crítico: se o envio demorar, use fila ou dispare sem esperar. O que não pode
// é o comprador ver erro de checkout porque o e-mail do vendedor falhou.

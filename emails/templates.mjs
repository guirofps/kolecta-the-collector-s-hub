// ── E-mails transacionais da Kolecta ──────────────────────────────────────
//
// Cada função recebe dados e devolve { assunto, html, texto }. Quem dispara é
// o backend: ele monta o objeto, checa a preferência do usuário e manda.
//
// Node puro, sem dependência. O backend importa esta pasta e usa direto.
//
// As chaves em `prefKey` são exatamente as que já existem na tela de
// Notificações do painel do vendedor (src/pages/seller/Settings.tsx). Antes de
// enviar qualquer e-mail marcado com prefKey, o backend precisa conferir se o
// vendedor deixou aquele aviso ligado.
//
// Os marcados como `essencial: true` não têm opção de desligar: são recibo de
// transação, não comunicação de marketing. Ninguém deveria conseguir desativar
// o aviso de que o pedido dele foi enviado.

import {
  COR, SITE, esc, moeda, primeiroNome,
  render, renderTexto, caixaDados, caixaLista, alerta,
} from './layout.mjs';

const url = (caminho) => `${SITE}${caminho}`;

// ── Cadastro ──────────────────────────────────────────────────────────────

export function boasVindas({ nome }) {
  const n = primeiroNome(nome);
  const titulo = `Bem-vindo à Kolecta, ${n}`;
  const paragrafos = [
    `Sua conta está criada. A Kolecta é o point de quem coleciona: miniaturas, cards, action figures, Funko e mangá, com compra direta e leilão no mesmo lugar.`,
    `Você já pode montar sua vitrine. Todo mundo na Kolecta pode vender, não existe cadastro separado de vendedor.`,
  ];
  const blocos = caixaLista({
    titulo: 'Por onde começar',
    itens: [
      `Publique seu primeiro anúncio, leva menos de 3 minutos`,
      `Cadastre seu endereço para o frete sair calculado certo`,
      `Configure seus dados de recebimento para poder sacar`,
    ],
  });
  const cta = { href: url('/painel/anuncios/novo'), rotulo: 'Publicar meu primeiro anúncio' };

  return {
    assunto: titulo,
    html: render({
      preheader: 'Sua conta está pronta. Veja por onde começar.',
      tag: 'Boas-vindas', titulo, paragrafos, blocos, cta,
    }),
    texto: renderTexto({
      titulo, paragrafos,
      linhas: ['Por onde começar:', '- Publique seu primeiro anúncio',
        '- Cadastre seu endereço', '- Configure seus dados de recebimento'],
      cta,
    }),
  };
}
boasVindas.essencial = true;

// ── Moderação de anúncio ──────────────────────────────────────────────────

export function anuncioAprovado({ nome, tituloAnuncio, anuncioId }) {
  const n = primeiroNome(nome);
  const titulo = `Seu anúncio foi aprovado`;
  const paragrafos = [
    `${esc(n)}, o anúncio <strong style="color:${COR.gold};">${esc(tituloAnuncio)}</strong> passou pela moderação e já está visível para todo mundo na Kolecta.`,
    `A partir de agora ele aparece na busca, na categoria e no seu perfil de vendedor.`,
  ];
  const cta = { href: url(`/produto/${anuncioId}`), rotulo: 'Ver meu anúncio no ar' };

  return {
    assunto: `${tituloAnuncio} foi aprovado`,
    html: render({
      preheader: `${tituloAnuncio} já está visível na Kolecta.`,
      tag: 'Anúncio aprovado', titulo, paragrafos, cta,
      legendaCta: 'Dica: anúncio com 3 fotos ou mais vende bem mais rápido.',
    }),
    texto: renderTexto({ titulo, paragrafos, cta }),
  };
}
anuncioAprovado.prefKey = 'listingReview';

export function anuncioRejeitado({ nome, tituloAnuncio, anuncioId, motivo }) {
  const n = primeiroNome(nome);
  const titulo = `Seu anúncio precisa de ajuste`;
  const paragrafos = [
    `${esc(n)}, o anúncio <strong>${esc(tituloAnuncio)}</strong> não passou na moderação desta vez.`,
    `Isso não é bloqueio de conta nem advertência. É só um ajuste no anúncio, e depois de corrigir ele volta para a fila normalmente.`,
  ];
  const blocos = motivo
    ? alerta(`<strong style="color:${COR.vermelho};">Motivo:</strong> ${esc(motivo)}`, { cor: COR.vermelho })
    : '';
  const cta = { href: url(`/painel/anuncios/${anuncioId}/editar`), rotulo: 'Corrigir e reenviar' };

  return {
    assunto: `${tituloAnuncio} precisa de ajuste`,
    html: render({
      preheader: motivo || 'Ajuste o anúncio e reenvie para a moderação.',
      tag: 'Ajuste necessário', titulo, paragrafos, blocos, cta,
    }),
    texto: renderTexto({
      titulo, paragrafos, linhas: motivo ? [`Motivo: ${motivo}`] : [], cta,
    }),
  };
}
anuncioRejeitado.prefKey = 'listingReview';

// ── Pedidos ───────────────────────────────────────────────────────────────

export function novoPedidoVendedor({ nome, pedidoId, itens = [], total, comprador, prazoEnvioDias = 2 }) {
  const n = primeiroNome(nome);
  const titulo = `Você vendeu`;
  const paragrafos = [
    `${esc(n)}, saiu venda. O pagamento já foi confirmado, então pode separar e postar com tranquilidade.`,
  ];
  const blocos = caixaDados({
    titulo: `Pedido ${pedidoId}`,
    linhas: [
      ...itens.map((i) => [i.titulo, moeda(i.preco)]),
      ['Comprador', comprador ?? 'Ver no painel'],
    ],
    destaque: ['Total do pedido', moeda(total)],
  }) + `<div style="height:14px;"></div>` + alerta(
    `Você tem <strong style="color:${COR.gold};">${prazoEnvioDias} dias úteis</strong> para postar. Gere a etiqueta pelo painel e o rastreio entra sozinho no pedido.`
  );
  const cta = { href: url(`/painel/pedidos/${pedidoId}`), rotulo: 'Ver pedido e gerar etiqueta' };

  return {
    assunto: `Você vendeu: pedido ${pedidoId}`,
    html: render({
      preheader: `Pagamento confirmado. Poste em até ${prazoEnvioDias} dias úteis.`,
      tag: 'Nova venda', titulo, paragrafos, blocos, cta,
    }),
    texto: renderTexto({
      titulo, paragrafos,
      linhas: [`Pedido ${pedidoId}`, ...itens.map((i) => `- ${i.titulo}: ${moeda(i.preco)}`),
        `Total: ${moeda(total)}`, `Prazo de postagem: ${prazoEnvioDias} dias úteis`],
      cta,
    }),
  };
}
novoPedidoVendedor.prefKey = 'newOrder';

export function pedidoConfirmado({ nome, pedidoId, itens = [], total, vendedor }) {
  const n = primeiroNome(nome);
  const titulo = `Pedido confirmado`;
  const paragrafos = [
    `${esc(n)}, recebemos seu pagamento. Avisamos o vendedor e ele já está preparando o envio.`,
    `Assim que ele postar, você recebe o código de rastreio por aqui.`,
  ];
  const blocos = caixaDados({
    titulo: `Pedido ${pedidoId}`,
    linhas: [
      ...itens.map((i) => [i.titulo, moeda(i.preco)]),
      ['Vendedor', vendedor ?? 'Kolecta'],
    ],
    destaque: ['Total pago', moeda(total)],
  });
  const cta = { href: url(`/conta/pedidos/${pedidoId}`), rotulo: 'Acompanhar meu pedido' };

  return {
    assunto: `Pedido ${pedidoId} confirmado`,
    html: render({
      preheader: 'Pagamento aprovado. O vendedor já foi avisado.',
      tag: 'Pedido confirmado', titulo, paragrafos, blocos, cta,
      legendaCta: 'Seu dinheiro só é repassado ao vendedor depois que você confirmar que recebeu.',
    }),
    texto: renderTexto({
      titulo, paragrafos,
      linhas: [`Pedido ${pedidoId}`, ...itens.map((i) => `- ${i.titulo}: ${moeda(i.preco)}`),
        `Total: ${moeda(total)}`],
      cta,
    }),
  };
}
pedidoConfirmado.essencial = true;

export function pedidoEnviado({ nome, pedidoId, transportadora, rastreio, urlRastreio }) {
  const n = primeiroNome(nome);
  const titulo = `Seu pedido saiu para entrega`;
  const paragrafos = [
    `${esc(n)}, o vendedor postou seu pedido. Agora é com a transportadora.`,
  ];
  const blocos = caixaDados({
    titulo: `Pedido ${pedidoId}`,
    linhas: [
      ['Transportadora', transportadora ?? 'Correios'],
      ['Código de rastreio', rastreio ?? 'Disponível em breve'],
    ],
  });
  const cta = urlRastreio
    ? { href: urlRastreio, rotulo: 'Rastrear entrega' }
    : { href: url(`/conta/pedidos/${pedidoId}`), rotulo: 'Ver meu pedido' };

  return {
    assunto: `Seu pedido ${pedidoId} foi enviado`,
    html: render({
      preheader: `Código de rastreio: ${rastreio ?? 'em breve'}`,
      tag: 'A caminho', titulo, paragrafos, blocos, cta,
      legendaCta: 'Quando chegar, confirme o recebimento no painel para liberar o pagamento ao vendedor.',
    }),
    texto: renderTexto({
      titulo, paragrafos,
      linhas: [`Pedido ${pedidoId}`, `Transportadora: ${transportadora ?? 'Correios'}`,
        `Rastreio: ${rastreio ?? 'em breve'}`],
      cta,
    }),
  };
}
pedidoEnviado.essencial = true;

// ── Modo lance ────────────────────────────────────────────────────────────

export function lanceRecebido({ nome, tituloAnuncio, leilaoId, valorLance, totalLances }) {
  const n = primeiroNome(nome);
  const titulo = `Novo lance no seu leilão`;
  const paragrafos = [
    `${esc(n)}, alguém deu lance em <strong>${esc(tituloAnuncio)}</strong>.`,
  ];
  const blocos = caixaDados({
    titulo: 'Situação agora',
    linhas: [['Lances recebidos', String(totalLances ?? 1)]],
    destaque: ['Lance atual', moeda(valorLance)],
  });
  const cta = { href: url(`/modo-lance/${leilaoId}`), rotulo: 'Acompanhar o leilão' };

  return {
    assunto: `Lance de ${moeda(valorLance)} em ${tituloAnuncio}`,
    html: render({
      preheader: `Lance atual: ${moeda(valorLance)}`,
      tag: 'Modo lance', titulo, paragrafos, blocos, cta,
    }),
    texto: renderTexto({
      titulo, paragrafos,
      linhas: [`Lance atual: ${moeda(valorLance)}`, `Lances recebidos: ${totalLances ?? 1}`],
      cta,
    }),
  };
}
lanceRecebido.prefKey = 'newBid';

export function lanceSuperado({ nome, tituloAnuncio, leilaoId, seuLance, lanceAtual, terminaEm }) {
  const n = primeiroNome(nome);
  const titulo = `Cobriram o seu lance`;
  const paragrafos = [
    `${esc(n)}, alguém deu um lance maior em <strong>${esc(tituloAnuncio)}</strong>. Se ainda quiser a peça, dá tempo de voltar.`,
  ];
  const blocos = caixaDados({
    linhas: [['Seu lance', moeda(seuLance)]],
    destaque: ['Lance atual', moeda(lanceAtual)],
  }) + (terminaEm ? `<div style="height:14px;"></div>` + alerta(
    `O leilão encerra em <strong style="color:${COR.gold};">${esc(terminaEm)}</strong>.`) : '');
  const cta = { href: url(`/modo-lance/${leilaoId}`), rotulo: 'Dar um novo lance' };

  return {
    assunto: `Cobriram seu lance em ${tituloAnuncio}`,
    html: render({
      preheader: `Lance atual: ${moeda(lanceAtual)}. Ainda dá tempo.`,
      tag: 'Modo lance', titulo, paragrafos, blocos, cta,
    }),
    texto: renderTexto({
      titulo, paragrafos,
      linhas: [`Seu lance: ${moeda(seuLance)}`, `Lance atual: ${moeda(lanceAtual)}`],
      cta,
    }),
  };
}
lanceSuperado.prefKey = 'newBid';

export function leilaoVencido({ nome, tituloAnuncio, pedidoId, valorFinal, prazoPagamentoHoras = 48 }) {
  const n = primeiroNome(nome);
  const titulo = `Você arrematou`;
  const paragrafos = [
    `${esc(n)}, o leilão de <strong style="color:${COR.gold};">${esc(tituloAnuncio)}</strong> encerrou e o lance vencedor foi o seu.`,
  ];
  const blocos = caixaDados({
    linhas: [['Item', tituloAnuncio]],
    destaque: ['Valor final', moeda(valorFinal)],
  }) + `<div style="height:14px;"></div>` + alerta(
    `Pague em até <strong style="color:${COR.gold};">${prazoPagamentoHoras} horas</strong>. Passado o prazo, a peça volta para o vendedor.`
  );
  const cta = { href: url(`/checkout?pedido=${pedidoId}`), rotulo: 'Pagar agora' };

  return {
    assunto: `Você arrematou ${tituloAnuncio}`,
    html: render({
      preheader: `Lance vencedor: ${moeda(valorFinal)}. Pague em até ${prazoPagamentoHoras}h.`,
      tag: 'Arremate', titulo, paragrafos, blocos, cta,
    }),
    texto: renderTexto({
      titulo, paragrafos,
      linhas: [`Valor final: ${moeda(valorFinal)}`, `Prazo de pagamento: ${prazoPagamentoHoras} horas`],
      cta,
    }),
  };
}
leilaoVencido.essencial = true;

// ── Conversas ─────────────────────────────────────────────────────────────

export function mensagemRecebida({ nome, deQuem, trecho, conversaId, tituloAnuncio }) {
  const n = primeiroNome(nome);
  const titulo = `Nova mensagem`;
  const paragrafos = [
    `${esc(n)}, <strong>${esc(deQuem)}</strong> te mandou uma mensagem${tituloAnuncio ? ` sobre <strong>${esc(tituloAnuncio)}</strong>` : ''}.`,
  ];
  const blocos = alerta(`<em style="color:${COR.fraco};">"${esc(trecho)}"</em>`);
  const cta = { href: url(`/conta/mensagens/${conversaId}`), rotulo: 'Responder' };

  return {
    assunto: `${deQuem} te mandou uma mensagem`,
    html: render({
      preheader: trecho,
      tag: 'Mensagem', titulo, paragrafos, blocos, cta,
      legendaCta: 'Responder rápido melhora sua reputação de vendedor.',
    }),
    texto: renderTexto({ titulo, paragrafos, linhas: [`"${trecho}"`], cta }),
  };
}
mensagemRecebida.prefKey = 'buyerMessage';

// ── Dinheiro ──────────────────────────────────────────────────────────────

export function repasseRealizado({ nome, valor, pedidoId, previsaoDias = 1 }) {
  const n = primeiroNome(nome);
  const titulo = `Repasse a caminho`;
  const paragrafos = [
    `${esc(n)}, liberamos o repasse do pedido ${esc(String(pedidoId))}. O dinheiro cai na sua conta em até ${previsaoDias} dia útil.`,
  ];
  const blocos = caixaDados({
    linhas: [['Pedido', String(pedidoId)]],
    destaque: ['Valor repassado', moeda(valor)],
  });
  const cta = { href: url('/painel/financeiro'), rotulo: 'Ver meu financeiro' };

  return {
    assunto: `Repasse de ${moeda(valor)} liberado`,
    html: render({
      preheader: `${moeda(valor)} a caminho da sua conta.`,
      tag: 'Financeiro', titulo, paragrafos, blocos, cta,
    }),
    texto: renderTexto({
      titulo, paragrafos, linhas: [`Valor: ${moeda(valor)}`, `Pedido: ${pedidoId}`], cta,
    }),
  };
}
repasseRealizado.prefKey = 'transferDone';

// ── Disputa ───────────────────────────────────────────────────────────────

export function disputaAberta({ nome, pedidoId, disputaId, prazoRespostaDias = 3 }) {
  const n = primeiroNome(nome);
  const titulo = `Abriram uma disputa`;
  const paragrafos = [
    `${esc(n)}, o comprador abriu uma disputa no pedido ${esc(String(pedidoId))}. O repasse fica retido até isso ser resolvido.`,
    `Responda com sua versão e anexe o que tiver: comprovante de postagem, fotos da peça antes do envio, conversa com o comprador.`,
  ];
  const blocos = alerta(
    `Você tem <strong style="color:${COR.gold};">${prazoRespostaDias} dias</strong> para responder. Sem resposta, a disputa é decidida com o que estiver nos autos.`,
    { cor: COR.vermelho }
  );
  const cta = { href: url(`/painel/disputas/${disputaId}`), rotulo: 'Responder à disputa' };

  return {
    assunto: `Disputa aberta no pedido ${pedidoId}`,
    html: render({
      preheader: `Responda em até ${prazoRespostaDias} dias.`,
      tag: 'Disputa', titulo, paragrafos, blocos, cta,
    }),
    texto: renderTexto({
      titulo, paragrafos, linhas: [`Prazo de resposta: ${prazoRespostaDias} dias`], cta,
    }),
  };
}
disputaAberta.prefKey = 'disputeOpened';

// ── Índice ────────────────────────────────────────────────────────────────
// Mapa para o backend achar o template pelo nome do evento, sem if encadeado.

export const TEMPLATES = {
  boasVindas,
  anuncioAprovado,
  anuncioRejeitado,
  novoPedidoVendedor,
  pedidoConfirmado,
  pedidoEnviado,
  lanceRecebido,
  lanceSuperado,
  leilaoVencido,
  mensagemRecebida,
  repasseRealizado,
  disputaAberta,
};

/**
 * O usuário quer receber este e-mail?
 * Essencial passa sempre. O resto respeita a tela de Notificações.
 * Preferência ausente conta como ligada: quem nunca abriu a tela precisa ser
 * avisado da venda, senão perde pedido sem saber.
 */
export function devoEnviar(nomeTemplate, notificationPrefs) {
  const tpl = TEMPLATES[nomeTemplate];
  if (!tpl) throw new Error(`Template desconhecido: ${nomeTemplate}`);
  if (tpl.essencial) return true;
  if (!tpl.prefKey) return true;
  return notificationPrefs?.[tpl.prefKey]?.email ?? true;
}

// ── Layout base dos e-mails da Kolecta ────────────────────────────────────
//
// Este arquivo não depende de React, Vite ou de nada do frontend. É Node puro
// de propósito: o backend vai importar daqui para disparar os transacionais,
// e um arquivo sem dependência é um arquivo que copia e funciona.
//
// HTML de e-mail não é HTML de site. Nada de flexbox, grid, <style> externo ou
// classe CSS: Gmail, Outlook e Apple Mail descartam boa parte disso. Tudo aqui
// é tabela aninhada com estilo inline, largura travada em 600px, que é o que
// renderiza igual em todo lugar.

export const COR = {
  gold: '#FFD700',
  dark: '#101218',      // kolecta-dark
  carbon: '#15171E',    // kolecta-carbon
  borda: '#2A2D38',
  texto: '#E8E9ED',
  fraco: '#9A9DA8',
  apagado: '#6A6E7C',
  verde: '#4ADE80',
  vermelho: '#F87171',
};

export const SITE = 'https://kolecta.com.br';
export const LOGO = `${SITE}/emails/kolecta-logo.png`;
const FONTE = 'Arial,Helvetica,sans-serif';

/** Escapa o que vier do banco antes de entrar no HTML. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Formata centavos ou reais em BRL. Passe `centavos: true` quando for inteiro. */
export function moeda(valor, { centavos = false } = {}) {
  const n = centavos ? Number(valor) / 100 : Number(valor);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Primeiro nome, com a capitalização arrumada.
 * O banco tem de tudo: "FERNANDO NASCIMENTO", "wilbur da silva" e nomes de loja
 * como "StopGames". Só mexemos quando está todo em maiúscula ou todo em
 * minúscula; se tem maiúscula no meio, é grafia da marca e fica como está.
 */
export function primeiroNome(nome) {
  const bruto = String(nome ?? '').trim().split(/\s+/)[0] || 'colecionador';
  const precisaAjuste = bruto === bruto.toUpperCase() || bruto === bruto.toLowerCase();
  if (!precisaAjuste) return bruto;
  return bruto.charAt(0).toUpperCase() + bruto.slice(1).toLowerCase();
}

// ── Peças ─────────────────────────────────────────────────────────────────

/** Botão. Vai em tabela porque o Outlook ignora padding em <a>. */
export function botao(href, rotulo, { cor = COR.gold, corTexto = COR.dark } = {}) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" bgcolor="${cor}" style="border-radius:8px;">
        <a href="${esc(href)}" target="_blank"
           style="display:inline-block;padding:16px 34px;font-family:${FONTE};
                  font-size:16px;font-weight:bold;color:${corTexto};text-decoration:none;
                  border-radius:8px;letter-spacing:0.3px;">${esc(rotulo)}</a>
      </td>
    </tr>
  </table>`;
}

/** Item de lista com o check dourado. Aceita HTML no texto. */
function itemLista(html) {
  return `
  <tr>
    <td width="26" valign="top" style="padding:0 0 12px 0;font-family:${FONTE};
        font-size:15px;line-height:22px;color:${COR.gold};">&#10003;</td>
    <td valign="top" style="padding:0 0 12px 0;font-family:${FONTE};
        font-size:15px;line-height:22px;color:${COR.texto};">${html}</td>
  </tr>`;
}

/** Caixa escura com título e lista de checks. */
export function caixaLista({ titulo, itens }) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${COR.dark};border:1px solid ${COR.borda};border-radius:10px;">
    <tr>
      <td style="padding:22px 22px 10px 22px;">
        ${titulo ? `<p style="margin:0 0 16px 0;font-family:${FONTE};font-size:12px;font-weight:bold;
                     letter-spacing:1.5px;text-transform:uppercase;color:${COR.fraco};">${esc(titulo)}</p>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itens.map(itemLista).join('')}
        </table>
      </td>
    </tr>
  </table>`;
}

/** Caixa de dados em duas colunas, tipo resumo de pedido. */
export function caixaDados({ titulo, linhas, destaque }) {
  const corpo = linhas.map(([rotulo, valor]) => `
    <tr>
      <td style="padding:0 0 10px 0;font-family:${FONTE};font-size:14px;line-height:20px;
                 color:${COR.fraco};">${esc(rotulo)}</td>
      <td align="right" style="padding:0 0 10px 0;font-family:${FONTE};font-size:14px;
                 line-height:20px;color:${COR.texto};">${esc(valor)}</td>
    </tr>`).join('');

  const rodape = destaque ? `
    <tr>
      <td style="padding:14px 0 0 0;border-top:1px solid ${COR.borda};font-family:${FONTE};
                 font-size:15px;font-weight:bold;color:${COR.texto};">${esc(destaque[0])}</td>
      <td align="right" style="padding:14px 0 0 0;border-top:1px solid ${COR.borda};
                 font-family:${FONTE};font-size:18px;font-weight:bold;color:${COR.gold};">${esc(destaque[1])}</td>
    </tr>` : '';

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${COR.dark};border:1px solid ${COR.borda};border-radius:10px;">
    <tr>
      <td style="padding:22px;">
        ${titulo ? `<p style="margin:0 0 16px 0;font-family:${FONTE};font-size:12px;font-weight:bold;
                     letter-spacing:1.5px;text-transform:uppercase;color:${COR.fraco};">${esc(titulo)}</p>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${corpo}${rodape}
        </table>
      </td>
    </tr>
  </table>`;
}

/** Aviso destacado, para prazo curto ou algo que exige ação. */
export function alerta(texto, { cor = COR.gold } = {}) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${COR.dark};border-left:3px solid ${cor};border-radius:6px;">
    <tr>
      <td style="padding:16px 18px;font-family:${FONTE};font-size:14px;line-height:21px;
                 color:${COR.texto};">${texto}</td>
    </tr>
  </table>`;
}

// ── Casca ─────────────────────────────────────────────────────────────────

/**
 * Monta o e-mail inteiro.
 *
 * @param {object} p
 * @param {string} p.preheader   trecho que aparece na lista antes de abrir
 * @param {string} p.tag         rótulo pequeno em dourado acima do título
 * @param {string} p.titulo      o H1
 * @param {string[]} p.paragrafos  aceitam HTML inline (strong, a)
 * @param {string} [p.blocos]    HTML extra: caixaDados, caixaLista, alerta
 * @param {{href:string,rotulo:string}} [p.cta]
 * @param {string} [p.legendaCta]
 * @param {string} [p.rodapeMotivo] por que a pessoa está recebendo isto
 */
export function render({
  preheader, tag, titulo, paragrafos = [], blocos = '',
  cta, legendaCta, rodapeMotivo,
}) {
  const motivo = rodapeMotivo
    ?? `Você recebeu este e-mail porque tem uma conta em <a href="${SITE}" style="color:${COR.fraco};text-decoration:underline;">kolecta.com.br</a>.`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COR.dark};">

<div style="display:none;font-size:1px;color:${COR.dark};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COR.dark};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="width:100%;max-width:600px;">

        <!-- Logo. O alt vai estilizado porque muitos clientes bloqueiam imagem
             por padrão: se a arte não carregar, ainda aparece KOLECTA em dourado
             no lugar de um ícone quebrado. -->
        <tr>
          <td align="center" style="padding:0 0 28px 0;">
            <a href="${SITE}" target="_blank" style="text-decoration:none;">
              <img src="${LOGO}" width="180" height="31" alt="KOLECTA"
                   style="display:block;width:180px;max-width:60%;height:auto;border:0;
                          font-family:${FONTE};font-size:26px;font-weight:bold;
                          letter-spacing:2px;color:${COR.gold};text-decoration:none;">
            </a>
          </td>
        </tr>

        <tr>
          <td style="background-color:${COR.carbon};border:1px solid ${COR.borda};border-radius:14px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:4px;line-height:4px;font-size:0;background-color:${COR.gold};
                             border-radius:14px 14px 0 0;">&nbsp;</td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:36px 32px 8px 32px;">
                  ${tag ? `<p style="margin:0 0 10px 0;font-family:${FONTE};font-size:12px;font-weight:bold;
                            letter-spacing:2px;text-transform:uppercase;color:${COR.gold};">${esc(tag)}</p>` : ''}
                  <h1 style="margin:0 0 20px 0;font-family:${FONTE};font-size:28px;line-height:34px;
                             font-weight:bold;color:#FFFFFF;">${esc(titulo)}</h1>
                  ${paragrafos.map((p) => `
                  <p style="margin:0 0 18px 0;font-family:${FONTE};font-size:16px;line-height:25px;
                            color:${COR.texto};">${p}</p>`).join('')}
                </td>
              </tr>

              ${blocos ? `<tr><td style="padding:10px 32px 0 32px;">${blocos}</td></tr>` : ''}

              ${cta ? `
              <tr>
                <td align="center" style="padding:32px 32px ${legendaCta ? '10px' : '36px'} 32px;">
                  ${botao(cta.href, cta.rotulo)}
                </td>
              </tr>` : ''}

              ${legendaCta ? `
              <tr>
                <td align="center" style="padding:0 32px 36px 32px;">
                  <p style="margin:0;font-family:${FONTE};font-size:13px;line-height:20px;
                            color:${COR.fraco};">${legendaCta}</p>
                </td>
              </tr>` : ''}

              ${!cta && !blocos ? '<tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>' : ''}
              ${blocos && !cta ? '<tr><td style="height:36px;font-size:0;line-height:0;">&nbsp;</td></tr>' : ''}
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:26px 16px 0 16px;">
            <p style="margin:0 0 8px 0;font-family:${FONTE};font-size:13px;line-height:20px;color:${COR.fraco};">
              Kolecta, o hub dos colecionadores.
            </p>
            <p style="margin:0;font-family:${FONTE};font-size:12px;line-height:18px;color:${COR.apagado};">
              ${motivo}<br>
              Para ajustar o que você recebe, vá em
              <a href="${SITE}/painel/configuracoes" style="color:${COR.fraco};text-decoration:underline;">preferências de notificação</a>.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Versão em texto puro. Não é opcional: e-mail só com HTML perde ponto nos
 * filtros de spam e quebra em quem lê por leitor de tela.
 */
export function renderTexto({ titulo, paragrafos = [], linhas = [], cta, rodape = true }) {
  const limpo = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const partes = [titulo, '', ...paragrafos.map(limpo)];
  if (linhas.length) partes.push('', ...linhas);
  if (cta) partes.push('', `${cta.rotulo}:`, cta.href);
  if (rodape) {
    partes.push('', 'Kolecta, o hub dos colecionadores.', SITE, '',
      `Para ajustar o que você recebe: ${SITE}/painel/configuracoes`);
  }
  return partes.join('\n');
}

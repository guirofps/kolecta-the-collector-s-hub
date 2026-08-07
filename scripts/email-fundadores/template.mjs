// ── Template do e-mail de Membro Fundador ─────────────────────────────────
// HTML de e-mail não é HTML de site: nada de flexbox, grid ou <style> externo.
// Tudo em tabela aninhada com estilo inline, que é o que Gmail, Outlook e
// Apple Mail renderizam igual. Largura travada em 600px, que é o padrão que
// cabe no preview de qualquer cliente.

const GOLD = '#FFD700';
const DARK = '#101218';       // kolecta-dark
const CARBON = '#15171E';     // kolecta-carbon
const BORDA = '#2A2D38';
const TEXTO = '#E8E9ED';
const TEXTO_FRACO = '#9A9DA8';

const SITE = 'https://kolecta.com.br';
const LOGO = `${SITE}/emails/kolecta-logo.png`;

/** Escapa o que vier do banco antes de entrar no HTML. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

/** Link do WhatsApp com mensagem já preenchida. */
export function linkWhatsapp(numero, nome, contexto) {
  const texto =
    contexto === 'quase-la'
      ? `Oi! Sou ${nome} e quero falar sobre o Membro Fundador da Kolecta.`
      : `Oi! Sou ${nome} e recebi o e-mail da pré-seleção de Membro Fundador da Kolecta.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function botao(href, rotulo) {
  // Botão em tabela porque o Outlook ignora padding em <a>.
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" bgcolor="${GOLD}" style="border-radius:8px;">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;
                  font-size:16px;font-weight:bold;color:#101218;text-decoration:none;
                  border-radius:8px;letter-spacing:0.3px;">${rotulo}</a>
      </td>
    </tr>
  </table>`;
}

function item(texto) {
  return `
  <tr>
    <td width="26" valign="top" style="padding:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;
        font-size:15px;line-height:22px;color:${GOLD};">&#10003;</td>
    <td valign="top" style="padding:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;
        font-size:15px;line-height:22px;color:${TEXTO};">${texto}</td>
  </tr>`;
}

/**
 * Monta o e-mail.
 * @param {object} p
 * @param {string} p.nome        primeiro nome de quem recebe
 * @param {number} p.anuncios    quantos anúncios a pessoa já publicou
 * @param {string} p.whatsapp    URL completa do wa.me
 * @param {'preselecionado'|'quase-la'|'comece'} p.tipo
 * @param {number} p.faltam      só para 'quase-la': quantos anúncios faltam
 *
 * O tipo 'comece' é para quem tem de 0 a 2 anúncios. Não cita número: o texto
 * de "faltam 4" soa como cobrança para quem mal começou, e a contagem varia
 * demais nesse grupo. Fala em "poucos anúncios" e trata a pessoa como lojista
 * em potencial, que é o que ela é.
 */
export function montarEmail({ nome, anuncios, whatsapp, tipo, faltam = 0 }) {
  const preSelecionado = tipo === 'preselecionado';
  const comecando = tipo === 'comece';
  const n = esc(nome);

  const preheader = preSelecionado
    ? `A Kolecta já está no ar e ainda há vagas de Membro Fundador. Fale com a gente.`
    : comecando
      ? `Faltam poucos anúncios para você concorrer a Membro Fundador da Kolecta.`
      : `Falta${faltam === 1 ? ' só 1 anúncio' : `m ${faltam} anúncios`} para você concorrer a Membro Fundador.`;

  const titulo = preSelecionado
    ? `${n}, ainda dá tempo de ser Fundador`
    : comecando
      ? `${n}, falta pouco para você concorrer`
      : `${n}, falta pouco`;

  const abertura = preSelecionado
    ? `A Kolecta <strong>já está no ar</strong>. Você publicou <strong style="color:${GOLD};">${anuncios} anúncio${anuncios > 1 ? 's' : ''}</strong> e está entre os candidatos aos <strong>100 Membros Fundadores</strong>. Já são mais de 20 selos concedidos, e ainda há vagas.`
    : comecando
      ? `Você criou sua conta na Kolecta e agora <strong>faltam poucos anúncios</strong> para entrar na
         pré-seleção dos <strong>100 Membros Fundadores</strong> da plataforma. São
         <strong style="color:${GOLD};">5 anúncios publicados</strong>, e quem chega lá concorre.`
      : `Você já publicou <strong style="color:${GOLD};">${anuncios} anúncio${anuncios > 1 ? 's' : ''}</strong> na Kolecta. Falta${faltam === 1 ? ' <strong style="color:' + GOLD + ';">apenas 1</strong>' : `m <strong style="color:${GOLD};">${faltam}</strong>`} para você entrar na pré-seleção dos 100 Membros Fundadores.`;

  const recado = preSelecionado
    ? `São 100 lugares e a escolha é nossa, caso a caso, com prioridade para quem vende de verdade.
       <strong style="color:${TEXTO};">Se você já recebeu seu selo de Fundador, pode desconsiderar este e-mail.</strong>
       Se ainda não, fale com a gente pelo WhatsApp para garantir o seu antes das vagas acabarem.`
    : comecando
      ? `Se você é lojista ou vende colecionável com alguma frequência, essa é a hora: o Fundador
         paga menos comissão nos primeiros 6 meses, tem selo no perfil e destaque na vitrine. Não
         importa o que aconteceu com os anúncios que você já criou, o que conta é chegar aos cinco.`
      : `Assim que o quinto anúncio entrar, você entra na disputa pelo selo de Fundador. A Kolecta
         <strong style="color:${TEXTO};">já está no ar</strong> e ainda há vagas.`;

  // Sem número configurado o botão sairia morto. Deixamos isso gritante no
  // preview em vez de gerar um e-mail que não leva a lugar nenhum.
  const cta = preSelecionado
    ? botao(whatsapp ? esc(whatsapp) : '#FALTA-CONFIGURAR-WHATSAPP',
            whatsapp ? 'Falar com a Kolecta no WhatsApp' : 'FALTA CONFIGURAR O WHATSAPP')
    : botao(`${SITE}/painel/anuncios/novo`, comecando ? 'Publicar meu anúncio' : 'Publicar meu próximo anúncio');

  const legendaCta = preSelecionado
    ? `Fale com a gente pelo WhatsApp. Quem conversa sai na frente na escolha.`
    : `Leva menos de 3 minutos por anúncio.`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:${DARK};">

<!-- Preheader: o trecho que aparece na lista de e-mails, antes de abrir. -->
<div style="display:none;font-size:1px;color:${DARK};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:${DARK};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="width:100%;max-width:600px;">

        <!-- Logo. O alt vai estilizado porque muitos clientes bloqueiam imagem
             por padrão: se a arte não carregar, ainda aparece KOLECTA em dourado
             no lugar de um ícone quebrado. -->
        <tr>
          <td align="center" style="padding:0 0 28px 0;">
            <img src="${LOGO}" width="180" height="31" alt="KOLECTA"
                 style="display:block;width:180px;max-width:60%;height:auto;border:0;
                        font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;
                        letter-spacing:2px;color:${GOLD};text-decoration:none;">
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background-color:${CARBON};border:1px solid ${BORDA};border-radius:14px;">

            <!-- Faixa dourada -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:4px;line-height:4px;font-size:0;background-color:${GOLD};
                             border-radius:14px 14px 0 0;">&nbsp;</td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:36px 32px 8px 32px;">

                  <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                            font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">
                    ${preSelecionado ? 'Membro Fundador' : 'Falta pouco'}
                  </p>

                  <h1 style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;
                             line-height:34px;font-weight:bold;color:#FFFFFF;">
                    ${esc(titulo)}
                  </h1>

                  <p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;
                            line-height:25px;color:${TEXTO};">
                    ${abertura}
                  </p>

                  <p style="margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;
                            line-height:25px;color:${TEXTO};">
                    ${recado}
                  </p>

                </td>
              </tr>

              <!-- Benefícios -->
              <tr>
                <td style="padding:0 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                         style="background-color:${DARK};border:1px solid ${BORDA};border-radius:10px;">
                    <tr>
                      <td style="padding:22px 22px 10px 22px;">
                        <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                                  font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${TEXTO_FRACO};">
                          O que o Fundador leva
                        </p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${item(`Comissão de <strong style="color:${GOLD};">9%</strong> em vez de 11%, pelos 6 primeiros meses`)}
                          ${item(`<strong style="color:${GOLD};">5 créditos</strong> de destaque para os seus anúncios`)}
                          ${item(`Selo de Fundador <strong style="color:${GOLD};">numerado</strong>, do #001 ao #100, no seu perfil para sempre`)}
                          ${item(`Canal direto com a equipe, sem fila de suporte`)}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td align="center" style="padding:32px 32px 10px 32px;">
                  ${cta}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:0 32px 36px 32px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                            line-height:20px;color:${TEXTO_FRACO};">
                    ${legendaCta}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td align="center" style="padding:26px 16px 0 16px;">
            <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                      line-height:20px;color:${TEXTO_FRACO};">
              Kolecta, o hub dos colecionadores.<br>
              Já estamos no ar em kolecta.com.br.
            </p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                      line-height:18px;color:#6A6E7C;">
              Você recebeu este e-mail porque criou uma conta em
              <a href="${SITE}" style="color:${TEXTO_FRACO};text-decoration:underline;">kolecta.com.br</a>.<br>
              Se não quiser mais receber, é só responder com "sair".
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

/** Versão em texto puro. Sem ela o e-mail perde ponto nos filtros de spam. */
export function montarTexto({ nome, anuncios, whatsapp, tipo, faltam = 0 }) {
  const preSelecionado = tipo === 'preselecionado';
  if (preSelecionado) {
    return `${nome}, ainda dá tempo de garantir seu selo de Membro Fundador da Kolecta.

A Kolecta já está no ar. Você publicou ${anuncios} anúncio${anuncios > 1 ? 's' : ''} e está entre os candidatos aos 100 Membros Fundadores. Já são mais de 20 selos concedidos, e ainda há vagas.

São 100 lugares e a escolha é nossa, caso a caso, com prioridade para quem vende de verdade. Se você já recebeu seu selo de Fundador, pode desconsiderar este e-mail. Se ainda não, fale com a gente pelo WhatsApp para garantir o seu.

O que o Fundador leva:
- Comissão de 9% em vez de 11%, pelos 6 primeiros meses
- 5 créditos de destaque para os seus anúncios
- Selo de Fundador numerado, do #001 ao #100, no perfil para sempre
- Canal direto com a equipe, sem fila de suporte

Fale com a gente no WhatsApp:
${whatsapp}

Kolecta, o hub dos colecionadores.
Já estamos no ar em kolecta.com.br.

Você recebeu este e-mail porque criou uma conta em kolecta.com.br.
Se não quiser mais receber, responda com "sair".`;
  }

  if (tipo === 'comece') {
    return `${nome}, falta pouco para você concorrer a Membro Fundador da Kolecta.

Você criou sua conta e agora faltam poucos anúncios para entrar na pré-seleção dos 100 Membros Fundadores. São 5 anúncios publicados, e quem chega lá concorre.

Se você é lojista ou vende colecionável com alguma frequência, essa é a hora: o Fundador paga menos comissão nos primeiros 6 meses, tem selo no perfil e destaque na vitrine. Não importa o que aconteceu com os anúncios que você já criou, o que conta é chegar aos cinco.

O que o Fundador leva:
- Comissão de 9% em vez de 11%, pelos 6 primeiros meses
- 5 créditos de destaque para os seus anúncios
- Selo de Fundador numerado, do #001 ao #100, no perfil para sempre
- Canal direto com a equipe, sem fila de suporte

Publicar meu anúncio:
https://kolecta.com.br/painel/anuncios/novo

Kolecta, o hub dos colecionadores.
Já estamos no ar em kolecta.com.br.

Você recebeu este e-mail porque criou uma conta em kolecta.com.br.
Se não quiser mais receber, responda com "sair".`;
  }

  return `${nome}, falta pouco para você concorrer a Membro Fundador da Kolecta.

Você já publicou ${anuncios} anúncio${anuncios > 1 ? 's' : ''}. Falta${faltam === 1 ? ' apenas 1' : `m ${faltam}`} para entrar na pré-seleção dos 100 Membros Fundadores.

Assim que o quinto anúncio entrar, você entra na disputa pelo selo de Fundador. A Kolecta já está no ar e ainda há vagas.

O que o Fundador leva:
- Comissão de 9% em vez de 11%, pelos 6 primeiros meses
- 5 créditos de destaque para os seus anúncios
- Selo de Fundador numerado, do #001 ao #100, no perfil para sempre
- Canal direto com a equipe, sem fila de suporte

Publicar meu próximo anúncio:
https://kolecta.com.br/painel/anuncios/novo

Kolecta, o hub dos colecionadores.
Já estamos no ar em kolecta.com.br.

Você recebeu este e-mail porque criou uma conta em kolecta.com.br.
Se não quiser mais receber, responda com "sair".`;
}

export function assunto({ nome, tipo, faltam = 0 }) {
  if (tipo === 'preselecionado') return `${nome}, ainda dá tempo de garantir seu selo de Fundador`;
  // Sem número para quem mal começou: "faltam 5" no assunto lê como cobrança.
  if (tipo === 'comece') return `${nome}, falta pouco para você concorrer a Fundador`;
  return `${nome}, falta${faltam === 1 ? ' 1 anúncio' : `m ${faltam} anúncios`} para concorrer a Fundador`;
}

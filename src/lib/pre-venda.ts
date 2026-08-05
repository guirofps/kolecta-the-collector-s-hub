// ─── Pré-venda ───────────────────────────────────────────────────────────────
//
// Peça encomendada que ainda não chegou ao vendedor. Ele anuncia agora e
// entrega quando receber.
//
// É uma MARCAÇÃO num anúncio de venda direta comum, não um terceiro modo de
// anúncio. O comprador paga o valor cheio hoje, como em qualquer compra, e o
// escrow segura o dinheiro até a confirmação de entrega: ou seja, quem paga em
// agosto para receber em dezembro continua protegido pelo mesmo mecanismo de
// sempre.
//
// A alternativa avaliada era reservar por pré-autorização no cartão, como o
// Modo Lance. Foi descartada: a adquirente garante a retenção por ~5 dias
// (ver AUTH_VALIDITY_DAYS no backend), então uma pré-venda de 4 meses exigiria
// ~24 renovações seguidas no mesmo cartão. Isso é o padrão que antifraude trata
// como teste de cartão, e o limite do comprador ficaria bloqueado o período
// inteiro.
//
// Duas regras vieram fechadas do produto:
//
//  1. Data prevista é OBRIGATÓRIA e aparece no anúncio. Sem data escrita não
//     existe prazo a descumprir, e aí qualquer atraso vira problema da
//     plataforma. Com data, os três lados sabem o combinado.
//  2. Teto de 90 dias. Além disso não é pré-venda, é encomenda especulativa, e
//     a chance de a peça nunca chegar cresce demais.

/** Como a tag aparece no título. */
export const TAG_PRE_VENDA = '[PRÉ-VENDA]';

/** Distância máxima entre hoje e a data prometida. */
export const JANELA_MAXIMA_DIAS = 90;

// Reconhece a tag já escrita à mão pelo vendedor, em qualquer grafia vista:
// "PRE VENDA", "pré-venda", "[PRÉ VENDA]", com ou sem colchete, hífen ou acento.
// Sem isso o anúncio sairia "[PRÉ-VENDA] PRE-VENDA Skyline GT-R".
const TAG_NO_COMECO = /^\s*[[(]?\s*pr[eé]\s*[-–—]?\s*venda\s*[\])]?\s*[-–—:]?\s*/i;

/** O título já anuncia pré-venda, de qualquer jeito? */
export function temTagPreVenda(titulo: string | null | undefined): boolean {
  return TAG_NO_COMECO.test(titulo ?? '');
}

/** Tira a tag do começo, seja qual for a grafia. Título sem tag volta igual. */
export function removerTagPreVenda(titulo: string | null | undefined): string {
  return (titulo ?? '').replace(TAG_NO_COMECO, '').trim();
}

/**
 * Põe a tag no começo do título, sem duplicar.
 *
 * Idempotente de propósito: o wizard chama isso a cada tecla para mostrar a
 * prévia, e o vendedor pode ligar e desligar a pré-venda várias vezes antes de
 * publicar. Aplicar duas vezes tem que dar o mesmo resultado que aplicar uma.
 */
export function aplicarTagPreVenda(titulo: string | null | undefined): string {
  const limpo = removerTagPreVenda(titulo);
  if (!limpo) return '';
  return `${TAG_PRE_VENDA} ${limpo}`;
}

/**
 * Título final conforme a pré-venda está ligada ou não.
 * Desligar a pré-venda devolve o título limpo, sem sobra da tag.
 */
export function tituloComPreVenda(titulo: string | null | undefined, preVenda: boolean): string {
  return preVenda ? aplicarTagPreVenda(titulo) : removerTagPreVenda(titulo);
}

/**
 * Quanto sobra para o título depois da tag.
 *
 * O campo do wizard tem limite de 80 caracteres. A tag entra na hora de
 * publicar, então sem descontar aqui o vendedor escreve 80, a tag soma 12 e o
 * título publicado passa do limite.
 */
export function limiteTitulo(limiteTotal: number, preVenda: boolean): number {
  return preVenda ? Math.max(0, limiteTotal - (TAG_PRE_VENDA.length + 1)) : limiteTotal;
}

// ─── Data prevista ───────────────────────────────────────────────────────────

/**
 * Converte "2026-12-15" numa data LOCAL à meia-noite.
 *
 * `new Date('2026-12-15')` é interpretado como UTC, e em UTC-3 isso vira 21h do
 * dia 14: a data escolhida pelo vendedor aparece um dia mais cedo para ele e a
 * comparação com "hoje" erra na virada. Montar componente a componente resolve.
 */
function dataLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(ano, mes - 1, dia);
  // Rejeita data que não existe: "2026-02-31" viraria 3 de março silenciosamente.
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
    return null;
  }
  return d;
}

/** Zera a hora, para comparar dias sem o horário atrapalhar. */
function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const UM_DIA = 24 * 60 * 60 * 1000;

/** Quantos dias faltam para a data (negativo se já passou). */
export function diasAte(iso: string, hoje: Date = new Date()): number | null {
  const alvo = dataLocal(iso);
  if (!alvo) return null;
  return Math.round((alvo.getTime() - inicioDoDia(hoje).getTime()) / UM_DIA);
}

export interface ErroData {
  /** Mensagem pronta para o vendedor. */
  mensagem: string;
}

/**
 * Valida a data prometida. Devolve null quando está tudo certo.
 *
 * Aceita a data de HOJE: quem recebeu a remessa de manhã e vai despachar à
 * tarde ainda é pré-venda legítima, e recusar isso só empurraria o vendedor a
 * mentir a data.
 */
export function validarDataPrevista(
  iso: string | null | undefined,
  hoje: Date = new Date(),
): ErroData | null {
  const texto = (iso ?? '').trim();
  if (!texto) return { mensagem: 'Informe a data prevista de chegada.' };

  const dias = diasAte(texto, hoje);
  if (dias === null) return { mensagem: 'Data inválida.' };

  if (dias < 0) return { mensagem: 'A data prevista não pode estar no passado.' };
  if (dias > JANELA_MAXIMA_DIAS) {
    return {
      mensagem: `A data prevista não pode passar de ${JANELA_MAXIMA_DIAS} dias. Prazo maior que isso não é pré-venda, é encomenda.`,
    };
  }
  return null;
}

/** Maior data aceita, no formato do <input type="date">. Serve de `max`. */
export function dataMaximaPreVenda(hoje: Date = new Date()): string {
  const d = new Date(inicioDoDia(hoje).getTime() + JANELA_MAXIMA_DIAS * UM_DIA);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-12-15" vira "15/12/2026". Data inválida volta vazia, nunca "NaN". */
export function formatarDataPrevista(iso: string | null | undefined): string {
  const d = dataLocal((iso ?? '').trim());
  if (!d) return '';
  return d.toLocaleDateString('pt-BR');
}

// ─── Gravação e leitura no anúncio ───────────────────────────────────────────

export interface DadosPreVenda {
  preVenda: true;
  preVendaDataPrevista: string;
}

/** O bloco que vai para `attributes` do anúncio. */
export function dadosPreVenda(dataPrevista: string): DadosPreVenda {
  return { preVenda: true, preVendaDataPrevista: dataPrevista.trim() };
}

/** O anúncio é pré-venda? Lê `attributes` já parseado. */
export function ehPreVenda(attrs: Record<string, unknown> | null | undefined): boolean {
  // Aceita o booleano vindo como texto: `attributes` é JSON guardado como
  // string, e nem todo caminho de escrita preserva o tipo.
  return attrs?.preVenda === true || attrs?.preVenda === 'true';
}

/** Data prometida do anúncio, ou null quando não é pré-venda. */
export function dataPrevistaDe(attrs: Record<string, unknown> | null | undefined): string | null {
  if (!ehPreVenda(attrs)) return null;
  const bruto = attrs?.preVendaDataPrevista;
  const texto = typeof bruto === 'string' ? bruto.trim() : '';
  return dataLocal(texto) ? texto : null;
}

export interface AvisoPreVenda {
  /** Data prometida já formatada em pt-BR. */
  dataFormatada: string;
  /** Dias que faltam. Negativo quer dizer que o prazo estourou. */
  dias: number;
  /** O prazo prometido passou e a peça não saiu. */
  atrasado: boolean;
}

/**
 * O que mostrar na vitrine e na página do produto, ou null se não é pré-venda.
 *
 * Marca o atraso em vez de esconder: prazo estourado é justamente a informação
 * que o comprador precisa ver ANTES de comprar, e o vendedor precisa ver para
 * atualizar a data.
 */
export function avisoPreVenda(
  attrs: Record<string, unknown> | null | undefined,
  hoje: Date = new Date(),
): AvisoPreVenda | null {
  const iso = dataPrevistaDe(attrs);
  if (!iso) return null;
  const dias = diasAte(iso, hoje) ?? 0;
  return {
    dataFormatada: formatarDataPrevista(iso),
    dias,
    atrasado: dias < 0,
  };
}

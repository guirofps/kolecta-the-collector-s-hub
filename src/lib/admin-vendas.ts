// ─── Acompanhamento de vendas no painel admin ────────────────────────────────
//
// O Financeiro do admin listava as transações sem dizer QUEM vendeu e O QUE foi
// vendido: só número do pedido, comprador e valores. Quando saía uma venda, a
// equipe via o dinheiro entrar e não sabia de qual vendedor nem de qual produto.
//
// Aqui ficam as regras puras do acompanhamento: o que é "hoje", quanto saiu no
// dia, há quanto tempo cada venda aconteceu e a busca que varre todos os campos.
// Tudo função pura sobre a lista que a API devolve, para a tela só desenhar.

import type { AdminFinancialTransaction, AdminFinancialBid } from './api';

/** Data da transação como Date, ou null quando vier vazia/inválida. */
export function dataDa(tx: Pick<AdminFinancialTransaction, 'date'>): Date | null {
  if (!tx.date) return null;
  const d = new Date(tx.date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A venda aconteceu no mesmo dia civil de `referencia` (padrão: agora)? */
export function ehDeHoje(
  tx: Pick<AdminFinancialTransaction, 'date'>,
  referencia: Date = new Date(),
): boolean {
  const d = dataDa(tx);
  if (!d) return false;
  return (
    d.getFullYear() === referencia.getFullYear() &&
    d.getMonth() === referencia.getMonth() &&
    d.getDate() === referencia.getDate()
  );
}

/** Só as vendas de hoje, da mais recente para a mais antiga. */
export function vendasDeHoje<T extends AdminFinancialTransaction>(
  transacoes: T[],
  referencia: Date = new Date(),
): T[] {
  return transacoes
    .filter((t) => ehDeHoje(t, referencia))
    .sort((a, b) => (dataDa(b)?.getTime() ?? 0) - (dataDa(a)?.getTime() ?? 0));
}

export interface TotaisVendas {
  /** Quantidade de vendas. */
  quantidade: number;
  /** Soma do valor bruto (o que o comprador pagou). */
  bruto: number;
  /** Soma da comissão da plataforma. */
  comissao: number;
}

/** Soma bruto e comissão de uma lista de vendas. */
export function totaisDe(transacoes: AdminFinancialTransaction[]): TotaisVendas {
  return transacoes.reduce<TotaisVendas>(
    (acc, t) => ({
      quantidade: acc.quantidade + 1,
      bruto: acc.bruto + (t.gross ?? 0),
      comissao: acc.comissao + (t.commission ?? 0),
    }),
    { quantidade: 0, bruto: 0, comissao: 0 },
  );
}

/**
 * "agora", "há 5 min", "há 2 h", "há 3 d".
 *
 * O painel mostrava só a data (dd/mm), então uma venda de agora e uma de 20h
 * atrás ficavam idênticas na tela. Para acompanhamento, o que importa é o quão
 * recente é.
 */
export function tempoRelativo(
  tx: Pick<AdminFinancialTransaction, 'date'>,
  referencia: Date = new Date(),
): string {
  const d = dataDa(tx);
  if (!d) return '';
  const seg = Math.floor((referencia.getTime() - d.getTime()) / 1000);
  if (seg < 0) return 'agora';
  if (seg < 60) return 'agora';
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} d`;
}

/** Hora no formato 14:05, para a linha do tempo do dia. */
export function horaDe(tx: Pick<AdminFinancialTransaction, 'date'>): string {
  const d = dataDa(tx);
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Origem e forma de pagamento ─────────────────────────────────────────────
//
// O painel agora lista TODO pedido, inclusive Pix gerado que ninguém pagou. Sem
// separar, um arremate de leilão e um Pix abandonado ficam idênticos na tela.

/** Status que já contam como venda de verdade (o resto é intenção de compra). */
const STATUS_DE_VENDA = ['paid', 'processing', 'shipped', 'delivered', 'completed'];

/** É venda de verdade? Usa a marca do backend e cai no status como reserva. */
export function ehVenda(tx: AdminFinancialTransaction): boolean {
  if (typeof tx.isSale === 'boolean') return tx.isSale;
  return STATUS_DE_VENDA.includes(tx.status);
}

/** "Modo Lance" para arremate, "Compra direta" para o resto. */
export function rotuloOrigem(tx: { origin?: 'auction' | 'direct' }): string {
  return tx.origin === 'auction' ? 'Modo Lance' : 'Compra direta';
}

/** "Pix", "Cartão", "Carteira" ou traço enquanto a API não informa. */
export function rotuloPagamento(tx: { paymentInstrument?: string }): string {
  switch (tx.paymentInstrument) {
    case 'pix':
      return 'Pix';
    case 'credit_card':
      return 'Cartão';
    case 'wallet':
      return 'Carteira';
    default:
      return '—';
  }
}

export interface ResumoDoDia {
  /** Vendas confirmadas (dinheiro de verdade). */
  vendas: TotaisVendas;
  /** Pedidos que nasceram mas ainda não viraram venda (Pix gerado, cancelado). */
  aguardando: TotaisVendas;
  /** Só os arremates do Modo Lance, dentro das vendas confirmadas. */
  modoLance: TotaisVendas;
}

/**
 * Separa o dia em venda confirmada, pendente e arremate.
 *
 * O número que a equipe olha ("quanto entrou hoje") não pode misturar Pix
 * gerado e não pago, senão o painel promete dinheiro que não existe.
 */
export function resumoDoDia(transacoes: AdminFinancialTransaction[]): ResumoDoDia {
  const confirmadas = transacoes.filter(ehVenda);
  return {
    vendas: totaisDe(confirmadas),
    aguardando: totaisDe(transacoes.filter((t) => !ehVenda(t))),
    modoLance: totaisDe(confirmadas.filter((t) => t.origin === 'auction')),
  };
}

// ─── Linha do tempo da plataforma (vendas + lances) ──────────────────────────
//
// Lance não é pedido: só vira venda quando o leilão fecha e a retenção é
// capturada. Como o painel lia só pedidos, um lance dado agora não aparecia em
// lugar nenhum. Aqui os dois viram "evento" e entram na mesma linha do tempo.

export type TipoEvento = 'venda' | 'lance';

export interface EventoPainel {
  id: string;
  tipo: TipoEvento;
  date: string;
  produto: string | null;
  vendedor: string | null;
  /** Comprador, no caso de venda; quem deu o lance, no caso de lance. */
  pessoa: string;
  valor: number;
  status: string;
  origem?: 'auction' | 'direct';
  pagamento?: string;
  comissao?: number;
  /**
   * Venda: o pagamento foi confirmado. Lance: a retenção no cartão foi criada.
   * Nos dois casos é "isto está garantido"; o que não está aparece apagado.
   */
  confirmado: boolean;
}

/** Junta vendas e lances numa linha do tempo, da mais recente para a mais antiga. */
export function eventosDe(
  transacoes: AdminFinancialTransaction[],
  lances: AdminFinancialBid[] = [],
): EventoPainel[] {
  const deVendas: EventoPainel[] = transacoes.map((t) => ({
    id: `venda-${t.id}`,
    tipo: 'venda',
    date: t.date,
    produto: t.product ?? null,
    vendedor: t.seller ?? null,
    pessoa: t.buyer,
    valor: t.gross,
    status: t.status,
    origem: t.origin,
    pagamento: t.paymentInstrument,
    comissao: t.commission,
    confirmado: ehVenda(t),
  }));

  const deLances: EventoPainel[] = lances.map((b) => ({
    id: `lance-${b.id}`,
    tipo: 'lance',
    date: b.date,
    produto: b.product,
    vendedor: b.seller,
    pessoa: b.bidder,
    valor: b.amount,
    status: b.status,
    origem: 'auction',
    confirmado: b.hasPreAuth,
  }));

  return [...deVendas, ...deLances].sort(
    (a, b) => (dataDa(b)?.getTime() ?? 0) - (dataDa(a)?.getTime() ?? 0),
  );
}

export interface ResumoPeriodo {
  /** Vendas com pagamento confirmado. */
  vendas: TotaisVendas;
  /** Pedidos que não viraram venda (Pix gerado, cancelado). */
  aguardando: TotaisVendas;
  /** Lances dados no período, e quanto está retido em cartão. */
  lances: { quantidade: number; valor: number; garantidos: number };
}

/** Resumo de uma linha do tempo já recortada por período. */
export function resumoEventos(eventos: EventoPainel[]): ResumoPeriodo {
  const vendas = eventos.filter((e) => e.tipo === 'venda');
  const lances = eventos.filter((e) => e.tipo === 'lance');
  const soma = (lista: EventoPainel[]): TotaisVendas =>
    lista.reduce<TotaisVendas>(
      (acc, e) => ({
        quantidade: acc.quantidade + 1,
        bruto: acc.bruto + e.valor,
        comissao: acc.comissao + (e.comissao ?? 0),
      }),
      { quantidade: 0, bruto: 0, comissao: 0 },
    );

  return {
    vendas: soma(vendas.filter((e) => e.confirmado)),
    aguardando: soma(vendas.filter((e) => !e.confirmado)),
    lances: {
      quantidade: lances.length,
      valor: lances.reduce((s, e) => s + e.valor, 0),
      garantidos: lances.filter((e) => e.confirmado).length,
    },
  };
}

export type Periodo = 'hoje' | '7d' | '30d' | 'tudo';

export const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
  { valor: 'tudo', rotulo: 'Tudo' },
];

/**
 * Recorta a linha do tempo por período.
 *
 * O painel só mostrava "as últimas 100", sem recorte: não dava para responder
 * "quanto saiu esta semana?".
 */
export function filtrarPeriodo<T extends { date: string }>(
  eventos: T[],
  periodo: Periodo,
  referencia: Date = new Date(),
): T[] {
  if (periodo === 'tudo') return eventos;
  if (periodo === 'hoje') return eventos.filter((e) => ehDeHoje(e, referencia));

  const dias = periodo === '7d' ? 7 : 30;
  // Início do dia de N-1 dias atrás: "7 dias" inclui hoje e os 6 anteriores.
  const corte = new Date(referencia);
  corte.setDate(corte.getDate() - (dias - 1));
  corte.setHours(0, 0, 0, 0);

  return eventos.filter((e) => {
    const d = dataDa(e);
    return d != null && d.getTime() >= corte.getTime();
  });
}

/**
 * Busca que varre pedido, comprador, vendedor e produto.
 *
 * Antes só olhava número do pedido e comprador, então procurar pelo nome do
 * vendedor ou pelo produto não achava nada.
 */
export function filtrarBusca<T extends AdminFinancialTransaction>(
  transacoes: T[],
  termo: string,
): T[] {
  const q = termo.trim().toLowerCase();
  if (!q) return transacoes;
  return transacoes.filter((t) =>
    [t.orderId, t.buyer, t.seller, t.product]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .some((v) => v.toLowerCase().includes(q)),
  );
}

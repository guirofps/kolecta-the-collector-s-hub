// ─── Acompanhamento de vendas no painel admin ────────────────────────────────
//
// O Financeiro do admin listava as transações sem dizer QUEM vendeu e O QUE foi
// vendido: só número do pedido, comprador e valores. Quando saía uma venda, a
// equipe via o dinheiro entrar e não sabia de qual vendedor nem de qual produto.
//
// Aqui ficam as regras puras do acompanhamento: o que é "hoje", quanto saiu no
// dia, há quanto tempo cada venda aconteceu e a busca que varre todos os campos.
// Tudo função pura sobre a lista que a API devolve, para a tela só desenhar.

import type { AdminFinancialTransaction } from './api';

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
export function rotuloOrigem(tx: AdminFinancialTransaction): string {
  return tx.origin === 'auction' ? 'Modo Lance' : 'Compra direta';
}

/** "Pix", "Cartão", "Carteira" ou traço enquanto a API não informa. */
export function rotuloPagamento(tx: AdminFinancialTransaction): string {
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

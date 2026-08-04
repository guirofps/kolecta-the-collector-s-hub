import { describe, it, expect } from 'vitest';
import {
  ehDeHoje, vendasDeHoje, totaisDe, tempoRelativo, horaDe, filtrarBusca, dataDa,
  ehVenda, rotuloOrigem, rotuloPagamento, resumoDoDia,
} from '@/lib/admin-vendas';
import type { AdminFinancialTransaction } from '@/lib/api';

/** Transação mínima; sobrescreva o que o teste precisa. */
function tx(over: Partial<AdminFinancialTransaction> = {}): AdminFinancialTransaction {
  return {
    id: 'o1',
    orderId: '#abc12345',
    date: '2026-08-04T14:00:00.000Z',
    buyer: 'Comprador',
    gross: 100,
    commission: 11,
    commissionPct: 11,
    net: 89,
    status: 'paid',
    ...over,
  };
}

const AGORA = new Date('2026-08-04T15:00:00.000Z');

describe('dataDa', () => {
  it('devolve null quando a data vem vazia ou inválida', () => {
    expect(dataDa(tx({ date: '' }))).toBeNull();
    expect(dataDa(tx({ date: 'não é data' }))).toBeNull();
  });
});

describe('ehDeHoje', () => {
  // Datas montadas em horário LOCAL: "hoje" é o dia civil de quem olha o painel,
  // então um instante em UTC pode cair no dia anterior e tornar o teste frágil.
  const localISO = (ano: number, mes1a12: number, dia: number, hora: number) =>
    new Date(ano, mes1a12 - 1, dia, hora, 0, 0).toISOString();

  it('aceita venda do mesmo dia, mesmo de madrugada', () => {
    expect(ehDeHoje(tx({ date: localISO(2026, 8, 4, 2) }), AGORA)).toBe(true);
  });

  it('recusa venda de outro dia', () => {
    expect(ehDeHoje(tx({ date: localISO(2026, 8, 3, 23) }), AGORA)).toBe(false);
  });

  it('data inválida não é de hoje, em vez de quebrar', () => {
    expect(ehDeHoje(tx({ date: '' }), AGORA)).toBe(false);
  });
});

describe('vendasDeHoje', () => {
  it('filtra o dia e ordena da mais recente para a mais antiga', () => {
    const lista = [
      tx({ id: 'antiga', date: '2026-08-04T09:00:00.000Z' }),
      tx({ id: 'ontem', date: '2026-08-03T09:00:00.000Z' }),
      tx({ id: 'recente', date: '2026-08-04T14:30:00.000Z' }),
    ];
    expect(vendasDeHoje(lista, AGORA).map((t) => t.id)).toEqual(['recente', 'antiga']);
  });
});

describe('totaisDe', () => {
  it('soma bruto e comissão', () => {
    const r = totaisDe([tx({ gross: 100, commission: 11 }), tx({ gross: 50, commission: 5 })]);
    expect(r).toEqual({ quantidade: 2, bruto: 150, comissao: 16 });
  });

  it('lista vazia zera tudo', () => {
    expect(totaisDe([])).toEqual({ quantidade: 0, bruto: 0, comissao: 0 });
  });
});

describe('tempoRelativo', () => {
  it('menos de um minuto vira "agora"', () => {
    expect(tempoRelativo(tx({ date: '2026-08-04T14:59:30.000Z' }), AGORA)).toBe('agora');
  });

  it('minutos, horas e dias', () => {
    expect(tempoRelativo(tx({ date: '2026-08-04T14:45:00.000Z' }), AGORA)).toBe('há 15 min');
    expect(tempoRelativo(tx({ date: '2026-08-04T11:00:00.000Z' }), AGORA)).toBe('há 4 h');
    expect(tempoRelativo(tx({ date: '2026-08-01T15:00:00.000Z' }), AGORA)).toBe('há 3 d');
  });

  it('data no futuro não vira número negativo', () => {
    expect(tempoRelativo(tx({ date: '2026-08-04T16:00:00.000Z' }), AGORA)).toBe('agora');
  });

  it('data inválida devolve string vazia', () => {
    expect(tempoRelativo(tx({ date: '' }), AGORA)).toBe('');
  });
});

describe('horaDe', () => {
  it('devolve vazio para data inválida', () => {
    expect(horaDe(tx({ date: '' }))).toBe('');
  });

  it('formata hora e minuto', () => {
    expect(horaDe(tx({ date: '2026-08-04T14:05:00.000Z' }))).toMatch(/\d{2}:\d{2}/);
  });
});

describe('ehVenda', () => {
  it('confia na marca do backend quando ela vem', () => {
    expect(ehVenda(tx({ isSale: true, status: 'qualquer' }))).toBe(true);
    expect(ehVenda(tx({ isSale: false, status: 'paid' }))).toBe(false);
  });

  it('sem a marca, cai no status', () => {
    expect(ehVenda(tx({ status: 'paid' }))).toBe(true);
    expect(ehVenda(tx({ status: 'completed' }))).toBe(true);
    expect(ehVenda(tx({ status: 'cancelled' }))).toBe(false);
    expect(ehVenda(tx({ status: 'pending_payment' }))).toBe(false);
  });
});

describe('rotuloOrigem', () => {
  it('separa arremate de compra direta', () => {
    expect(rotuloOrigem(tx({ origin: 'auction' }))).toBe('Modo Lance');
    expect(rotuloOrigem(tx({ origin: 'direct' }))).toBe('Compra direta');
  });

  it('sem origem, trata como compra direta', () => {
    expect(rotuloOrigem(tx())).toBe('Compra direta');
  });
});

describe('rotuloPagamento', () => {
  it('traduz os instrumentos', () => {
    expect(rotuloPagamento(tx({ paymentInstrument: 'pix' }))).toBe('Pix');
    expect(rotuloPagamento(tx({ paymentInstrument: 'credit_card' }))).toBe('Cartão');
    expect(rotuloPagamento(tx({ paymentInstrument: 'wallet' }))).toBe('Carteira');
  });

  it('sem instrumento, mostra traço em vez de sumir', () => {
    expect(rotuloPagamento(tx())).toBe('—');
  });
});

describe('resumoDoDia', () => {
  const lista = [
    tx({ id: 'v1', status: 'paid', gross: 100, commission: 11, origin: 'direct' }),
    tx({ id: 'v2', status: 'completed', gross: 200, commission: 22, origin: 'auction' }),
    tx({ id: 'p1', status: 'cancelled', gross: 50, commission: 5, origin: 'direct' }),
    tx({ id: 'p2', status: 'pending_payment', gross: 30, commission: 3, origin: 'direct' }),
  ];

  it('conta como venda só o que virou dinheiro', () => {
    expect(resumoDoDia(lista).vendas).toEqual({ quantidade: 2, bruto: 300, comissao: 33 });
  });

  it('Pix gerado e cancelado entram em aguardando, nao no bruto', () => {
    expect(resumoDoDia(lista).aguardando).toEqual({ quantidade: 2, bruto: 80, comissao: 8 });
  });

  it('separa o arremate do Modo Lance dentro das vendas', () => {
    expect(resumoDoDia(lista).modoLance).toEqual({ quantidade: 1, bruto: 200, comissao: 22 });
  });

  it('lista vazia nao quebra', () => {
    const r = resumoDoDia([]);
    expect(r.vendas.quantidade).toBe(0);
    expect(r.aguardando.quantidade).toBe(0);
    expect(r.modoLance.quantidade).toBe(0);
  });
});

describe('filtrarBusca', () => {
  const lista = [
    tx({ id: '1', orderId: '#aaa', buyer: 'Maria', seller: 'Hot Wheels Store', product: 'Ferrari F40' }),
    tx({ id: '2', orderId: '#bbb', buyer: 'João', seller: 'Mini GT Brasil', product: 'Skyline R34' }),
  ];

  it('sem termo devolve tudo', () => {
    expect(filtrarBusca(lista, '   ')).toHaveLength(2);
  });

  it('acha pelo VENDEDOR, que a busca antiga ignorava', () => {
    expect(filtrarBusca(lista, 'mini gt').map((t) => t.id)).toEqual(['2']);
  });

  it('acha pelo PRODUTO, que a busca antiga ignorava', () => {
    expect(filtrarBusca(lista, 'ferrari').map((t) => t.id)).toEqual(['1']);
  });

  it('continua achando por pedido e comprador', () => {
    expect(filtrarBusca(lista, '#bbb').map((t) => t.id)).toEqual(['2']);
    expect(filtrarBusca(lista, 'maria').map((t) => t.id)).toEqual(['1']);
  });

  it('não quebra quando vendedor e produto ainda não vêm da API', () => {
    const semCampos = [tx({ id: '3', seller: undefined, product: undefined })];
    expect(filtrarBusca(semCampos, 'qualquer')).toHaveLength(0);
    expect(filtrarBusca(semCampos, 'comprador')).toHaveLength(1);
  });
});

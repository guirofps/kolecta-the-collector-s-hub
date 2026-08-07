import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * Card de rastreio no detalhe do pedido.
 *
 * O que estes testes prendem: o card SOME quando não há envio (retirada em mãos)
 * em vez de mostrar uma timeline vazia, a etapa atual reflete o marco mais
 * avançado, e o cancelado não finge que está "a caminho".
 */

const useRastreio = vi.fn();
vi.mock('@/hooks/use-api', () => ({ useRastreio: () => useRastreio() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import RastreioCard from '@/components/RastreioCard';

const base = {
  isLoading: false,
  isFetching: false,
  refetch: vi.fn(),
};

describe('RastreioCard', () => {
  beforeEach(() => useRastreio.mockReset());

  it('não renderiza nada quando o pedido não tem envio', () => {
    useRastreio.mockReturnValue({ ...base, data: { rastreavel: false } });
    const { container } = render(<RastreioCard orderId="o1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra os marcos e destaca o estado postado como "A caminho"', () => {
    useRastreio.mockReturnValue({
      ...base,
      data: {
        rastreavel: true,
        status: 'posted',
        etapaAtual: 'postado',
        codigo: 'AP299649960BR',
        canceladoEm: null,
        postadoEm: '2026-08-04 14:18:16',
        entregueEm: null,
        marcos: [
          { etapa: 'emitida', data: '2026-08-03 15:19:57' },
          { etapa: 'postado', data: '2026-08-04 14:18:16' },
        ],
      },
    });
    render(<RastreioCard orderId="o1" />);

    expect(screen.getByText('Etiqueta emitida')).toBeInTheDocument();
    // Postado, ainda não entregue: a etapa corrente lê "A caminho".
    expect(screen.getByText('A caminho')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();
    // Data formatada dd/mm às hh:mm.
    expect(screen.getByText('04/08 às 14:18')).toBeInTheDocument();
    // Código exibido.
    expect(screen.getByText('AP299649960BR')).toBeInTheDocument();
  });

  it('entregue mostra a data de entrega', () => {
    useRastreio.mockReturnValue({
      ...base,
      data: {
        rastreavel: true,
        status: 'delivered',
        etapaAtual: 'entregue',
        codigo: 'AP299649960BR',
        canceladoEm: null,
        postadoEm: '2026-08-04 14:18:16',
        entregueEm: '2026-08-07 11:02:00',
        marcos: [
          { etapa: 'emitida', data: '2026-08-03 15:19:57' },
          { etapa: 'postado', data: '2026-08-04 14:18:16' },
          { etapa: 'entregue', data: '2026-08-07 11:02:00' },
        ],
      },
    });
    render(<RastreioCard orderId="o1" />);
    expect(screen.getByText('07/08 às 11:02')).toBeInTheDocument();
    // "A caminho" não aparece: já chegou.
    expect(screen.queryByText('A caminho')).not.toBeInTheDocument();
  });

  it('cancelado avisa e não mostra a timeline', () => {
    useRastreio.mockReturnValue({
      ...base,
      data: {
        rastreavel: true,
        status: 'canceled',
        etapaAtual: 'cancelado',
        codigo: null,
        canceladoEm: '2026-08-05 09:00:00',
        postadoEm: null,
        entregueEm: null,
        marcos: [],
      },
    });
    render(<RastreioCard orderId="o1" />);
    expect(screen.getByText(/Envio cancelado/i)).toBeInTheDocument();
    expect(screen.queryByText('Etiqueta emitida')).not.toBeInTheDocument();
  });

  it('carregando mostra esqueleto, não erro', () => {
    useRastreio.mockReturnValue({ ...base, isLoading: true, data: undefined });
    const { container } = render(<RastreioCard orderId="o1" />);
    // Renderiza algo (o esqueleto), não vazio.
    expect(container).not.toBeEmptyDOMElement();
  });
});

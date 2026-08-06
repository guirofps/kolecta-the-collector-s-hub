import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useAdminListings: vi.fn(),
  useCategories: vi.fn(),
  useAdminTraffic: vi.fn(),
}));

vi.mock('@/components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

// Recharts mede o container, e em jsdom a largura é 0: os gráficos não pintam.
// Trocamos por divs para o teste checar a página, não a biblioteca.
vi.mock('recharts', () => {
  const Passa = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  return {
    ResponsiveContainer: Passa, AreaChart: Passa, Area: () => null,
    BarChart: Passa, Bar: Passa, Cell: () => null,
    XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
  };
});

import { useAdminListings, useCategories, useAdminTraffic } from '@/hooks/use-api';
import AdminAnalytics from '@/pages/admin/Analytics';

const TRAFEGO = {
  periodoDias: 30, visitantes: 40, pageViews: 120, onlineAgora: 3,
  tempoMedioSegundos: 95, taxaRejeicao: 42, taxaAbandonoCarrinho: 60, abandonaramCarrinho: 6,
  funil: [
    { etapa: 'Visitantes', sessoes: 40, doTopo: 100, daAnterior: 100 },
    { etapa: 'Viram um produto', sessoes: 25, doTopo: 62.5, daAnterior: 62.5 },
    { etapa: 'Adicionaram ao carrinho', sessoes: 10, doTopo: 25, daAnterior: 40 },
    { etapa: 'Iniciaram checkout', sessoes: 6, doTopo: 15, daAnterior: 60 },
    { etapa: 'Compraram', sessoes: 4, doTopo: 10, daAnterior: 66.7 },
  ],
  dau: [{ dia: '2026-08-05', label: '5/Ago', sessoes: 40 }],
  coletando: false,
};

let seq = 0;
const item = (over: Record<string, unknown> = {}) => ({
  id: `l${++seq}`,
  sellerId: 's1',
  sellerName: 'RODA RARA',
  categoryId: 'cat_1',
  title: 'Hot Wheels',
  condition: 'novo',
  type: 'direct',
  priceInCents: 10000,
  images: null,
  status: 'active',
  createdAt: new Date().toISOString(),
  ...over,
});

const CATEGORIAS = [
  { id: 'cat_1', name: 'Miniaturas Diecast', slug: 'miniaturas-diecast', icon: null, parentId: null },
];

function renderPainel(listings: unknown[], isLoading = false) {
  (useAdminListings as ReturnType<typeof vi.fn>).mockReturnValue({ data: listings, isLoading });
  (useCategories as ReturnType<typeof vi.fn>).mockReturnValue({ data: CATEGORIAS });
  (useAdminTraffic as ReturnType<typeof vi.fn>).mockReturnValue({ data: TRAFEGO });
  return render(
    React.createElement(MemoryRouter, null, React.createElement(AdminAnalytics)),
  );
}

/**
 * Aba nova do admin. O risco desta tela não é dar número errado, é quebrar e
 * levar a aba inteira: são muitas agregações sobre dados que podem vir vazios,
 * nulos ou com data inválida.
 */
describe('AdminAnalytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza com o catálogo carregado', () => {
    renderPainel([
      item({ status: 'active' }),
      item({ status: 'draft' }),
      item({ status: 'rejected' }),
    ]);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    // "No ar" aparece no KPI e na barra de moderação.
    expect(screen.getAllByText('No ar').length).toBeGreaterThan(0);
    expect(screen.getByText('Moderação')).toBeInTheDocument();
    expect(screen.getByText('Anúncios criados por dia')).toBeInTheDocument();
  });

  it('não quebra com o catálogo vazio', () => {
    // Tela nova costuma morrer no dia em que a lista volta vazia.
    expect(() => renderPainel([])).not.toThrow();
    expect(screen.getByText(/Nenhum anúncio no ar ainda/)).toBeInTheDocument();
    expect(screen.getByText(/Sem vendedores ainda/)).toBeInTheDocument();
  });

  it('não quebra com dado sujo: sem preço, sem vendedor, data inválida', () => {
    expect(() =>
      renderPainel([
        item({ priceInCents: null, startingBidInCents: null }),
        item({ sellerName: null, sellerId: '' }),
        item({ createdAt: 'nao-e-data' }),
        item({ categoryId: null }),
      ]),
    ).not.toThrow();
  });

  it('mostra o esqueleto enquanto carrega, sem tentar somar nada', () => {
    expect(() => renderPainel([], true)).not.toThrow();
    expect(screen.queryByText('Moderação')).toBeNull();
  });

  it('traduz o id da categoria para o nome', () => {
    renderPainel([item({ categoryId: 'cat_1', status: 'active' })]);
    expect(screen.getByText('Miniaturas Diecast')).toBeInTheDocument();
  });

  it('a janela do gráfico pode ser trocada', () => {
    renderPainel([item()]);
    fireEvent.click(screen.getByText('7 dias'));
    expect(screen.getByText('7 dias')).toBeInTheDocument();
  });

  it('mostra o funil de tráfego com as etapas e o abandono', () => {
    renderPainel([item()]);
    // "Visitantes" aparece no título do card E como primeira etapa do funil.
    expect(screen.getAllByText('Visitantes').length).toBeGreaterThan(0);
    expect(screen.getByText('Funil de compra')).toBeInTheDocument();
    expect(screen.getByText('Agora e engajamento')).toBeInTheDocument();
    // As etapas do funil e o abandono de carrinho aparecem de verdade.
    expect(screen.getByText('Adicionaram ao carrinho')).toBeInTheDocument();
    expect(screen.getByText(/Abandono de carrinho:/)).toBeInTheDocument();
  });

  it('avisa quando a consulta bate o teto e os números viram um piso', () => {
    // Sem o aviso, o painel mostraria 1000 como se fosse o total real.
    renderPainel(Array.from({ length: 1000 }, () => item()));
    expect(screen.getByText(/bateu o teto/)).toBeInTheDocument();
  });

  it('sem nada decidido, não inventa taxa de aprovação', () => {
    renderPainel([item({ status: 'draft' }), item({ status: 'pending_review' })]);
    expect(screen.getByText(/Nada decidido ainda/)).toBeInTheDocument();
  });
});

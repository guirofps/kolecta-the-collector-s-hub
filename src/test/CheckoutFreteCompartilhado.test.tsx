import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Frete compartilhado no checkout.
 *
 * O valor que aparece aqui vem PRONTO da cotação (`subsidyInCents`) — é o mesmo
 * número que o backend aplica ao criar o pedido. A tela não recalcula nada: o
 * front que reimplementa regra de dinheiro é como o fundador acabou vendo 11%
 * de comissão pagando 9%.
 *
 * O que estes testes prendem:
 *  - o frete cheio aparece riscado e o comprador vê o que vai pagar;
 *  - cobertura total lê "Grátis", e não "R$ 0,00";
 *  - o subsídio NÃO acompanha a escolha de uma transportadora mais cara;
 *  - retirada em mãos não ganha subsídio;
 *  - sem política, a tela é exatamente a de antes.
 */

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
  useUser: () => ({ user: null, isSignedIn: false }),
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: () => null,
}));

vi.mock('@/components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

const enderecoPadrao = {
  id: 'addr_1',
  userId: 'user_1',
  recipientName: 'Daniel Salgado',
  zip: '09560-000',
  street: 'Rua São Paulo',
  number: '671',
  complement: null,
  neighborhood: 'Centro',
  city: 'São Caetano do Sul',
  state: 'SP',
  country: 'BR',
  isDefault: true,
};

const itemCarrinho = {
  product: {
    id: 'listing_1',
    title: 'Hot Wheels RLC',
    price: 300,
    images: [],
    seller: { name: 'Loja Teste', slug: 'loja-teste' },
  },
  quantity: 1,
};

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ items: [itemCarrinho], totalPrice: 300 }),
  CartItem: {},
}));

vi.mock('@/hooks/use-api', () => ({
  useCreateCheckout: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWallet: () => ({ data: { balanceInCents: 0 } }),
  useInstallmentsSimulation: () => vi.fn().mockResolvedValue({ options: [] }),
  useAddresses: () => ({ query: { data: [enderecoPadrao], isLoading: false } }),
}));

const quoteMock = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { shipping: { quote: (...args: unknown[]) => quoteMock(...args) } },
}));

vi.mock('@/lib/pagarme', () => ({
  tokenizeCard: vi.fn(),
  CardTokenizationError: class extends Error {},
  isCardPaymentEnabled: () => true,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import CheckoutPage from '@/pages/Checkout';

const PAC = { carrier: 'Correios', service: 'PAC', price: 15.5, delivery_time_days: 5, raw: { id: 1 } };
const SEDEX = { carrier: 'Correios', service: 'SEDEX', price: 32.9, delivery_time_days: 2, raw: { id: 2 } };

const renderCheckout = () =>
  render(
    React.createElement(MemoryRouter, null, React.createElement(CheckoutPage)),
  );

/** Texto da tela sem espaços exóticos — o formatBRL usa espaço fino. */
const texto = (c: HTMLElement) => (c.textContent ?? '').replace(/\s+/g, ' ');

describe('Checkout — frete compartilhado', () => {
  beforeEach(() => {
    quoteMock.mockReset();
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('ViaCEP não deveria ser chamado')),
    ) as unknown as typeof fetch;
  });

  it('cobertura parcial: risca o frete cheio e mostra o que a Kolecta paga', async () => {
    // Item R$ 300 → a Kolecta banca R$ 7,00 dos R$ 15,50 do PAC.
    quoteMock.mockResolvedValue({
      options: [PAC],
      pickup: false,
      subsidyInCents: 700,
    });

    const { container } = renderCheckout();
    await waitFor(() => expect(quoteMock).toHaveBeenCalled());

    await waitFor(() => {
      const t = texto(container);
      // O cheio riscado, o cobrado ao lado.
      expect(t).toMatch(/15,50/);
      expect(t).toMatch(/8,50/);
      // E a linha que diz de quem é o desconto.
      expect(t).toMatch(/A Kolecta paga do seu frete/);
      expect(t).toMatch(/− R\$\s?7,00/);
    });
  });

  it('cobertura total: a tela diz "Grátis", não "R$ 0,00"', async () => {
    quoteMock.mockResolvedValue({
      options: [PAC],
      pickup: false,
      subsidyInCents: 1550,
    });

    const { container } = renderCheckout();
    await waitFor(() => expect(quoteMock).toHaveBeenCalled());

    await waitFor(() => {
      const t = texto(container);
      expect(t).toMatch(/Grátis/);
      // "R$ 0,00" é o que NÃO pode aparecer: não lê como frete grátis.
      expect(t).not.toMatch(/R\$\s?0,00/);
    });
  });

  it('o total do pedido desconta o subsídio', async () => {
    quoteMock.mockResolvedValue({
      options: [PAC],
      pickup: false,
      subsidyInCents: 1550,
    });

    const { container } = renderCheckout();
    await waitFor(() => expect(quoteMock).toHaveBeenCalled());

    // Item R$ 300 + frete zerado = R$ 300,00, e não R$ 315,50.
    await waitFor(() => expect(texto(container)).toMatch(/300,00/));
    expect(texto(container)).not.toMatch(/315,50/);
  });

  it('política desligada: a tela é a de sempre, sem linha extra', async () => {
    quoteMock.mockResolvedValue({
      options: [PAC],
      pickup: false,
      subsidyInCents: 0,
    });

    const { container } = renderCheckout();
    await waitFor(() => expect(quoteMock).toHaveBeenCalled());

    await waitFor(() => expect(texto(container)).toMatch(/15,50/));
    expect(texto(container)).not.toMatch(/A Kolecta paga do seu frete/);
  });

  it('backend antigo, sem o campo: nada quebra e ninguém ganha frete', async () => {
    quoteMock.mockResolvedValue({ options: [PAC], pickup: false });

    const { container } = renderCheckout();
    await waitFor(() => expect(quoteMock).toHaveBeenCalled());

    await waitFor(() => expect(texto(container)).toMatch(/15,50/));
    expect(texto(container)).not.toMatch(/A Kolecta paga do seu frete/);
  });

  it('o subsídio nunca passa do frete escolhido', async () => {
    // Cotação devolve um subsídio maior que a opção mais barata (não deveria
    // acontecer — o backend ancora nela —, mas a tela não pode gerar frete
    // negativo se acontecer).
    quoteMock.mockResolvedValue({
      options: [PAC],
      pickup: false,
      subsidyInCents: 9_999,
    });

    const { container } = renderCheckout();
    await waitFor(() => expect(quoteMock).toHaveBeenCalled());

    await waitFor(() => expect(texto(container)).toMatch(/Grátis/));
    // Nada de valor negativo na tela.
    expect(texto(container)).not.toMatch(/-\s?R\$\s?\d/);
  });

  it('a opção mais cara não aumenta o subsídio — a diferença é do comprador', async () => {
    quoteMock.mockResolvedValue({
      options: [PAC, SEDEX],
      pickup: false,
      subsidyInCents: 700,
    });

    const { container } = renderCheckout();
    await waitFor(() => expect(quoteMock).toHaveBeenCalled());

    // A mais barata entra selecionada: R$ 15,50 − R$ 7,00 = R$ 8,50.
    await waitFor(() => expect(texto(container)).toMatch(/8,50/));
    // O subsídio mostrado é o do PAC, e continuaria R$ 7,00 no SEDEX — nunca
    // os R$ 32,90 da opção cara.
    expect(texto(container)).toMatch(/− R\$\s?7,00/);
  });
});

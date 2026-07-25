import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

/**
 * A cotação de frete morava DENTRO do fetchCep, e o fetchCep só era chamado
 * pelo onChange do campo CEP. Quem escolhia um endereço já salvo tinha todos os
 * campos preenchidos e NENHUMA opção de frete — sem erro, sem aviso. A saída
 * era recarregar a página e digitar o CEP na mão.
 *
 * Estes testes prendem as duas pontas: o endereço padrão entra sozinho e a
 * cotação sai a partir dele.
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
    price: 100,
    images: [],
    seller: { name: 'Loja Teste', slug: 'loja-teste' },
  },
  quantity: 1,
};

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ items: [itemCarrinho], totalPrice: 100 }),
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

const renderCheckout = () =>
  render(
    React.createElement(MemoryRouter, null, React.createElement(CheckoutPage)),
  );

describe('Checkout — frete a partir do endereço salvo', () => {
  beforeEach(() => {
    quoteMock.mockReset();
    quoteMock.mockResolvedValue([
      {
        carrier: 'Correios',
        service: 'PAC',
        price: 15.5,
        delivery_time_days: 5,
        raw: { id: 1 },
      },
    ]);
    // O endereço salvo não passa pelo ViaCEP; se passar, o teste denuncia.
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('ViaCEP não deveria ser chamado')),
    ) as unknown as typeof fetch;
  });

  it('cota o frete sozinho a partir do endereço padrão, sem digitar CEP', async () => {
    renderCheckout();

    await waitFor(() => expect(quoteMock).toHaveBeenCalled());

    // CEP sem máscara e o anúncio do carrinho — é o que o backend precisa para
    // resolver origem e pacote.
    expect(quoteMock).toHaveBeenCalledWith({
      to_cep: '09560000',
      listing_id: 'listing_1',
    });
  });

  it('não consulta o ViaCEP para endereço já salvo', async () => {
    renderCheckout();

    await waitFor(() => expect(quoteMock).toHaveBeenCalled());
    // O endereço salvo já está completo; consultar o ViaCEP sobrescreveria os
    // campos que o comprador ajustou (complemento, por exemplo).
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

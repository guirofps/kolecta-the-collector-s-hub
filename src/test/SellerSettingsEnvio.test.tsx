import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Aba "Envio" das configurações do vendedor.
 *
 * O vendedor recebia as seis transportadoras da Kolecta e se virava para
 * despachar em qualquer uma, mesmo as que não têm agência perto da casa dele.
 * Aqui ele corta as que não usa.
 *
 * O que estes testes prendem é a parte que engana: nada marcado significa
 * TODAS, não nenhuma. E a trava de cobertura nacional, que é o que impede o
 * vendedor de sumir silenciosamente do resto do país.
 */

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
  useUser: () => ({ user: null, isSignedIn: false }),
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));

vi.mock('@/components/layout/SellerLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

const disponiveis = [
  { id: 1, carrier: 'Correios', service: 'PAC', nacional: true, aviso: null },
  { id: 2, carrier: 'Correios', service: 'SEDEX', nacional: true, aviso: null },
  {
    id: 17, carrier: 'Correios', service: 'Mini Envios', nacional: false,
    aviso: 'Só aceita pacotes de até 300 g e 16×11×3 cm.',
  },
  {
    id: 33, carrier: 'JeT', service: 'Standard', nacional: false,
    aviso: 'Cobertura regional. Exige telefone do remetente na etiqueta.',
  },
];

const perfil = (services: number[]) => ({
  storeName: 'GT RACE', avatarUrl: null, bio: '', city: '', state: '',
  website: '', categories: [], isVerified: false,
  policies: { shipping: null, returns: null, payment: null, acceptOffers: false, maxDiscountPercent: null },
  notificationPrefs: {},
  shipping: { services, disponiveis, acceptsPickup: (globalThis as any).__retirada ?? true },
  account: { name: 'GT RACE', email: 'gt@race.com', createdAt: null },
});

const updateShipping = vi.fn();

vi.mock('@/hooks/use-api', async () => {
  const real = await vi.importActual<any>('@/hooks/use-api');
  return {
    ...real,
    useSellerSelfProfile: () => ({ data: (globalThis as any).__perfil, isLoading: false }),
    useUpdateSellerProfile: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateSellerPolicies: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateNotificationPrefs: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateSellerShipping: () => ({ mutate: updateShipping, isPending: false }),
    useUploadImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

import SellerSettingsPage from '@/pages/seller/Settings';

async function abrirAbaEnvio(services: number[], aceitaRetirada = true) {
  (globalThis as any).__retirada = aceitaRetirada;
  (globalThis as any).__perfil = perfil(services);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    React.createElement(QueryClientProvider, { client },
      React.createElement(MemoryRouter, null,
        React.createElement(SellerSettingsPage))),
  );
  fireEvent.click(await screen.findByText('Envio'));
  return screen.findByText('Transportadoras');
}

const caixaDe = (nome: string) =>
  screen.getByText(nome).closest('label')!.querySelector('button[role="checkbox"]')!;
const marcada = (nome: string) =>
  caixaDe(nome).getAttribute('data-state') === 'checked';

describe('Configurações do vendedor, aba Envio', () => {
  beforeEach(() => {
    updateShipping.mockClear();
  });

  it('lista as transportadoras com a limitação de cada uma', async () => {
    await abrirAbaEnvio([]);

    expect(screen.getByText('Correios PAC')).toBeTruthy();
    // O vendedor precisa saber do teto de peso ANTES de marcar.
    expect(screen.getByText(/até 300 g/)).toBeTruthy();
    expect(screen.getAllByText('Todo o Brasil').length).toBe(2); // PAC e SEDEX
  });

  it('sem escolha gravada, mostra TODAS marcadas', async () => {
    // Vazio quer dizer "não escolheu" e a cotação usa todas. Mostrar tudo
    // desmarcado faria o vendedor achar que está sem frete nenhum.
    await abrirAbaEnvio([]);

    for (const n of ['Correios PAC', 'Correios SEDEX', 'Correios Mini Envios', 'JeT Standard']) {
      expect(marcada(n)).toBe(true);
    }
    expect(screen.getByText(/veem todas as opções da Kolecta/)).toBeTruthy();
  });

  it('com escolha gravada, mostra só o que ele escolheu', async () => {
    await abrirAbaEnvio([1, 33]);

    expect(marcada('Correios PAC')).toBe(true);
    expect(marcada('JeT Standard')).toBe(true);
    expect(marcada('Correios SEDEX')).toBe(false);
  });

  it('desmarcar a primeira parte de tudo marcado e salva o resto', async () => {
    await abrirAbaEnvio([]);

    fireEvent.click(caixaDe('JeT Standard'));
    fireEvent.click(screen.getByText('Salvar transportadoras'));

    await waitFor(() =>
      expect(updateShipping).toHaveBeenCalledWith({ services: [1, 2, 17], acceptsPickup: true }),
    );
  });

  it('avisa e bloqueia o salvar quando a seleção não cobre o Brasil', async () => {
    // Este é o erro que ninguém vê: o comprador de outro estado não enxerga
    // frete, não fecha a compra e vai embora, sem erro na tela de ninguém.
    await abrirAbaEnvio([17, 33]);

    expect(screen.getByText(/loja ficaria invisível fora da região/)).toBeTruthy();
    expect(
      screen.getByText('Salvar transportadoras').closest('button')!.hasAttribute('disabled'),
    ).toBe(true);
    expect(updateShipping).not.toHaveBeenCalled();
  });

  it('marcar um Correios tira o aviso e libera o salvar', async () => {
    await abrirAbaEnvio([17, 33]);

    fireEvent.click(caixaDe('Correios PAC'));

    await waitFor(() =>
      expect(screen.queryByText(/loja ficaria invisível fora da região/)).toBeNull(),
    );
    fireEvent.click(screen.getByText('Salvar transportadoras'));
    // Ordem não importa: quem grava ordena (ver serializarServicos no backend).
    await waitFor(() => expect(updateShipping).toHaveBeenCalled());
    expect([...updateShipping.mock.calls[0][0].services].sort()).toEqual([1, 17, 33]);
  });

  it('mostra a retirada em mãos ligada por padrão', async () => {
    await abrirAbaEnvio([]);
    const t = screen.getByText('Aceito entregar em mãos')
      .closest('div')!.parentElement!.querySelector('button[role="switch"]')!;
    expect(t.getAttribute('data-state')).toBe('checked');
  });

  it('vendedor que desligou a retirada vê o toggle desligado', async () => {
    await abrirAbaEnvio([], false);
    expect(screen.getByText(/todo pedido seu vai por transportadora/)).toBeTruthy();
  });

  it('salva a retirada desligada junto das transportadoras', async () => {
    // O comprador via "Retirada pessoal" mesmo de vendedor do outro lado do
    // país, e o vendedor é que tinha de explicar que não dava.
    await abrirAbaEnvio([], false);

    fireEvent.click(screen.getByText('Salvar transportadoras'));

    await waitFor(() => expect(updateShipping).toHaveBeenCalled());
    expect(updateShipping.mock.calls[0][0].acceptsPickup).toBe(false);
  });

  it('"voltar a aceitar todas" manda lista vazia', async () => {
    await abrirAbaEnvio([1, 33]);

    fireEvent.click(screen.getByText('Voltar a aceitar todas'));

    await waitFor(() =>
      expect(updateShipping).toHaveBeenCalledWith({ services: [], acceptsPickup: true }),
    );
  });
});

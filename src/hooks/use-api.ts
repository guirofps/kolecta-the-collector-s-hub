/**
 * useApi — hooks TanStack Query para as APIs do Kolecta backend.
 * Cada hook gerencia loading, error e cache de forma centralizada.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ── useWallet ──────────────────────────────────────────────────────────────

export function useWallet() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['wallet', 'me'],
    queryFn: async () => {
      const token = await getToken();
      return api.wallet.getMe(token!);
    },
    staleTime: 30_000, // 30s
  });
}

// ── useOrders ──────────────────────────────────────────────────────────────

export function useOrders(status?: string, page = 1) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['orders', 'buyer', status, page],
    queryFn: async () => {
      const token = await getToken();
      return api.orders.getMyOrders(token!, status, page);
    },
    staleTime: 60_000,
  });
}

export function useOrderById(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const token = await getToken();
      return api.orders.getById(token!, id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// ── useFavorites ───────────────────────────────────────────────────────────

export function useFavorites() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const token = await getToken();
      return api.favorites.getAll(token!);
    },
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const token = await getToken();
      return api.favorites.toggle(token!, listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar favoritos', variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const token = await getToken();
      return api.favorites.remove(token!, listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({ title: 'Removido', description: 'Item removido dos favoritos.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível remover o favorito', variant: 'destructive' });
    },
  });

  return { query, toggleMutation, removeMutation };
}

// ── useAddresses ───────────────────────────────────────────────────────────

export function useAddresses() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const token = await getToken();
      return api.addresses.getAll(token!);
    },
    staleTime: 120_000,
  });

  const createMutation = useMutation({
    mutationFn: async (body: Parameters<typeof api.addresses.create>[1]) => {
      const token = await getToken();
      return api.addresses.create(token!, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: 'Endereço salvo', description: 'O novo endereço foi adicionado.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível salvar o endereço', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Parameters<typeof api.addresses.update>[2] }) => {
      const token = await getToken();
      return api.addresses.update(token!, id, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: 'Endereço atualizado' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.addresses.remove(token!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: 'Endereço removido' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível remover o endereço', variant: 'destructive' });
    },
  });

  return { query, createMutation, updateMutation, removeMutation };
}

// ── useWithdrawals ─────────────────────────────────────────────────────────

export function useWithdrawals() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['withdrawals', 'me'],
    queryFn: async () => {
      const token = await getToken();
      return api.withdrawals.getMyWithdrawals(token!);
    },
    staleTime: 30_000,
  });

  const requestMutation = useMutation({
    mutationFn: async (amountInCents: number) => {
      const token = await getToken();
      return api.withdrawals.request(token!, amountInCents);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({
        title: 'Saque solicitado',
        description: `R$ ${(data.amountInCents / 100).toFixed(2).replace('.', ',')} será transferido em até 2 dias úteis.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro no saque',
        description: err.message ?? 'Não foi possível processar o saque',
        variant: 'destructive',
      });
    },
  });

  return { query, requestMutation };
}

// ── useDeposit ─────────────────────────────────────────────────────────────

export function useDeposit() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (amountInCents: number) => {
      const token = await getToken();
      return api.deposits.createCheckoutSession(token!, amountInCents);
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: any) => {
      toast({
        title: 'Erro no depósito',
        description: err.message ?? 'Não foi possível iniciar o depósito',
        variant: 'destructive',
      });
    },
  });

  return mutation;
}

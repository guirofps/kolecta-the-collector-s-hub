/**
 * useApi — hooks TanStack Query para as APIs do Kolecta backend.
 * Cada hook gerencia loading, error e cache de forma centralizada.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ── useMyProfile ───────────────────────────────────────────────────────────

export function useMyProfile() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const token = await getToken();
      return api.users.getMe(token || '');
    },
    staleTime: 5 * 60_000, // 5 min — role não muda com frequência
    retry: 1,
  });
}

// ── useListing ─────────────────────────────────────────────────────────────

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.listings.getById(id!),
    enabled: !!id,
    staleTime: 60_000, // 60s — listings não mudam com frequência
    retry: 1,
  });
}

export function useListings(limit = 20, offset = 0, q?: string) {
  return useQuery({
    queryKey: ['listings', limit, offset, q],
    queryFn: () => api.listings.getAll(limit, offset, q),
    staleTime: 60_000,
  });
}

export function useMyListings() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const token = await getToken();
      return api.listings.getMine(token || '');
    },
    staleTime: 30_000,
  });
}

// ── Admin Hooks ────────────────────────────────────────────────────────────

export function useAdminListings(status?: string, limit = 50, offset = 0) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin-listings', status, limit, offset],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getListings(token || '', status, limit, offset);
    },
    staleTime: 10_000,
  });
}

export function useUpdateListingStatus() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = await getToken();
      return api.admin.updateListingStatus(token || '', id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      toast({ title: 'Status atualizado com sucesso!' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

// ── useCreateListing ───────────────────────────────────────────────────────

export function useCreateListing() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: import('@/lib/api').CreateListingPayload) => {
      const token = await getToken();
      return api.listings.create(token || '', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({
        title: 'Anúncio criado!',
        description: 'Seu item foi enviado para análise da equipe Kolecta.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao criar anúncio',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}
// ── useUpdateListing ───────────────────────────────────────────────────────

export function useUpdateListing() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<import('@/lib/api').CreateListingPayload> }) => {
      const token = await getToken();
      return api.listings.update(token || '', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({ title: 'Anúncio atualizado!' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao atualizar anúncio',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.listings.remove(token || '', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({ title: 'Anúncio excluído!' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao excluir anúncio',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}
// ── useTogglePauseListing ──────────────────────────────────────────────────

export function useTogglePauseListing() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.listings.togglePause(token || '', id);
    },
    onSuccess: (listing) => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      const isPaused = listing.status === 'paused';
      toast({
        title: isPaused ? 'Anúncio pausado' : 'Anúncio reativado',
        description: isPaused
          ? 'Seu anúncio não aparece mais no marketplace.'
          : 'Seu anúncio está visível novamente.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao alterar status',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

// ── useWallet ──────────────────────────────────────────────────────────────

export function useWallet() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['wallet', 'me'],
    queryFn: async () => {
      const token = await getToken();
      return api.wallet.getMe(token!);
    },
    staleTime: 30_000,
  });
}

export function useWalletTransactions() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: async () => {
      const token = await getToken();
      return api.wallet.getTransactions(token!);
    },
    staleTime: 30_000,
  });
}

export function useWalletDeposit() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (amountInCents: number) => {
      const token = await getToken();
      return api.wallet.deposit(token!, amountInCents);
    },
    onSuccess: (data) => {
      // Redireciona para o checkout da Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao iniciar depósito',
        description: err.message,
        variant: 'destructive',
      });
    },
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

// ── useConnect ─────────────────────────────────────────────────────────────

export function useConnect() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();

  const statusQuery = useQuery({
    queryKey: ['connect', 'status'],
    queryFn: async () => {
      const token = await getToken();
      return api.connect.getStatus(token!);
    },
    staleTime: 60_000,
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.connect.onboard(token!);
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao iniciar configuração',
        description: err.message ?? 'Não foi possível iniciar o onboarding',
        variant: 'destructive',
      });
    },
  });

  const loginLinkMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.connect.loginLink(token!);
    },
    onSuccess: ({ url }) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao abrir painel Stripe',
        description: err.message ?? 'Não foi possível gerar o link',
        variant: 'destructive',
      });
    },
  });

  const bankAccountQuery = useQuery({
    queryKey: ['connect', 'bank-account'],
    queryFn: async () => {
      const token = await getToken();
      return api.connect.getBankAccount(token!);
    },
    enabled: !!isSignedIn && statusQuery.data?.status === 'active',
  });

  return { statusQuery, onboardMutation, loginLinkMutation, bankAccountQuery };
}

// ── useCreateCheckout ──────────────────────────────────────────────────────

export function useCreateCheckout() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (body: { items: { listingId: string }[]; addressId?: string; useWalletBalance?: boolean }) => {
      const token = await getToken();
      return api.orders.createCheckout(token!, body);
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao iniciar pagamento',
        description: err.message ?? 'Não foi possível iniciar o checkout. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}


// ── useBulkImport ──────────────────────────────────────────────────────────

export function useBulkImport() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      return api.listings.importFile(token || '', file);
    },
    onError: (err: any) => {
      toast({
        title: 'Erro na importação',
        description: err.message ?? 'Não foi possível processar o arquivo.',
        variant: 'destructive',
      });
    },
  });
}

// ── useImportJobStatus ─────────────────────────────────────────────────────

export function useImportJobStatus(jobId: string | null) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['import-job', jobId],
    queryFn: async () => {
      const token = await getToken();
      return api.listings.getImportJob(token || '', jobId!);
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'processing') return 2000;
      return false;
    },
  });
}

// ── Auction Hooks ──────────────────────────────────────────────────────────

export function useAuctions() {
  return useQuery({
    queryKey: ['auctions'],
    queryFn: () => api.auctions.getAll(),
    staleTime: 30_000,
  });
}

export function useMyBids() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['auctions', 'bids', 'mine'],
    queryFn: async () => {
      const token = await getToken();
      return api.auctions.getMyBids(token!);
    },
    staleTime: 30_000,
  });
}

export function useSellerAuctions() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['auctions', 'seller', 'mine'],
    queryFn: async () => {
      const token = await getToken();
      return api.auctions.getSellerAuctions(token!);
    },
    staleTime: 30_000,
  });
}

export function usePlaceBid() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ auctionId, amountInCents }: { auctionId: string; amountInCents: number }) => {
      const token = await getToken();
      return api.auctions.placeBid(token!, auctionId, amountInCents);
    },
    onSuccess: (_, { auctionId }) => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      toast({ title: 'Lance registrado!', description: 'Você está liderando o leilão.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao dar lance', description: err.message, variant: 'destructive' });
    },
  });
}

export function useEndAuction() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (auctionId: string) => {
      const token = await getToken();
      return api.auctions.end(token!, auctionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast({ title: 'Leilão encerrado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao encerrar leilão', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Admin Hooks ────────────────────────────────────────────────────────────

export function useAdminStats() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getStats(token!);
    },
    staleTime: 60_000,
  });
}

export function useAdminUsers(limit = 50, offset = 0) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'users', limit, offset],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getUsers(token!, limit, offset);
    },
    staleTime: 30_000,
  });
}

export function useUpdateUserRole() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'admin' }) => {
      const token = await getToken();
      return api.admin.updateUserRole(token!, userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'Role atualizada!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar role', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAdminSellers(verified?: boolean) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'sellers', verified],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getSellers(token!, verified);
    },
    staleTime: 30_000,
  });
}

export function useVerifySeller() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sellerProfileId, verified }: { sellerProfileId: string; verified: boolean }) => {
      const token = await getToken();
      return api.admin.verifySeller(token!, sellerProfileId, verified);
    },
    onSuccess: (_, { verified }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sellers'] });
      toast({ title: verified ? 'Vendedor verificado!' : 'Verificação removida.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAdminDisputes(status?: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'disputes', status],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getDisputes(token!, status);
    },
    staleTime: 30_000,
  });
}

export function useResolveDispute() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ disputeId, body }: { disputeId: string; body: { status: string; resolution?: string } }) => {
      const token = await getToken();
      return api.admin.resolveDispute(token!, disputeId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      toast({ title: 'Disputa atualizada!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao resolver disputa', description: err.message, variant: 'destructive' });
    },
  });
}

// ── useStartConversationFromOrder ──────────────────────────────────────────

export function useStartConversationFromOrder() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const token = await getToken();
      return api.messages.startFromOrder(token!, orderId);
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao abrir chat', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Bling Hooks ────────────────────────────────────────────────────────────

export function useBlingStatus() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['bling', 'status'],
    queryFn: async () => {
      const token = await getToken();
      return api.bling.getStatus(token!);
    },
    staleTime: 30_000,
  });
}

export function useBlingDisconnect() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.bling.disconnect(token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bling'] });
      toast({ title: 'Bling desconectado.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao desconectar', description: err.message, variant: 'destructive' });
    },
  });
}

// ── useUploadImage ─────────────────────────────────────────────────────────

export function useUploadImage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      return api.media.upload(token || '', file);
    },
    onError: (err: any) => {
      toast({
        title: 'Erro no upload',
        description: err.message ?? 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
    },
  });
}

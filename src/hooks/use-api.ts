/**
 * useApi — hooks TanStack Query para as APIs do Kolecta backend.
 * Cada hook gerencia loading, error e cache de forma centralizada.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import type { OrderStatus, CreateRecipientPayload, LabelFileKind } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { hasLaunched } from '@/lib/launch';
import { CATALOGO_STALE_MS, LIMITE_CATALOGO } from '@/lib/catalogo';
import { lerCatalogo, guardarCatalogo } from '@/lib/catalogo-cache';
import { CLERK_ENABLED } from '@/lib/clerk';
import { COMMISSION_RATE } from '@/lib/fees';

/**
 * Token do Clerk, sem derrubar a tela quando o Clerk não está montado.
 *
 * Sem a chave publicável, `main.tsx` não monta o `ClerkProvider` (o modo
 * degradado que o AuthContext prevê), e o `useAuth` do Clerk LANÇA erro fora do
 * provider. Como os hooks daqui chamavam o Clerk direto, qualquer tela com dado
 * quebrava em branco nesse ambiente. Foi o que derrubou a página de categoria:
 * o ProductCard estourava e levava a lista inteira junto.
 *
 * `CLERK_ENABLED` vem de env e não muda em runtime, então o branch é estável
 * entre renders e a ordem dos hooks nunca varia. É o mesmo padrão já usado no
 * AuthContext, que separa ClerkAuthProvider de DegradedAuthProvider.
 */
function useAuth(): { getToken: () => Promise<string | null>; isSignedIn: boolean } {
  // `isSignedIn` também entra: `useConnect` usa, e devolver só `getToken`
  // deixava `isSignedIn` como undefined em toda query que dependia dele.
  if (!CLERK_ENABLED) return { getToken: async () => null, isSignedIn: false };
  // eslint-disable-next-line react-hooks/rules-of-hooks -- constante de env, ver acima
  const clerk = useClerkAuth();
  return { getToken: clerk.getToken, isSignedIn: !!clerk.isSignedIn };
}

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

// ── useFounderBadge ──────────────────────────────────────────────────────────

/** Selo público de um usuário (para render no card/perfil). null se não-fundador. */
export function useFounderBadge(userId: string | undefined) {
  return useQuery({
    queryKey: ['founder-badge', userId],
    queryFn: () => api.founder.getBadge(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000, // 5 min — número de fundador é permanente
    retry: 1,
  });
}

/** Estado do programa Fundador para o usuário logado. */
export function useMyFounder() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['my-founder'],
    queryFn: async () => {
      const token = await getToken();
      return api.founder.getMe(token || '');
    },
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * O usuário é Fundador CONFIRMADO, com direito aos benefícios?
 *
 * Antes de 25/07 ninguém é: a seleção é curada pela equipe e o resultado só sai
 * na data. O backend, porém, atribui número sozinho ao avaliar a qualificação
 * na leitura (ver o comentário em api.founder.getMe), então quem só cumpriu os
 * 5 anúncios já aparecia como fundador, com selo no perfil e créditos no painel,
 * sem ninguém ter escolhido. Esta trava segura isso até a virada.
 *
 * Fonte única: mudou aqui, muda em todo lugar que mostra benefício de fundador.
 */
export function useIsFounderActive(): boolean {
  const { data } = useMyFounder();
  return hasLaunched() && data?.founderStatus === 'active';
}

/**
 * A comissão que o usuário logado paga de verdade, como fração (0.09 ou 0.11).
 *
 * Quem decide é o backend, em `resolveCommissionPercent` — o mesmo cálculo que
 * fecha o pedido e o leilão. Antes disso o front tinha 11% cravado em
 * `fees.ts`, então o fundador via 11% no wizard de anúncio enquanto era cobrado
 * 9%: a conta de "quanto vou receber" saía errada justamente para quem tem a
 * melhor taxa.
 *
 * Cai na taxa base enquanto a requisição não voltou, ou se ela falhar. É o
 * valor que vale para a maioria, e errar para MENOS na promessa de repasse é
 * melhor do que prometer 9% para quem paga 11%.
 */
export function useCommissionRate(): number {
  const { data } = useMyFounder();
  const pct = data?.commissionPercent;
  return typeof pct === 'number' && pct > 0 ? pct / 100 : COMMISSION_RATE;
}

/** Consome 1 crédito de destaque do fundador em um anúncio. */
export function useUseFounderCredit() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const token = await getToken();
      return api.founder.useCredit(token || '', listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-founder'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({ title: 'Anúncio em destaque por 7 dias! ✨' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Não foi possível destacar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

// ── Seller self profile (loja / políticas / notificações) ────────────────────

export function useSellerSelfProfile() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['seller-self-profile'],
    queryFn: async () => {
      const token = await getToken();
      return api.sellerSelf.getProfile(token || '');
    },
    staleTime: 60_000,
  });
}

export function useUpdateSellerProfile() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: import('@/lib/api').UpdateSellerProfileBody) => {
      const token = await getToken();
      return api.sellerSelf.updateProfile(token || '', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-self-profile'] });
      toast({ title: 'Perfil salvo' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar perfil', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSellerPolicies() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: import('@/lib/api').UpdateSellerPoliciesBody) => {
      const token = await getToken();
      return api.sellerSelf.updatePolicies(token || '', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-self-profile'] });
      toast({ title: 'Políticas salvas' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar políticas', description: err.message, variant: 'destructive' });
    },
  });
}

/**
 * Transportadoras que o vendedor topa usar.
 *
 * O backend recusa uma seleção sem cobertura nacional, e a mensagem dele explica
 * por quê. Por isso o erro vai para o toast inteiro, sem texto genérico por
 * cima: é a única chance de o vendedor entender que estava prestes a ficar
 * invisível para outros estados.
 */
export function useUpdateSellerShipping() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (v: { services: number[]; acceptsPickup: boolean }) => {
      const token = await getToken();
      return api.sellerSelf.updateShipping(token || '', v.services, v.acceptsPickup);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-self-profile'] });
      toast({ title: 'Transportadoras salvas' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Não foi possível salvar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (prefs: Record<string, { email?: boolean; push?: boolean }>) => {
      const token = await getToken();
      return api.sellerSelf.updateNotificationPrefs(token || '', prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-self-profile'] });
      toast({ title: 'Preferências salvas' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar preferências', description: err.message, variant: 'destructive' });
    },
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
  // Catálogo cheio (home, categoria, busca, produto): sem busca de texto e a
  // partir do começo. Esse caso busca TODAS as páginas até esgotar, sem teto,
  // e aproveita o que ficou da visita anterior. Uma consulta com termo é outra
  // pergunta e não entra nessa via.
  const catalogoCheio = !q && offset === 0 && limit >= LIMITE_CATALOGO;

  return useQuery({
    queryKey: ['listings', limit, offset, q],
    queryFn: async () => {
      // Sem teto: página a página até a API acabar. Antes um número fixo
      // escondia o que passasse dele, e o catálogo só cresce.
      const dados = catalogoCheio
        ? await api.listings.getAllPaged()
        : await api.listings.getAll(limit, offset, q);
      if (catalogoCheio) guardarCatalogo(dados);
      return dados;
    },
    // A listagem leva vários segundos para responder. Com 60s, quem navegava
    // por mais de um minuto pagava a espera de novo; 5 min é bem mais do que a
    // diferença que um anúncio novo faz na vitrine (ver lib/catalogo).
    staleTime: CATALOGO_STALE_MS,
    // Mantém o que já estava na tela enquanto revalida, em vez de voltar para
    // o esqueleto de carregamento a cada troca de página.
    placeholderData: (anterior) => anterior,
    // A vitrine da visita passada, para a página pintar na hora em vez de
    // começar com vários segundos de esqueleto. Vem como `initialData` com
    // `updatedAt` antigo de propósito: o React Query trata como já vencida e
    // busca a lista atual por trás, sem tirar o conteúdo da tela.
    initialData: catalogoCheio ? lerCatalogo() : undefined,
    initialDataUpdatedAt: 0,
  });
}

// ── useCategories ────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.getAll(),
    staleTime: 5 * 60_000, // 5 min — categorias mudam raramente
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
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const token = await getToken();
      return api.admin.updateListingStatus(token || '', id, status, reason);
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

// ── Moderação em lote ───────────────────────────────────────────────────────

export interface ItemLote {
  id: string;
  /** Motivo já montado para ESTE anúncio (a reprovação inclui o detalhe dele). */
  reason?: string;
}

export interface ResultadoLote {
  ok: number;
  falhas: { id: string; erro: string }[];
}

/**
 * Aprova ou reprova vários anúncios de uma vez.
 *
 * Não é um laço em cima de `useUpdateListingStatus`: aquele dispara um toast e
 * invalida três caches por chamada, o que com 200 anúncios significaria 200
 * toasts empilhados e 600 refetches concorrentes. Aqui o cache é invalidado uma
 * vez, no fim.
 *
 * As requisições vão EM SÉRIE, de propósito. O backend é um serviço só e um
 * disparo paralelo de centenas de PATCH derrubaria a moderação inteira no meio
 * do caminho. `onProgress` existe para a tela mostrar que está andando.
 *
 * Falha de um item não interrompe o lote: quem deu erro volta na lista para
 * uma segunda tentativa, em vez de perder o trabalho todo por causa de um.
 */
export function useBulkUpdateListingStatus() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      itens,
      status,
      onProgress,
    }: {
      itens: ItemLote[];
      status: string;
      onProgress?: (feitos: number, total: number) => void;
    }): Promise<ResultadoLote> => {
      const token = await getToken();
      const falhas: { id: string; erro: string }[] = [];
      let ok = 0;

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        try {
          await api.admin.updateListingStatus(token || '', item.id, status, item.reason);
          ok++;
        } catch (err) {
          falhas.push({ id: item.id, erro: err instanceof Error ? err.message : 'erro desconhecido' });
        }
        onProgress?.(i + 1, itens.length);
      }

      return { ok, falhas };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

// ── Programa Fundador (admin) ───────────────────────────────────────────────

export function useFounderCandidates() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin-founder-candidates'],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getFounderCandidates(token || '');
    },
    staleTime: 10_000,
  });
}

export function useGrantFounder() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, number }: { userId: string; number: number }) => {
      const token = await getToken();
      return api.admin.grantFounder(token || '', userId, number);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-founder-candidates'] });
      toast({
        title: 'Fundador concedido',
        description: `Selo #${String(data.founderNumber).padStart(3, '0')} atribuído.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Não foi possível conceder',
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

// ── usePublishListing (peneira de requisitos) ──────────────────────────────

export function usePublishListing() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.listings.publish(token || '', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({
        title: 'Anúncio publicado',
        description: 'Seu anúncio está no ar no marketplace.',
      });
    },
    onError: (err: Error) => {
      // A mensagem já traz o que falta (descrição, fotos, frete...).
      toast({
        title: 'Não foi possível publicar',
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      amountInCents: number;
      cpf: string;
      phone: string;
    }) => {
      const token = await getToken();
      return api.wallet.deposit(token!, payload);
    },
    // Não redireciona: o PIX é embutido. A tela renderiza o QR Code a partir
    // do `data` retornado. O crédito na wallet ocorre via webhook order.paid.
    onError: (err: any) => {
      toast({
        title: 'Erro ao gerar PIX',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

// ── useOrders ──────────────────────────────────────────────────────────────

export function useOrders(status?: string, page = 1, limit = 10) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['orders', 'buyer', status, page, limit],
    queryFn: async () => {
      const token = await getToken();
      return api.orders.getMyOrders(token!, status, page, limit);
    },
    staleTime: 60_000,
  });
}

export function useOrderById(id: string, opts?: { pollWhilePending?: boolean }) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const token = await getToken();
      return api.orders.getById(token!, id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    // Pagamento PIX é assíncrono: enquanto o pedido está 'pending', refaz a
    // busca a cada 4s até o webhook confirmar (status vira 'paid').
    refetchInterval: opts?.pollWhilePending
      ? (query) => (query.state.data?.status === 'pending' ? 4000 : false)
      : false,
  });
}

// ── useSellerOrders (pedidos recebidos pelo vendedor) ────────────────────────

export function useSellerOrders() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['orders', 'seller'],
    queryFn: async () => {
      const token = await getToken();
      return api.orders.getMySales(token!);
    },
    staleTime: 60_000,
  });
}

// ── useUpdateOrderStatus (vendedor marca enviado / etc.) ─────────────────────

export function useUpdateOrderStatus() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vars: { id: string; status: OrderStatus; trackingCode?: string; deliveryMethod?: 'shipping' | 'pickup' }) => {
      const token = await getToken();
      return api.orders.updateStatus(token!, vars.id, vars.status, vars.trackingCode, vars.deliveryMethod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Pedido atualizado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar pedido', description: err.message, variant: 'destructive' });
    },
  });
}

// ── useConfirmDelivery (comprador confirma recebimento) ──────────────────────

export function useConfirmDelivery() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.orders.confirmDelivery(token!, id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({ title: 'Recebimento confirmado', description: 'O pagamento será liberado ao vendedor.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao confirmar recebimento', description: err.message, variant: 'destructive' });
    },
  });
}

// ── useCancelOrder (comprador cancela pedido pendente / PIX não pago) ────────

export function useCancelOrder() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.orders.cancel(token!, id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({ title: 'Pedido cancelado', description: 'O anúncio voltou a ficar disponível.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Não foi possível cancelar', description: err.message, variant: 'destructive' });
    },
  });
}

// ── usePayAuctionOrder (vencedor paga arremate pendente no cartão) ───────────

export function usePayAuctionOrder() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const token = await getToken();
      return api.auctions.payOrder(token!, orderId);
    },
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({
        title: 'Pagamento confirmado',
        description: 'O arremate foi pago com sucesso.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Não foi possível pagar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

// ── useMarkDelivered (vendedor marca pedido como entregue) ───────────────────

export function useMarkDelivered() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.orders.markDelivered(token!, id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      toast({ title: 'Pedido marcado como entregue' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao marcar entrega', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export function useGivenReviews() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['reviews', 'given'],
    queryFn: async () => {
      const token = await getToken();
      return api.reviews.getGiven(token!);
    },
    staleTime: 60_000,
  });
}

export function useReceivedReviews() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['reviews', 'received'],
    queryFn: async () => {
      const token = await getToken();
      return api.reviews.getReceived(token!);
    },
    staleTime: 60_000,
  });
}

export function useCreateReview() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { orderId: string; rating: number; comment?: string }) => {
      const token = await getToken();
      return api.reviews.create(token!, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Avaliação enviada!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao enviar avaliação', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Disputes (comprador) ─────────────────────────────────────────────────────

export function useDisputes() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['disputes', 'mine'],
    queryFn: async () => {
      const token = await getToken();
      return api.disputes.getMine(token!);
    },
    staleTime: 30_000,
  });
}

export function useDisputeEligibleOrders(enabled = true) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['disputes', 'eligible-orders'],
    queryFn: async () => {
      const token = await getToken();
      return api.disputes.getEligibleOrders(token!);
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useDispute(id: string | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['disputes', id],
    queryFn: async () => {
      const token = await getToken();
      return api.disputes.getById(token!, id!);
    },
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCreateDispute() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { orderId: string; reason: string; description: string }) => {
      const token = await getToken();
      return api.disputes.create(token!, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Disputa aberta', description: 'Acompanhe pelo painel de disputas.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao abrir disputa', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAddDisputeMessage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const token = await getToken();
      return api.disputes.addMessage(token!, id, content);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['disputes', id] });
      queryClient.invalidateQueries({ queryKey: ['disputes', 'mine'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao enviar resposta', description: err.message, variant: 'destructive' });
    },
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

// ── useSavedCard (cartão salvo p/ lance por cartão) ─────────────────────────

export function useSavedCard() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['saved-card'],
    queryFn: async () => {
      const token = await getToken();
      return api.cards.get(token!);
    },
    staleTime: 120_000,
  });

  const saveMutation = useMutation({
    // Recebe o card_token já tokenizado no front (PCI) e o troca por um cartão
    // salvo. CPF/telefone seguem junto quando informados: a Pagar.me exige os
    // dois no customer para autorizar a cobrança do lance.
    mutationFn: async (vars: {
      cardToken: string;
      cpf?: string;
      phone?: string;
    }) => {
      const token = await getToken();
      return api.cards.save(token!, vars.cardToken, {
        cpf: vars.cpf,
        phone: vars.phone,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-card'] });
      toast({ title: 'Cartão salvo', description: 'Seu cartão está pronto para lances.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao salvar cartão',
        description: err?.message || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.cards.remove(token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-card'] });
      toast({ title: 'Cartão removido' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível remover o cartão', variant: 'destructive' });
    },
  });

  return { query, saveMutation, removeMutation };
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

// ── useRecipient (Pagar.me — split nativo) ──────────────────────────────────

export function useRecipient() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['recipient', 'status'],
    queryFn: async () => {
      const token = await getToken();
      return api.recipients.getStatus(token!);
    },
    staleTime: 30_000,
    // O KYC é aprovado do lado da Pagar.me e chega por webhook — a tela não tem
    // como saber sozinha. Sem este poll o vendedor fica olhando "Verificação
    // pendente" **já aprovado**, com um botão que falha, até pensar em recarregar.
    // Os 6 recebedores da conta nova viraram `active` em segundos (diagnóstico em
    // scripts/diagnostico-kyc-conta-nova.ts), então 15s pega quase todo mundo
    // ainda com a página aberta. Para de rodar assim que sai de "em análise".
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'registration' || status === 'affiliation'
        ? 15_000
        : false;
    },
  });

  const onboardMutation = useMutation({
    mutationFn: async (payload: CreateRecipientPayload) => {
      const token = await getToken();
      return api.recipients.onboard(token!, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipient', 'status'] });
      // `kyc` nulo significa DUAS coisas diferentes, e confundi-las foi o bug:
      // ou a Pagar.me já aprovou o recebedor (caso comum — ele nasce `active`,
      // e aí não existe prova de vida a fazer), ou a emissão do link falhou.
      // Quem separa é o `status`, que vem na mesma resposta. Sem isso o
      // vendedor aprovado na hora lia "o link não pôde ser gerado" e ia clicar
      // num botão que responde 409.
      const aprovado = data.status === 'active';
      toast({
        title: aprovado ? 'Cadastro aprovado' : 'Cadastro enviado',
        description: aprovado
          ? 'Recebedor criado e já aprovado — recebimentos e saques liberados.'
          : data.kyc
            ? 'Recebedor criado. Conclua a prova de vida para ativar recebimentos e saques.'
            : 'Recebedor criado e em análise. Seus dados estão salvos; esta tela avisa quando for aprovado.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao cadastrar recebedor',
        description: err.message ?? 'Não foi possível criar o recebedor.',
        variant: 'destructive',
      });
    },
  });

  const kycLinkMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.recipients.getKycLink(token!);
    },
    onError: (err: any) => {
      // 503 = o backend já traduziu "não dá para emitir o link agora" numa
      // instrução acionável (o convite chega por e-mail da Pagar.me). Vermelho
      // aí só assusta o vendedor por algo que não é culpa dele e que não
      // bloqueia a aprovação do KYC. Erro de verdade continua destructive.
      const indisponivel = err?.status === 503;
      toast({
        title: indisponivel
          ? 'Link indisponível no momento'
          : 'Erro ao gerar link de verificação',
        description: err.message ?? 'Tente novamente em instantes.',
        variant: indisponivel ? 'default' : 'destructive',
      });
    },
  });

  return { statusQuery, onboardMutation, kycLinkMutation };
}

// ── useCreateCheckout ──────────────────────────────────────────────────────

export function useCreateCheckout() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (body: { items: { listingId: string }[]; addressId?: string; shippingAddress?: { recipientName: string; street: string; number: string; complement?: string; neighborhood?: string; city: string; state: string; zip: string; country?: string }; shippingInCents?: number; shippingServiceId?: number; shippingServiceName?: string; deliveryMethod?: 'shipping' | 'pickup'; useWalletBalance?: boolean; buyerCpf?: string; buyerPhone?: string; paymentMethod?: 'pix' | 'credit_card'; cardToken?: string; installments?: number }) => {
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


// ── useInstallmentsSimulation (parcelas do cartão) ─────────────────────────

// Retorna uma função que consulta as parcelas para um valor (centavos).
// Usada sob demanda no checkout ao escolher cartão / mudar o valor.
export function useInstallmentsSimulation() {
  const { getToken } = useAuth();
  return async (amountInCents: number) => {
    const token = await getToken();
    return api.orders.installmentsSimulation(token!, amountInCents);
  };
}


/**
 * Coloca um anúncio de compra direta em leilão.
 *
 * A mensagem muda conforme o que o backend fez: converter mexeu no anúncio que
 * ele já tinha, duplicar criou um novo e tirou uma unidade do original. Dizer
 * "pronto" nos dois casos deixaria o vendedor sem entender o que aconteceu com
 * o estoque dele.
 */
export function useColocarEmLeilao() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (v: { id: string; config: import('@/lib/api').ColocarEmLeilaoBody }) => {
      const token = await getToken();
      return api.listings.colocarEmLeilao(token || '', v.id, v.config);
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({
        title: r.acao === 'converter' ? 'Anúncio virou leilão' : 'Leilão criado a partir da cópia',
        description: r.acao === 'converter'
          ? 'Como era peça única, o próprio anúncio virou leilão. Ele volta para análise antes de ir ao ar.'
          : 'Uma unidade saiu do anúncio direto e virou leilão. O resto continua à venda normalmente.',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Não foi possível colocar em leilão', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Moderação da comunidade (admin) ────────────────────────────────────────
// A coluna `status` existia em posts E comentários desde sempre, mas só post
// tinha endpoint. Descoberto com spam de concorrente em 3 dos 9 comentários.

export function useComunidadeAdmin(status: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'comunidade', status],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.comunidade(token || '', status);
    },
    staleTime: 30_000,
  });
}

export function useModerarComunidade() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (v: {
      tipo: 'post' | 'comentario';
      id: string;
      acao: 'hide' | 'remove' | 'restore';
    }) => {
      const token = await getToken();
      return api.admin.moderarComunidade(token || '', v.tipo, v.id, v.acao);
    },
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'comunidade'] });
      queryClient.invalidateQueries({ queryKey: ['community'] });
      toast({
        title:
          v.acao === 'hide' ? 'Ocultado da comunidade'
          : v.acao === 'remove' ? 'Removido'
          : 'De volta ao ar',
        description:
          v.acao === 'remove'
            ? 'O texto continua no banco, para servir de prova se o autor for banido.'
            : undefined,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Não foi possível moderar', description: err.message, variant: 'destructive' });
    },
  });
}

// ── useDownloadLabel (baixar o PDF do envio) ────────────────────────────────
// O arquivo vem do nosso backend, que busca no Melhor Envio na hora. O vendedor
// não precisa de conta lá — e nem saberia que ela existe.
//
// O padrão é `completo`: etiqueta e declaração de conteúdo na mesma folha. A
// declaração é exigida pelos Correios em envio sem nota fiscal, que é o caso de
// todo envio daqui, e antes ela simplesmente não era entregue.

const NOME_DO_ARQUIVO: Record<LabelFileKind, string> = {
  completo: 'etiqueta-e-declaracao',
  etiqueta: 'etiqueta',
  declaracao: 'declaracao-de-conteudo',
};

export function useDownloadLabel(orderId: string, tipo: LabelFileKind = 'completo') {
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const { blob, contem } = await api.shipping.labelPdf(token || '', orderId, tipo);
      // Download sem navegar: o link precisa do cabeçalho de autenticação, então
      // não dá para usar um <a href> direto.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${NOME_DO_ARQUIVO[contem] ?? 'etiqueta'}-${orderId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return contem;
    },
    onSuccess: (contem) => {
      // A declaração é emitida de forma assíncrona pelo Melhor Envio. Quando ela
      // ainda não saiu, vem só a etiqueta — e o vendedor precisa saber ANTES de
      // ir ao balcão, senão leva a recusa achando que está com tudo.
      if (tipo === 'completo' && contem !== 'completo') {
        toast({
          title: 'Baixamos só a etiqueta',
          description:
            'A declaração de conteúdo ainda está sendo emitida. Tente de novo em alguns minutos: os Correios pedem ela na postagem.',
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: 'Não foi possível baixar o arquivo',
        description: err?.message ?? 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    },
  });
}

// ── useRetryLabel (reemitir etiqueta que falhou) ────────────────────────────
// A emissão normal é automática, no pagamento/arremate. Isto é só o "tentar de
// novo" para quando ela falha — tipicamente saldo zerado na carteira do Melhor
// Envio. Não escolhe serviço: quem escolheu foi o comprador, no checkout.

export function useRetryLabel(orderId: string) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.shipping.retryLabel(token || '', orderId);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      toast({
        title: 'Etiqueta emitida',
        description: res.jaEstavaPronta
          ? 'A etiqueta já estava pronta, confira seu e-mail.'
          : 'Enviamos o PDF para o seu e-mail.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Não foi possível emitir a etiqueta',
        description: err.message ?? 'Tente novamente em alguns instantes.',
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

export function useAuctionDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: () => api.auctions.getById(id!),
    enabled: !!id,
    staleTime: 10_000,
    // Leilão é ao vivo: reflete lances de outros e a contagem regressiva.
    refetchInterval: 15_000,
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
      queryClient.invalidateQueries({ queryKey: ['auctions', 'bids', 'mine'] });
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

export function useAdminOverview() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getOverview(token!);
    },
    staleTime: 60_000,
  });
}

export function useAdminReports() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getReports(token!);
    },
    staleTime: 60_000,
  });
}

export function useAdminFinancial() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'financial'],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getFinancial(token!);
    },
    // Acompanhamento de vendas: a tela fica aberta na mesa da equipe, então
    // busca sozinha a cada 30s em vez de esperar alguém recarregar. Com 60s de
    // staleTime a venda que acabou de sair demorava para aparecer.
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useAdminAuctionsMonitor() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'auctions-monitor'],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getAuctionsMonitor(token!);
    },
    staleTime: 30_000,
  });
}

export function useAdminSellersDetailed() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'sellers-detailed'],
    queryFn: async () => {
      const token = await getToken();
      return api.admin.getSellersDetailed(token!);
    },
    staleTime: 30_000,
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'sellers-detailed'] });
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

/**
 * Leva o lojista para a tela de autorização do Bling.
 *
 * Busca a URL autenticado e só então navega. O botão antes apontava o navegador
 * direto para o backend, que respondia 401 porque navegação de página não
 * carrega o cabeçalho `Authorization`.
 */
export function useBlingConnect() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.bling.authorizeUrl(token!);
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: Error) => {
      toast({
        title: 'Não foi possível conectar ao Bling',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

/** Uma página do catálogo do Bling. `enabled` para não buscar sem conexão. */
export function useBlingProdutos(pagina: number, enabled: boolean) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['bling', 'produtos', pagina],
    queryFn: async () => {
      const token = await getToken();
      return api.bling.produtos(token || '', pagina);
    },
    enabled,
    // O catálogo do ERP não muda a cada segundo, e cada busca custa uma
    // requisição do teto de 3/s do Bling.
    staleTime: 5 * 60_000,
  });
}

/** Confere o lote sem criar nada. Sempre roda antes de importar. */
export function useBlingConferir() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: import('@/lib/api').BlingImportBody) => {
      const token = await getToken();
      return api.bling.conferir(token || '', body);
    },
    onError: (err: Error) => {
      toast({ title: 'Não foi possível conferir', description: err.message, variant: 'destructive' });
    },
  });
}

export function useBlingImportar() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: import('@/lib/api').BlingImportBody) => {
      const token = await getToken();
      return api.bling.importar(token || '', body);
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      toast({
        title: `${r.criados.length} anúncio(s) criado(s)`,
        description: r.recusados.length
          ? `${r.recusados.length} ficaram de fora, veja o motivo na lista.`
          : 'Todos entraram e estão em análise.',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Falha ao importar', description: err.message, variant: 'destructive' });
    },
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

/**
 * Upload de imagem. SEM `onError` no observer de propósito.
 *
 * Este hook é usado para enviar VÁRIAS fotos, e um `useMutation` acompanha
 * apenas a última chamada — o `onError` daqui só disparava para o último
 * arquivo, engolindo em silêncio a falha dos anteriores. Quem chama trata o
 * erro por arquivo (ver `handleFilesSelect` em CreateListing), com o nome do
 * que falhou. Chamada única deve usar try/catch em volta do `mutateAsync`.
 */
export function useUploadImage() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      return api.media.upload(token || '', file);
    },
  });
}

// ── Community ────────────────────────────────────────────────────────────────

export function useCommunityFeed(params: {
  sort?: string;
  page?: number;
  categoryId?: string;
  type?: string;
} = {}) {
  return useQuery({
    queryKey: ['community-feed', params],
    queryFn: () => api.community.getFeed(params),
    staleTime: 30_000,
  });
}

export function useCommunityHighlights() {
  return useQuery({
    queryKey: ['community-highlights'],
    queryFn: () => api.community.getHighlights(),
    staleTime: 60_000,
  });
}

export function useCommunityTrends(window: '24h' | '7d' | 'month' = '24h') {
  return useQuery({
    queryKey: ['community-trends', window],
    queryFn: () => api.community.getTrends(window),
    staleTime: 60_000,
  });
}

export function useCommunityPost(id: string | undefined) {
  return useQuery({
    queryKey: ['community-post', id],
    queryFn: () => api.community.getPost(id!),
    enabled: !!id,
  });
}

export function useCommunityComments(id: string | undefined) {
  return useQuery({
    queryKey: ['community-comments', id],
    queryFn: () => api.community.getComments(id!),
    enabled: !!id,
  });
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: import('@/lib/api').CreatePostPayload) => {
      const token = await getToken();
      return api.community.createPost(token || '', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      queryClient.invalidateQueries({ queryKey: ['community-highlights'] });
      toast({ title: 'Publicação criada!' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao publicar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

function usePostInteraction(
  action: 'toggleLike' | 'toggleSave' | 'togglePin',
) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      const token = await getToken();
      return api.community[action](token || '', postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Ação não realizada',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

export const useTogglePostLike = () => usePostInteraction('toggleLike');
export const useTogglePostSave = () => usePostInteraction('toggleSave');
export const useTogglePostPin = () => usePostInteraction('togglePin');

export function useAddCommunityComment(postId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (v: { body: string; listingId?: string }) => {
      const token = await getToken();
      return api.community.addComment(token || '', postId, v.body, v.listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao comentar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

export function useReportCommunity() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: import('@/lib/api').CreateReportPayload) => {
      const token = await getToken();
      return api.community.report(token || '', payload);
    },
    onSuccess: () => {
      toast({ title: 'Denúncia enviada', description: 'Obrigado por ajudar a moderar a comunidade.' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao denunciar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

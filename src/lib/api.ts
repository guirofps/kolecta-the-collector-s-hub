/**
 * Kolecta API Client
 * Wrapper centralizado para todas as chamadas à API do backend.
 * Suporta autenticação via Clerk JWT automaticamente.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ── Tipos base ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Função principal ──────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...init } = options;

  const devUserId = localStorage.getItem('dev_user_id') || 'seller-001';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-dev-user-id': devUserId,
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── API namespaces ────────────────────────────────────────────────────────────

export const api = {
  // ── Users ──────────────────────────────────────────────────────────────────

  users: {
    getMe: (token: string) =>
      request<{ data: UserProfile }>('/api/users/me', { token }).then(r => r.data),

    /** Registra o aceite de Termos + LGPD do cadastro (idempotente no backend). */
    recordConsent: (
      token: string,
      payload: {
        termsVersion: string;
        termsAcceptedAt: string;
        lgpdAcceptedAt: string;
      },
    ) =>
      request<{ data: UserProfile }>('/api/users/me/consent', {
        method: 'POST',
        body: JSON.stringify(payload),
        token,
      }).then(r => r.data),
  },

  // ── Founder (Programa Membro Fundador) ───────────────────────────────────────

  founder: {
    /** Selo público de um usuário. null se não for fundador. */
    getBadge: (userId: string) =>
      request<{ data: FounderBadgeData | null }>(
        `/api/founder/${userId}/badge`,
      ).then(r => r.data),

    /** Estado do programa para o usuário logado (avalia qualificação na leitura). */
    getMe: (token: string) =>
      request<FounderStatus>('/api/founder/me', { token }),

    /** Resgata um código de convite do evento presencial (#001–#050). */
    redeem: (token: string, code: string) =>
      request<unknown>('/api/founder/redeem', {
        method: 'POST',
        body: JSON.stringify({ code }),
        token,
      }),

    /** Consome 1 crédito de destaque em um anúncio (7 dias em destaque). */
    useCredit: (token: string, listingId: string) =>
      request<{ listingId: string; featuredUntil: string; creditsAvailable: number }>(
        '/api/founder/credits/use',
        { method: 'POST', body: JSON.stringify({ listingId }), token },
      ),
  },

  // ── Listings (público) ───────────────────────────────────────────────────

  listings: {
    getById: (id: string) =>
      request<{ data: Listing }>(`/api/listings/${id}`).then(r => r.data),

    getAll: (limit = 20, offset = 0, q?: string) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (q) params.set('q', q);
      return request<{ data: Listing[] }>(`/api/listings?${params}`).then(r => r.data);
    },

    getMine: (token: string) =>
      request<{ data: Listing[] }>('/api/listings/my', { token }).then(r => r.data),

    create: (token: string, data: CreateListingPayload) =>
      request<{ data: Listing }>('/api/listings', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }).then(r => r.data),

    update: (token: string, id: string, data: Partial<CreateListingPayload>) =>
      request<{ data: Listing }>(`/api/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      }).then(r => r.data),

    remove: (token: string, id: string) =>
      request<void>(`/api/listings/${id}`, { method: 'DELETE', token }),

    publish: (token: string, id: string) =>
      request<{ data: Listing }>(`/api/listings/${id}/publish`, {
        method: 'POST',
        token,
      }).then(r => r.data),

    togglePause: (token: string, id: string) =>
      request<{ data: Listing }>(`/api/listings/${id}/toggle-pause`, {
        method: 'PATCH',
        token,
      }).then(r => r.data),

    importFile: (token: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const devUserId = localStorage.getItem('dev_user_id') || 'seller-001';
      return fetch(`${BASE_URL}/api/listings/import`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-dev-user-id': devUserId,
        },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new ApiError(res.status, body?.message ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<{ data: ImportJob }>;
      }).then(r => r.data);
    },

    getImportJob: (token: string, jobId: string) =>
      request<{ data: ImportJob }>(`/api/listings/import/${jobId}`, { token }).then(r => r.data),

    getImportTemplate: () =>
      request<{ templateUrl: string }>('/api/listings/import/template'),
  },

  // ── Categories (público) ─────────────────────────────────────────────────────

  categories: {
    getAll: () =>
      request<{ data: ApiCategory[] }>('/api/categories').then(r => r.data),
  },

  // ── Community ────────────────────────────────────────────────────────────────

  community: {
    getFeed: (params: {
      sort?: string;
      page?: number;
      limit?: number;
      categoryId?: string;
      type?: string;
    } = {}) => {
      const qs = new URLSearchParams();
      if (params.sort) qs.set('sort', params.sort);
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.categoryId) qs.set('categoryId', params.categoryId);
      if (params.type) qs.set('type', params.type);
      return request<CommunityFeed>(`/api/community/feed?${qs}`);
    },

    getHighlights: () =>
      request<{ data: CommunityHighlights }>('/api/community/highlights').then(r => r.data),

    getTrends: (window: '24h' | '7d' | 'month' = '24h') =>
      request<{ data: { window: string; posts: CommunityPost[] } }>(
        `/api/community/trends?window=${window}`,
      ).then(r => r.data),

    getPost: (id: string) =>
      request<{ data: CommunityPost }>(`/api/community/posts/${id}`).then(r => r.data),

    getComments: (id: string) =>
      request<{ data: CommunityComment[] }>(`/api/community/posts/${id}/comments`).then(r => r.data),

    createPost: (token: string, payload: CreatePostPayload) =>
      request<{ data: CommunityPost }>('/api/community/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
        token,
      }).then(r => r.data),

    toggleLike: (token: string, id: string) =>
      request<{ data: { liked: boolean } }>(`/api/community/posts/${id}/like`, {
        method: 'POST',
        token,
      }).then(r => r.data),

    toggleSave: (token: string, id: string) =>
      request<{ data: { saved: boolean } }>(`/api/community/posts/${id}/save`, {
        method: 'POST',
        token,
      }).then(r => r.data),

    togglePin: (token: string, id: string) =>
      request<{ data: { pinned: boolean } }>(`/api/community/posts/${id}/pin`, {
        method: 'POST',
        token,
      }).then(r => r.data),

    addComment: (token: string, id: string, body: string) =>
      request<{ data: CommunityComment }>(`/api/community/posts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
        token,
      }).then(r => r.data),

    report: (token: string, payload: CreateReportPayload) =>
      request<{ data: unknown }>('/api/community/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
        token,
      }).then(r => r.data),
  },

  // ── Media ──────────────────────────────────────────────────────────────────

  media: {
    upload: (token: string, file: File): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      const devUserId = localStorage.getItem('dev_user_id') || 'seller-001';
      return fetch(`${BASE_URL}/api/media/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-dev-user-id': devUserId,
        },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new ApiError(res.status, body?.message ?? `HTTP ${res.status}`);
        }
        return res.json();
      });
    },
  },

  // ── Auctions ───────────────────────────────────────────────────────────────

  auctions: {
    getAll: () =>
      request<{ data: AuctionWithListing[] }>('/api/auctions').then(r => r.data),

    getById: (id: string) =>
      request<{ data: AuctionWithListing }>(`/api/auctions/${id}`).then(r => r.data),

    getMyBids: (token: string) =>
      request<{ data: MyBid[] }>('/api/auctions/bids/mine', { token }).then(r => r.data),

    getSellerAuctions: (token: string) =>
      request<{ data: AuctionWithListing[] }>('/api/auctions/seller/mine', { token }).then(r => r.data),

    placeBid: (token: string, auctionId: string, amountInCents: number) =>
      request<{ data: Bid }>(`/api/auctions/${auctionId}/bids`, {
        method: 'POST',
        body: JSON.stringify({ amountInCents }),
        token,
      }).then(r => r.data),

    end: (token: string, auctionId: string) =>
      request<{ data: AuctionWithListing }>(`/api/auctions/${auctionId}/end`, {
        method: 'POST',
        token,
      }).then(r => r.data),
  },

  // ── Admin ──────────────────────────────────────────────────────────────────

  admin: {
    getStats: (token: string) =>
      request<{ data: AdminStats }>('/api/admin/stats', { token }).then(r => r.data),

    getOverview: (token: string) =>
      request<{ data: AdminOverview }>('/api/admin/overview', { token }).then(r => r.data),

    getReports: (token: string) =>
      request<{ data: AdminReports }>('/api/admin/reports', { token }).then(r => r.data),

    getFinancial: (token: string) =>
      request<{ data: AdminFinancial }>('/api/admin/financial', { token }).then(r => r.data),

    getAuctionsMonitor: (token: string) =>
      request<{ data: AdminAuctionItem[] }>('/api/admin/auctions', { token }).then(r => r.data),

    getSellersDetailed: (token: string) =>
      request<{ data: AdminSellerDetailed[] }>('/api/admin/sellers/detailed', { token }).then(r => r.data),

    getUsers: (token: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      return request<{ data: AdminUser[] }>(`/api/admin/users?${params}`, { token }).then(r => r.data);
    },

    updateUserRole: (token: string, userId: string, role: 'user' | 'admin') =>
      request<{ data: AdminUser }>(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
        token,
      }).then(r => r.data),

    getSellers: (token: string, verified?: boolean) => {
      const params = new URLSearchParams();
      if (verified !== undefined) params.set('verified', String(verified));
      return request<{ data: AdminSellerProfile[] }>(`/api/admin/sellers?${params}`, { token }).then(r => r.data);
    },

    verifySeller: (token: string, sellerProfileId: string, verified: boolean) =>
      request<{ data: AdminSellerProfile }>(`/api/admin/sellers/${sellerProfileId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified }),
        token,
      }).then(r => r.data),

    getDisputes: (token: string, status?: string) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      return request<{ data: AdminDispute[] }>(`/api/admin/disputes?${params}`, { token }).then(r => r.data);
    },

    resolveDispute: (token: string, disputeId: string, body: { status: string; resolution?: string }) =>
      request<{ data: AdminDispute }>(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        token,
      }).then(r => r.data),

    getListings: (token: string, status?: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (status) params.set('status', status);
      return request<{ data: Listing[] }>(`/api/admin/listings?${params}`, { token }).then(r => r.data);
    },

    updateListingStatus: (token: string, id: string, status: string) =>
      request<{ data: Listing }>(`/api/admin/listings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        token,
      }).then(r => r.data),
  },

  // ── Wallet ─────────────────────────────────────────────────────────────────

  wallet: {
    getMe: (token: string) =>
      request<{ data: WalletData }>('/api/wallet/me', { token }).then(r => r.data),

    getTransactions: (token: string) =>
      request<{ data: WalletTransaction[] }>('/api/wallet/transactions', { token }).then(r => r.data),

    deposit: (
      token: string,
      payload: { amountInCents: number; cpf: string; phone: string },
    ) =>
      request<{ data: PixDeposit }>('/api/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify(payload),
        token,
      }).then(r => r.data),
  },

  // ── Orders ─────────────────────────────────────────────────────────────────

  orders: {
    getMyOrders: (token: string, status?: string, page = 1, limit = 10) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status && status !== 'todos') params.set('status', status);
      return request<{ data: Order[] }>(`/api/orders/my/purchases?${params}`, { token }).then(r => r.data);
    },

    getMySales: (token: string) =>
      request<{ data: Order[] }>('/api/orders/my/sales', { token }).then(r => r.data),

    getById: (token: string, id: string) =>
      request<{ data: Order }>(`/api/orders/${id}`, { token }).then(r => r.data),

    updateStatus: (token: string, id: string, status: OrderStatus, trackingCode?: string) =>
      request<{ data: Order }>(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(trackingCode ? { trackingCode } : {}) }),
        token,
      }).then(r => r.data),

    // Vendedor marca como entregue (inicia janela de verificação)
    markDelivered: (token: string, id: string) =>
      request<{ data: Order }>(`/api/orders/${id}/deliver`, {
        method: 'PATCH',
        token,
      }).then(r => r.data),

    // Comprador confirma recebimento → libera saldo retido ao vendedor
    confirmDelivery: (token: string, id: string) =>
      request<{ data: Order }>(`/api/orders/${id}/confirm-delivery`, {
        method: 'POST',
        token,
      }).then(r => r.data),

    createCheckout: (token: string, body: { items: { listingId: string }[]; addressId?: string; useWalletBalance?: boolean; buyerCpf?: string; buyerPhone?: string }) =>
      request<{
        orderId: string;
        totalInCents: number;
        walletDeducted?: number;
        chargeAmount?: number;
        paidViaWallet?: boolean;
        // Cobrança PIX (quando não é 100% saldo de wallet)
        pagarmeOrderId?: string;
        qrCode?: string; // copia-e-cola
        qrCodeUrl?: string; // imagem do QR
        expiresAt?: string;
      }>(
        '/api/orders/checkout',
        { method: 'POST', body: JSON.stringify(body), token },
      ),
  },

  // ── Favorites ──────────────────────────────────────────────────────────────

  favorites: {
    getAll: (token: string) =>
      request<{ data: Favorite[] }>('/api/favorites', { token }).then(r => r.data),

    toggle: (token: string, listingId: string) =>
      request<{ favorited: boolean; data?: Favorite }>('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ listingId }),
        token,
      }),

    remove: (token: string, listingId: string) =>
      request<void>(`/api/favorites/${listingId}`, { method: 'DELETE', token }),
  },

  // ── Addresses ──────────────────────────────────────────────────────────────

  addresses: {
    getAll: (token: string) =>
      request<{ data: Address[] }>('/api/addresses', { token }).then(r => r.data),

    create: (token: string, body: CreateAddressPayload) =>
      request<{ data: Address }>('/api/addresses', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }).then(r => r.data),

    update: (token: string, id: string, body: Partial<CreateAddressPayload>) =>
      request<{ data: Address }>(`/api/addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        token,
      }).then(r => r.data),

    remove: (token: string, id: string) =>
      request<void>(`/api/addresses/${id}`, { method: 'DELETE', token }),
  },

  // ── Withdrawals ────────────────────────────────────────────────────────────

  withdrawals: {
    getMyWithdrawals: (token: string) =>
      request<{ data: Withdrawal[] }>('/api/withdrawals/me', { token }).then(r => r.data),

    request: (token: string, amountInCents: number) =>
      request<{ data: Withdrawal }>('/api/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ amountInCents }),
        token,
      }).then(r => r.data),
  },

  // ── Deposits ───────────────────────────────────────────────────────────────

  deposits: {
    createCheckoutSession: (token: string, amountInCents: number) =>
      request<{ url: string }>('/api/deposits/checkout-session', {
        method: 'POST',
        body: JSON.stringify({ amountInCents }),
        token,
      }),
  },

  // ── Connect (Stripe Express) ────────────────────────────────────────────────

  connect: {
    onboard: (token: string) =>
      request<{ data: { url: string } }>('/api/connect/onboard', {
        method: 'POST',
        token,
      }).then((r) => r.data),

    loginLink: (token: string) =>
      request<{ data: { url: string } }>('/api/connect/login', {
        method: 'POST',
        token,
      }).then((r) => r.data),

    getStatus: (token: string) =>
      request<{ data: ConnectStatus }>('/api/connect/status', { token }).then((r) => r.data),

    getBankAccount: (token: string) =>
      request<{ data: { bankName: string; last4: string; status: string } | null }>('/api/connect/bank-account', { token }).then((r) => r.data),
  },

  // ── Recipients (Pagar.me — split nativo) ─────────────────────────────────────

  recipients: {
    onboard: (token: string, payload: CreateRecipientPayload) =>
      request<{ data: { recipientId: string; status: string; kyc: RecipientKycLink } }>(
        '/api/recipients/onboard',
        { method: 'POST', body: JSON.stringify(payload), token },
      ).then((r) => r.data),

    getStatus: (token: string) =>
      request<{ data: RecipientStatusData }>('/api/recipients/status', { token }).then((r) => r.data),

    getKycLink: (token: string) =>
      request<{ data: RecipientKycLink }>('/api/recipients/kyc-link', {
        method: 'POST',
        token,
      }).then((r) => r.data),
  },

  messages: {
    getConversations: (token: string) =>
      request<{ data: Conversation[] }>('/api/messages/conversations', { token }).then((r) => r.data),

    getConversation: (token: string, id: string) =>
      request<{ data: { conversation: Conversation; messages: Message[] } }>(`/api/messages/conversations/${id}`, { token }).then((r) => r.data),

    startConversation: (token: string, body: { listingId: string; message: string }) =>
      request<{ data: { conversationId: string; message: Message } }>('/api/messages/conversations', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }).then((r) => r.data),

    startFromOrder: (token: string, orderId: string) =>
      request<{ data: { conversationId: string } }>(`/api/messages/from-order/${orderId}`, {
        method: 'POST',
        token,
      }).then((r) => r.data),

    sendMessage: (token: string, id: string, content: string) =>
      request<{ data: Message }>(`/api/messages/conversations/${id}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
        token,
      }).then((r) => r.data),

    markAsRead: (token: string, id: string) =>
      request<{ success: boolean }>(`/api/messages/conversations/${id}/read`, {
        method: 'PATCH',
        token,
      }),
  },

  // ── Bling ──────────────────────────────────────────────────────────────────

  bling: {
    getStatus: (token: string) =>
      request<{ data: BlingStatus }>('/api/bling/status', { token }).then(r => r.data),

    disconnect: (token: string) =>
      request<{ data: BlingStatus }>('/api/bling/disconnect', { method: 'DELETE', token }).then(r => r.data),
  },

  // ── Seller (self, autenticado) ───────────────────────────────────────────────
  sellerSelf: {
    getProfile: (token: string) =>
      request<{ data: SellerSelfProfile }>('/api/seller/profile', { token }).then(r => r.data),

    updateProfile: (token: string, body: UpdateSellerProfileBody) =>
      request<{ data: SellerSelfProfile }>('/api/seller/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
        token,
      }).then(r => r.data),

    updatePolicies: (token: string, body: UpdateSellerPoliciesBody) =>
      request<{ data: SellerSelfProfile }>('/api/seller/policies', {
        method: 'PUT',
        body: JSON.stringify(body),
        token,
      }).then(r => r.data),

    updateNotificationPrefs: (
      token: string,
      prefs: Record<string, { email?: boolean; push?: boolean }>,
    ) =>
      request<{ data: SellerSelfProfile }>('/api/seller/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify({ prefs }),
        token,
      }).then(r => r.data),
  },

  // ── Sellers ────────────────────────────────────────────────────────────────
  sellers: {
    getProfile: (id: string) =>
      request<SellerProfile>(`/api/sellers/${id}`),

    getListings: (id: string, params?: { page?: number; limit?: number; categoryId?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request<{ data: Listing[]; meta: PaginationMeta }>(`/api/sellers/${id}/listings${query}`);
    },

    getReviews: (id: string, params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request<{ data: SellerReview[]; meta: PaginationMeta }>(`/api/sellers/${id}/reviews${query}`);
    },
  },

  // ── Shipping ─────────────────────────────────────────────────────────────────
  shipping: {
    // Cotação real (Melhor Envio). Origem e pacote são resolvidos no backend a
    // partir do `listing_id` (endereço do vendedor + defaults), então basta o
    // CEP de destino e o anúncio.
    quote: (body: {
      to_cep: string;
      listing_id?: string;
      from_cep?: string;
      weight_kg?: number;
      width_cm?: number;
      height_cm?: number;
      length_cm?: number;
    }) =>
      request<{ options: ShippingQuoteOption[] }>('/api/shipping/quote', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.options),

    // Gera a etiqueta (escopo "cart + link ao painel"): adiciona o envio ao
    // carrinho do Melhor Envio e devolve a URL do painel para o vendedor pagar
    // e imprimir. Não movimenta dinheiro no nosso backend.
    label: (token: string, body: GenerateLabelBody) =>
      request<GenerateLabelResult>('/api/shipping/label', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }),
  },

  // ── Disputes (comprador) ─────────────────────────────────────────────────────
  disputes: {
    getMine: (token: string) =>
      request<{ data: UserDispute[] }>('/api/disputes', { token }).then(r => r.data),

    getEligibleOrders: (token: string) =>
      request<{ data: DisputeEligibleOrder[] }>('/api/disputes/eligible-orders', { token }).then(r => r.data),

    getById: (token: string, id: string) =>
      request<{ data: UserDispute }>(`/api/disputes/${id}`, { token }).then(r => r.data),

    create: (token: string, body: { orderId: string; reason: string; description: string }) =>
      request<{ data: UserDispute }>('/api/disputes', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }).then(r => r.data),

    addMessage: (token: string, id: string, content: string) =>
      request<{ data: UserDispute }>(`/api/disputes/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
        token,
      }).then(r => r.data),
  },

  // ── Reviews ────────────────────────────────────────────────────────────────
  reviews: {
    getGiven: (token: string) =>
      request<{ data: GivenReview[] }>('/api/reviews/given', { token }).then(r => r.data),

    getReceived: (token: string) =>
      request<{ data: ReceivedReview[] }>('/api/reviews/received', { token }).then(r => r.data),

    create: (token: string, body: { orderId: string; rating: number; comment?: string }) =>
      request<{ data: GivenReview }>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }).then(r => r.data),
  },
};

// ── Tipos de domínio ──────────────────────────────────────────────────────────

/** Opção de frete retornada pela cotação real (`POST /api/shipping/quote`). */
export interface ShippingQuoteOption {
  carrier: string; // ex: "Correios", "Jadlog"
  service: string; // ex: "PAC", "SEDEX", ".Package"
  price: number; // em REAIS (float)
  delivery_time_days: number;
  raw: { id?: number; [key: string]: unknown };
}

/** Corpo de `POST /api/shipping/label` (geração de etiqueta). */
export interface GenerateLabelBody {
  order_id: string;
  service_id: number;
  origin_address_id: string;
  volumes: { weight_kg: number; width_cm: number; height_cm: number; length_cm: number };
  declared_value?: number; // em reais; default = total do pedido
  to_document?: string; // CPF do comprador
  from_document?: string; // CPF do vendedor
}

/** Retorno de `POST /api/shipping/label`. */
export interface GenerateLabelResult {
  success: boolean;
  message: string;
  cartId: number | string | null;
  protocol: string | null;
  panelUrl: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SellerProfile {
  id: string;
  name: string | null;
  email: string;
  bio: string | null;
  isVerified: boolean | null;
  createdAt: string;
  totalActiveListings: number;
  totalSales: number;
  totalReviews: number;
  averageRating: number;
}

export interface SellerSelfProfile {
  storeName: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  categories: string[];
  isVerified: boolean;
  policies: {
    shipping: string | null;
    returns: string | null;
    payment: string | null;
    acceptOffers: boolean;
    maxDiscountPercent: number | null;
  };
  notificationPrefs: Record<string, { email?: boolean; push?: boolean }>;
  account: {
    name: string | null;
    email: string | null;
    createdAt: string | null;
  };
}

export interface UpdateSellerProfileBody {
  storeName?: string;
  bio?: string;
  city?: string;
  state?: string;
  website?: string;
  categories?: string[];
}

export interface UpdateSellerPoliciesBody {
  shipping?: string;
  returns?: string;
  payment?: string;
  acceptOffers?: boolean;
  maxDiscountPercent?: number;
}

export interface SellerReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
  };
}

// Avaliação feita pelo usuário (autor) — alvo é a contraparte do pedido.
export interface GivenReview {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  target: { id: string; name: string | null };
}

// Avaliação recebida pelo usuário (alvo).
export interface ReceivedReview {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: { id: string; name: string | null };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  latestMessage?: Message | null;
  listing?: Listing | null;
  buyer?: UserProfile | null;
  seller?: UserProfile | null;
}

export interface WalletData {
  id: string;
  userId: string;
  balanceInCents: number;
  pendingInCents: number;
}

/** Retorno da cobrança PIX de depósito (Pagar.me POST /orders). */
export interface PixDeposit {
  orderId: string;
  chargeId?: string;
  status: string;
  amountInCents: number;
  qrCode: string; // payload copia-e-cola
  qrCodeUrl?: string; // imagem do QR Code
  expiresAt?: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'hold';
  amountInCents: number;
  status: string;
  orderId?: string;
  stripeEventId?: string;
  description?: string;
  createdAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface OrderAddress {
  id: string;
  recipientName: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  status: OrderStatus;
  totalInCents: number;
  trackingCode?: string | null;
  createdAt: string;
  updatedAt: string;
  // Financeiro (preenchido em GET /api/orders/:id)
  sellerNetInCents?: number | null;
  platformFeeInCents?: number | null;
  deliveredAt?: string | null;
  buyerConfirmedAt?: string | null;
  listing?: {
    title: string;
    images: string[];
    priceInCents: number;
    condition?: string | null;
  };
  // Contraparte: o backend popula `buyer` em /my/sales e `seller` em /my/purchases.
  // GET /api/orders/:id popula buyer, seller e address.
  buyer?: { id: string; name: string };
  seller?: { id: string; name: string };
  address?: OrderAddress | null;
}

export interface Favorite {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
    priceInCents: number;
    images: string[];
    status: string;
    type: string;
    condition: string;
    sellerId: string;
  };
}

export interface Address {
  id: string;
  userId: string;
  label?: string;
  recipientName: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressPayload {
  label?: string;
  recipientName: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  isDefault?: boolean;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amountInCents: number;
  status: 'processing' | 'paid' | 'failed';
  stripePayoutId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConnectAccountStatus = 'disconnected' | 'pending' | 'active';

export interface Listing {
  id: string;
  sellerId: string;
  sellerName?: string | null;
  categoryId: string | null;
  title: string;
  description: string | null;
  brand: string | null;
  line: string | null;
  scale: string | null;
  year: string | null;
  edition: string | null;
  condition: string;
  type: 'direct' | 'auction';
  priceInCents: number | null;
  images: string | null; // JSON array stringificado: '["url1","url2"]'
  status: string;
  // Dados de envio (frete): peso em gramas, dimensões em cm. Nullable.
  weightGrams?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  lengthCm?: number | null;
  // Destaque (vitrine): ISO até quando o anúncio fica em destaque. Passado/null = não.
  featuredUntil?: string | null;
  featuredSource?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** true se o anúncio está em destaque agora (featuredUntil no futuro). */
export function isListingFeatured(l: Pick<Listing, 'featuredUntil'>): boolean {
  return !!l.featuredUntil && new Date(l.featuredUntil).getTime() > Date.now();
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
}

export type CommunityPostType = 'collection' | 'product' | 'discussion' | 'guide';

export interface CommunityPost {
  id: string;
  authorId: string;
  type: CommunityPostType;
  title: string;
  body: string | null;
  images: string[];
  categoryId: string | null;
  listingId: string | null;
  status: string;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  pinCount: number;
  score: number;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string | null } | null;
  listing?: {
    id: string;
    title: string;
    images: string[];
    priceInCents: number | null;
    sellerId: string;
  } | null;
  category?: { id: string; name: string; slug: string } | null;
}

export interface CommunityComment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null };
}

export interface CommunityFeed {
  data: CommunityPost[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CommunityHighlights {
  topPost: CommunityPost | null;
  topProductPost: CommunityPost | null;
  topCategory: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    posts: number;
  } | null;
}

export interface CreatePostPayload {
  type: CommunityPostType;
  title: string;
  body?: string;
  images?: string[];
  categoryId?: string;
  listingId?: string;
}

export interface CreateReportPayload {
  targetType: 'post' | 'comment';
  targetId: string;
  reason: string;
  description?: string;
}

export interface ConnectStatus {
  stripeAccountId: string | null;
  status: ConnectAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

// ── Recipients (Pagar.me) ────────────────────────────────────────────────────

/** Estados do recebedor na Pagar.me (só `active` recebe split e saca). */
export type RecipientStatus =
  | 'not_started'
  | 'registration'
  | 'affiliation'
  | 'active'
  | 'refused'
  | 'suspended'
  | 'blocked'
  | 'inactive';

export interface RecipientStatusData {
  onboarded: boolean;
  status: RecipientStatus | string;
  canReceive: boolean;
  canWithdraw: boolean;
  recipientId?: string;
  document?: string | null;
}

/** Link/QR de prova de vida (expira em ~20min). */
export interface RecipientKycLink {
  url: string;
  qrCodeBase64: string | null;
  expiresAt: string | null;
}

export interface RecipientAddress {
  street: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complementary?: string;
  referencePoint?: string;
}

export interface RecipientBankAccount {
  holderName: string;
  holderType: 'individual' | 'company';
  holderDocument: string;
  bank: string;
  branchNumber: string;
  branchCheckDigit?: string;
  accountNumber: string;
  accountCheckDigit: string;
  accountType: 'checking' | 'savings';
}

export interface RecipientManagingPartner {
  name: string;
  email: string;
  document: string;
  motherName?: string;
  birthdate: string;
  monthlyIncomeInCents: number;
  professionalOccupation: string;
  selfDeclaredLegalRepresentative: boolean;
  phone?: string;
  address: RecipientAddress;
}

export interface CreateRecipientPayload {
  type: 'individual' | 'company';
  name: string;
  document: string;
  email: string;
  siteUrl?: string;
  phone?: string;
  // Pessoa Física
  motherName?: string;
  birthdate?: string;
  monthlyIncomeInCents?: number;
  professionalOccupation?: string;
  address?: RecipientAddress;
  // Pessoa Jurídica
  annualRevenueInCents?: number;
  corporationType?: string;
  foundingDate?: string;
  mainAddress?: RecipientAddress;
  managingPartners?: RecipientManagingPartner[];
  bankAccount: RecipientBankAccount;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// ── Founder (Programa Membro Fundador) ───────────────────────────────────────

export type FounderStatusValue = 'none' | 'pending' | 'active' | 'lapsed';

export interface FounderBadgeData {
  founderNumber: number;
  founderStatus: FounderStatusValue;
}

export interface FounderStatus {
  founderNumber: number | null;
  founderStatus: FounderStatusValue;
  founderSince: string | null;
  listingsSubmitted: number;
  listingsRequired: number;
  remaining: number;
  benefitEndsAt: string | null;
  credits: {
    total: number;
    used: number;
    available: number;
    expiresAt: string | null;
  } | null;
}

export interface CreateListingPayload {
  title: string;
  description?: string;
  categoryId?: string;
  brand?: string;
  line?: string;
  scale?: string;
  year?: string;
  edition?: string;
  condition: string;
  type: 'direct' | 'auction';
  priceInCents?: number;
  // Config de leilão (quando type='auction')
  startingBidInCents?: number;
  minIncrementInCents?: number;
  reservePriceInCents?: number;
  durationHours?: number;
  images?: string; // JSON array stringificado
  // Dados de envio (frete): peso em gramas, dimensões em cm.
  weightGrams?: number;
  widthCm?: number;
  heightCm?: number;
  lengthCm?: number;
}

export interface ImportJobError {
  row: number;
  error: string;
}

export interface ImportJob {
  id: string;
  status: 'processing' | 'completed' | 'failed' | 'completed_with_errors';
  totalRows: number;
  processedRows: number;
  failedRows: number;
  errors: ImportJobError[];
  createdAt: number;
  updatedAt: number;
}

export interface AuctionWithListing {
  id: string;
  listingId: string;
  startingBidInCents: number;
  minIncrementInCents: number;
  currentBidInCents: number | null;
  reservePriceInCents: number | null;
  currentWinnerId: string | null;
  durationHours: number;
  endsAt: string;
  antiSniper: boolean;
  status: 'active' | 'ended' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  title: string;
  images: string | null;
  condition: string;
  sellerId: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amountInCents: number;
  createdAt: string;
}

export interface MyBid {
  id: string;
  auctionId: string;
  amountInCents: number;
  createdAt: string;
  auctionStatus: 'active' | 'ended' | 'cancelled';
  auctionEndsAt: string;
  currentBidInCents: number | null;
  currentWinnerId: string | null;
  listingId: string;
  title: string;
  images: string | null;
}

export interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalOrders: number;
  totalRevenueInCents: number;
  openDisputes: number;
  activeAuctions: number;
}

export interface AdminOverview {
  salesByMonth: { month: string; vendas: number; comissao: number }[];
  topSellers: { sellerId: string; name: string; sales: number; gmv: number; verified: boolean }[];
  categoryBreakdown: { name: string; value: number }[];
  pendingActions: { pendingListings: number; pendingVerifications: number; openDisputes: number };
  activeAuctions: number;
}

export interface AdminReports {
  gmvByMonth: { month: string; gmv: number }[];
  auctionMetrics: { month: string; modoLance: number; lances: number }[];
  topCategories: { name: string; gmv: number; items: number }[];
}

export interface AdminFinancialTransaction {
  id: string;
  orderId: string;
  date: string;
  buyer: string;
  gross: number;
  commission: number;
  commissionPct: number | null;
  net: number | null;
  status: string;
}

export interface AdminFinancial {
  summary: { revenue: number; volume: number; payouts: number; pendingWithdrawals: number };
  transactions: AdminFinancialTransaction[];
  pendingWithdrawals: { id: string; date: string; seller: string; amount: number }[];
}

export interface AdminAuctionItem {
  id: string;
  listingId: string;
  productName: string;
  productImage: string | null;
  sellerName: string;
  currentBid: number | null;
  startingBid: number;
  totalBids: number;
  startedAt: string;
  endsAt: string | null;
  status: 'active' | 'ended' | 'cancelled';
  winnerName: string | null;
}

export interface AdminSellerDetailed {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  cpfCnpj: string | null;
  isVerified: boolean;
  recipientStatus: string | null;
  createdAt: string;
  previousOrders: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AdminSellerProfile {
  id: string;
  userId: string;
  bio: string | null;
  stripeAccountId: string | null;
  stripeOnboardingStatus: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlingStatus {
  connected: boolean;
  expired?: boolean;
}

// ── Disputes (comprador) ──────────────────────────────────────────────────────

export interface DisputeOrderRef {
  id: string;
  listingTitle: string;
  listingImage: string | null;
  sellerId: string | null;
  sellerName: string;
  totalInCents: number;
}

export interface DisputeTimelineEvent {
  id: string;
  type: 'message' | 'system';
  senderRole: 'buyer' | 'seller' | 'admin' | 'system';
  senderName: string | null;
  content: string;
  createdAt: string;
}

export type UserDisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';

export interface UserDispute {
  id: string;
  orderId: string;
  reason: string;
  description: string | null;
  status: UserDisputeStatus;
  resolution: 'buyer_favor' | 'seller_favor' | 'no_resolution' | null;
  createdAt: string;
  resolvedAt: string | null;
  order: DisputeOrderRef;
  timeline?: DisputeTimelineEvent[];
}

export interface DisputeEligibleOrder {
  id: string;
  title: string;
}

export interface AdminDispute {
  id: string;
  orderId: string;
  reporterId: string;
  reason: string;
  description: string | null;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  // ── Listings (público) ───────────────────────────────────────────────────

  listings: {
    getById: (id: string) =>
      request<{ data: Listing }>(`/api/listings/${id}`).then(r => r.data),

    getAll: (limit = 20, offset = 0) =>
      request<{ data: Listing[] }>(`/api/listings?limit=${limit}&offset=${offset}`).then(r => r.data),
  },

  // ── Wallet ─────────────────────────────────────────────────────────────────

  wallet: {
    getMe: (token: string) =>
      request<{ data: WalletData }>('/api/wallet/me', { token }).then(r => r.data),
  },

  // ── Orders ─────────────────────────────────────────────────────────────────

  orders: {
    getMyOrders: (token: string, status?: string, page = 1, limit = 10) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status && status !== 'todos') params.set('status', status);
      return request<{ data: Order[] }>(`/api/orders/buyer/me?${params}`, { token }).then(r => r.data);
    },

    getById: (token: string, id: string) =>
      request<{ data: Order }>(`/api/orders/${id}`, { token }).then(r => r.data),

    createCheckout: (token: string, body: { items: { listingId: string }[]; addressId?: string }) =>
      request<{ clientSecret: string; orderId: string; totalInCents: number }>(
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
      request<{ url: string }>('/api/connect/onboard', {
        method: 'POST',
        token,
      }),

    loginLink: (token: string) =>
      request<{ url: string }>('/api/connect/login', {
        method: 'POST',
        token,
      }),

    getStatus: (token: string) =>
      request<{ data: ConnectStatus }>('/api/connect/status', { token }).then((r) => r.data),
  },
};

// ── Tipos de domínio ──────────────────────────────────────────────────────────

export interface WalletData {
  id: string;
  userId: string;
  balanceInCents: number;
  pendingInCents: number;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'disputed';

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  status: OrderStatus;
  totalInCents: number;
  createdAt: string;
  updatedAt: string;
  listing?: {
    title: string;
    images: string[];
    priceInCents: number;
  };
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
  createdAt: string;
  updatedAt: string;
}

export interface ConnectStatus {
  stripeAccountId: string | null;
  status: ConnectAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

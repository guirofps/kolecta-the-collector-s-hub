import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatBRL } from '@/lib/mock-data';
import EmptyState from '@/components/EmptyState';

// ── Types ────────────────────────────────────────────────

type OrderStatus =
  | 'aguardando_pagamento'
  | 'pagamento_confirmado'
  | 'em_separacao'
  | 'enviado'
  | 'entregue'
  | 'cancelado'
  | 'disputa';

interface OrderItem {
  name: string;
  image: string;
  quantity: number;
  price: number;
}

interface MockOrder {
  id: string;
  number: string;
  date: string;
  sellerName: string;
  sellerSlug: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
}

// ── Status config ────────────────────────────────────────

const statusConfig: Record<OrderStatus, { label: string; cls: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  pagamento_confirmado: { label: 'Pagamento confirmado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  em_separacao: { label: 'Em separação', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  enviado: { label: 'Enviado', cls: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30' },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  cancelado: { label: 'Cancelado', cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
  disputa: { label: 'Disputa aberta', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

// ── Tab → status mapping ─────────────────────────────────

type TabKey = 'todos' | 'em-andamento' | 'entregues' | 'cancelados';

const tabStatuses: Record<TabKey, OrderStatus[] | null> = {
  todos: null,
  'em-andamento': ['aguardando_pagamento', 'pagamento_confirmado', 'em_separacao', 'enviado'],
  entregues: ['entregue'],
  cancelados: ['cancelado', 'disputa'],
};

const emptyMessages: Record<TabKey, { title: string; showCta: boolean }> = {
  todos: { title: 'Você ainda não fez nenhum pedido', showCta: true },
  'em-andamento': { title: 'Nenhum pedido em andamento', showCta: false },
  entregues: { title: 'Nenhum pedido entregue ainda', showCta: false },
  cancelados: { title: 'Nenhum pedido cancelado', showCta: false },
};

// ── Mock orders ──────────────────────────────────────────

const mockOrders: MockOrder[] = [
  {
    id: 'ord-001',
    number: '#KL-000118',
    date: '22 fev 2026',
    sellerName: 'JDM Garage Collectibles',
    sellerSlug: 'jdm-garage',
    items: [
      { name: 'Hot Wheels RLC Nissan Skyline GT-R R34', image: '/placeholder.svg', quantity: 1, price: 520 },
    ],
    status: 'enviado',
    total: 554.5,
  },
  {
    id: 'ord-002',
    number: '#KL-000115',
    date: '19 fev 2026',
    sellerName: 'Escala Premium',
    sellerSlug: 'escala-premium',
    items: [
      { name: 'Tomica Limited Vintage Neo – AE86', image: '/placeholder.svg', quantity: 1, price: 289 },
      { name: 'Majorette Porsche 911 GT3 RS', image: '/placeholder.svg', quantity: 2, price: 45 },
    ],
    status: 'entregue',
    total: 397.9,
  },
  {
    id: 'ord-003',
    number: '#KL-000110',
    date: '14 fev 2026',
    sellerName: 'MiniAuto Brasil',
    sellerSlug: 'miniauto-brasil',
    items: [
      { name: 'Kyosho Nissan Silvia S15 Midnight Purple', image: '/placeholder.svg', quantity: 1, price: 175 },
    ],
    status: 'aguardando_pagamento',
    total: 209.5,
  },
  {
    id: 'ord-004',
    number: '#KL-000105',
    date: '10 fev 2026',
    sellerName: 'Coleção Turbo',
    sellerSlug: 'colecao-turbo',
    items: [
      { name: 'Funko Pop! Initial D – Takumi', image: '/placeholder.svg', quantity: 1, price: 199 },
    ],
    status: 'cancelado',
    total: 199,
  },
  {
    id: 'ord-005',
    number: '#KL-000098',
    date: '5 fev 2026',
    sellerName: 'Imports & Racers',
    sellerSlug: 'imports-racers',
    items: [
      { name: 'Pokémon Card Charizard VMAX', image: '/placeholder.svg', quantity: 1, price: 850 },
    ],
    status: 'entregue',
    total: 884.5,
  },
];

const ITEMS_PER_PAGE = 3;

// ═════════════════════════════════════════════════════════

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  const activeTab = (searchParams.get('status') as TabKey) || 'todos';
  const currentPage = Number(searchParams.get('page') || '1');

  // Simulate loading
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [activeTab, currentPage]);

  // Filter
  const allowedStatuses = tabStatuses[activeTab];
  const filtered = allowedStatuses
    ? mockOrders.filter(o => allowedStatuses.includes(o.status))
    : mockOrders;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  function setTab(tab: string) {
    setSearchParams({ status: tab, page: '1' });
  }

  function setPage(p: number) {
    const params: Record<string, string> = { page: String(p) };
    if (activeTab !== 'todos') params.status = activeTab;
    setSearchParams(params);
  }

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">Meus Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">{mockOrders.length} pedidos no total</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setTab} className="mb-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="em-andamento">Em andamento</TabsTrigger>
            <TabsTrigger value="entregues">Entregues</TabsTrigger>
            <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* API: GET /api/orders?status=&page=&limit=
            Retorna: { orders: Order[], total: number, page: number } */}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-gradient-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && paged.length === 0 && (
          <EmptyState
            icon={Package}
            title={emptyMessages[activeTab].title}
            action={
              emptyMessages[activeTab].showCta ? (
                <Button variant="kolecta" asChild>
                  <Link to="/">Explorar produtos</Link>
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Order list */}
        {!loading && paged.length > 0 && (
          <div className="space-y-4">
            {paged.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground font-body">
              Página {safePage} de {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── OrderCard ────────────────────────────────────────────

function OrderCard({ order }: { order: MockOrder }) {
  const cfg = statusConfig[order.status];

  return (
    <Card className="bg-gradient-card">
      <CardContent className="p-5 space-y-3">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-heading text-sm font-bold uppercase tracking-wide">{order.number}</span>
            <span className="text-xs text-muted-foreground ml-2">{order.date}</span>
          </div>
          <Badge className={cfg.cls}>{cfg.label}</Badge>
        </div>

        {/* Seller */}
        <Link
          to={`/vendedor/${order.sellerSlug}`}
          className="text-xs text-primary hover:underline font-body"
        >
          {order.sellerName} →
        </Link>

        {/* Items */}
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-xs font-bold uppercase truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity}</p>
              </div>
              <span className="text-xs font-body text-muted-foreground shrink-0">
                {formatBRL(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="font-heading text-lg font-bold text-primary">{formatBRL(order.total)}</span>
          <div className="flex gap-2">
            {order.status === 'entregue' && (
              <Button variant="outline-gold" size="sm">Avaliar compra</Button>
            )}
            {order.status === 'enviado' && (
              <Button variant="outline-gold" size="sm">Confirmar recebimento</Button>
            )}
            <Button variant="kolecta" size="sm" asChild>
              <Link to={`/conta/pedidos/${order.id}`}>Ver detalhes</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

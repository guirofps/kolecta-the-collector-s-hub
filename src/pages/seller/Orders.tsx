import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Package, Search, ChevronLeft, ChevronRight, Truck,
  CheckCircle2, XCircle, User, MessageCircle,
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/EmptyState';
import {
  useSellerOrders,
  useUpdateOrderStatus,
  useStartConversationFromOrder,
} from '@/hooks/use-api';
import type { Order, OrderStatus } from '@/lib/api';
import { formatBRL } from '@/lib/currency';

// ── Types ────────────────────────────────────────────────

type SellerOrderStatus =
  | 'aguardando_pagamento'
  | 'pagamento_confirmado'
  | 'em_separacao'
  | 'enviado'
  | 'entregue'
  | 'cancelado';

interface OrderItem {
  name: string;
  image: string;
  quantity: number;
  price: number;
}

interface SellerOrder {
  id: string;
  number: string;
  date: string;
  buyerName: string;
  buyerAvatar?: string;
  items: OrderItem[];
  status: SellerOrderStatus;
  rawStatus: OrderStatus;
  total: number;
  shipDeadline?: string;
  trackingCode?: string;
}

// Mapeia o status do backend para o status de exibição do painel do vendedor.
const statusMap: Record<OrderStatus, SellerOrderStatus> = {
  pending: 'aguardando_pagamento',
  pending_payment: 'aguardando_pagamento',
  paid: 'pagamento_confirmado',
  processing: 'em_separacao',
  shipped: 'enviado',
  delivered: 'entregue',
  completed: 'entregue',
  cancelled: 'cancelado',
  disputed: 'cancelado',
};

// Status (de exibição) que liberam o chat com o comprador.
const CHAT_ELIGIBLE: SellerOrderStatus[] = ['pagamento_confirmado', 'enviado', 'entregue'];

function toSellerOrder(o: Order): SellerOrder {
  const display = statusMap[o.status] ?? 'aguardando_pagamento';
  return {
    id: o.id,
    number: `KL-${o.id.slice(-6).toUpperCase()}`,
    date: o.createdAt,
    buyerName: o.buyer?.name ?? 'Comprador',
    items: [
      {
        name: o.listing?.title ?? 'Item',
        image: o.listing?.images?.[0] ?? '/placeholder.svg',
        quantity: 1,
        price: o.totalInCents,
      },
    ],
    status: display,
    rawStatus: o.status,
    total: o.totalInCents,
    trackingCode: o.trackingCode ?? undefined,
  };
}

// ── Status config ────────────────────────────────────────

const statusConfig: Record<SellerOrderStatus, { label: string; cls: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  pagamento_confirmado: { label: 'Pagamento confirmado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  em_separacao: { label: 'Em separação', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  enviado: { label: 'Enviado', cls: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30' },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  cancelado: { label: 'Cancelado', cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
};

// ── Tab config ───────────────────────────────────────────

type TabKey = 'todos' | 'acao' | 'andamento' | 'concluidos';

const tabStatuses: Record<TabKey, SellerOrderStatus[] | null> = {
  todos: null,
  acao: ['pagamento_confirmado', 'enviado'],
  andamento: ['em_separacao', 'enviado'],
  concluidos: ['entregue', 'cancelado'],
};

const tabLabels: Record<TabKey, string> = {
  todos: 'Todos',
  acao: 'Ação necessária',
  andamento: 'Em andamento',
  concluidos: 'Concluídos',
};

const emptyMessages: Record<TabKey, string> = {
  todos: 'Nenhum pedido recebido ainda',
  acao: 'Nenhum pedido requer ação no momento',
  andamento: 'Nenhum pedido em andamento',
  concluidos: 'Nenhum pedido concluído ainda',
};

// ── Helpers ──────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

const PER_PAGE = 5;

// ── Component ────────────────────────────────────────────

export default function SellerOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [period, setPeriod] = useState('todos');
  const [sort, setSort] = useState('recentes');

  const { data: rawOrders = [], isLoading: loading } = useSellerOrders();
  const updateStatus = useUpdateOrderStatus();
  const startChat = useStartConversationFromOrder();

  const sellerOrders = useMemo(() => rawOrders.map(toSellerOrder), [rawOrders]);

  const activeTab = (searchParams.get('tab') as TabKey) || 'todos';
  const page = Number(searchParams.get('page') || '1');

  function markShipped(id: string) {
    const tracking = window.prompt('Código de rastreamento (opcional):')?.trim();
    updateStatus.mutate({ id, status: 'shipped', trackingCode: tracking || undefined });
  }

  function bulkMarkShipped() {
    const eligible = sellerOrders.filter(
      (o) => selected.has(o.id) && o.status === 'pagamento_confirmado',
    );
    eligible.forEach((o) => updateStatus.mutate({ id: o.id, status: 'shipped' }));
    setSelected(new Set());
  }

  async function handleChat(id: string) {
    const result = await startChat.mutateAsync(id);
    navigate(`/painel/mensagens?conv=${result.conversationId}`);
  }

  const filtered = useMemo(() => {
    let list = [...sellerOrders];

    // Tab filter
    const tabSt = tabStatuses[activeTab];
    if (tabSt) list = list.filter((o) => tabSt.includes(o.status));

    // Status dropdown
    if (statusFilter !== 'todos') list = list.filter((o) => o.status === statusFilter);

    // Period filter (F24: o estado era setado mas nunca aplicado no filtro).
    if (period !== 'todos') {
      if (period === 'hoje') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        list = list.filter((o) => new Date(o.date).getTime() >= start.getTime());
      } else {
        const days: Record<string, number> = { '7d': 7, '30d': 30, '3m': 90 };
        const n = days[period];
        if (n) {
          const since = Date.now() - n * 24 * 60 * 60 * 1000;
          list = list.filter((o) => new Date(o.date).getTime() >= since);
        }
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) => o.number.toLowerCase().includes(q) || o.buyerName.toLowerCase().includes(q));
    }

    // Sort
    if (sort === 'antigos') list.sort((a, b) => a.date.localeCompare(b.date));
    else if (sort === 'maior') list.sort((a, b) => b.total - a.total);
    else if (sort === 'menor') list.sort((a, b) => a.total - b.total);
    else list.sort((a, b) => b.date.localeCompare(a.date));

    return list;
  }, [sellerOrders, activeTab, statusFilter, period, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { todos: sellerOrders.length, acao: 0, andamento: 0, concluidos: 0 };
    sellerOrders.forEach((o) => {
      if (tabStatuses.acao!.includes(o.status)) counts.acao++;
      if (tabStatuses.andamento!.includes(o.status)) counts.andamento++;
      if (tabStatuses.concluidos!.includes(o.status)) counts.concluidos++;
    });
    return counts;
  }, [sellerOrders]);

  function setTab(t: string) { setSearchParams({ tab: t, page: '1' }); setSelected(new Set()); }
  function setPage(p: number) { setSearchParams({ tab: activeTab, page: String(p) }); }

  function toggleSelect(id: string) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleAll() {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((o) => o.id)));
  }

  return (
    <SellerLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Pedidos Recebidos</h1>
          <p className="text-muted-foreground text-sm mt-1">{sellerOrders.length} pedidos no total</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar pedido ou comprador..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="aguardando_pagamento">Aguardando pagamento</SelectItem>
              <SelectItem value="pagamento_confirmado">Pagamento confirmado</SelectItem>
              <SelectItem value="em_separacao">Em separação</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo o período</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="antigos">Mais antigos</SelectItem>
              <SelectItem value="maior">Maior valor</SelectItem>
              <SelectItem value="menor">Menor valor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className="w-full justify-start">
            {(Object.keys(tabLabels) as TabKey[]).map((k) => (
              <TabsTrigger key={k} value={k} className="gap-2">
                {tabLabels[k]}
                <Badge variant="secondary" className={k === 'acao' ? 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' : ''}>
                  {tabCounts[k]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Loading */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-gradient-card"><CardContent className="p-5 space-y-3">
                <div className="flex gap-4"><Skeleton className="h-12 w-12 rounded" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div><Skeleton className="h-6 w-24 rounded-full" /></div>
              </CardContent></Card>
            ))}
          </div>
        ) : paged.length === 0 ? (
          <EmptyState icon={Package} title={emptyMessages[activeTab]} />
        ) : (
          <div className="space-y-3">
            {/* Select all */}
            <div className="flex items-center gap-2 px-1">
              <Checkbox checked={selected.size === paged.length && paged.length > 0} onCheckedChange={toggleAll} />
              <span className="text-xs text-muted-foreground">Selecionar todos</span>
            </div>

            {paged.map((order) => {
              const sc = statusConfig[order.status];

              return (
                <Card key={order.id} className="bg-gradient-card hover:border-primary/20 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selected.has(order.id)}
                        onCheckedChange={() => toggleSelect(order.id)}
                        className="mt-1"
                      />

                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Top row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="font-heading font-bold text-lg">{order.number}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(order.date)}</span>
                          </div>
                          <Badge variant="outline" className={sc.cls}>{sc.label}</Badge>
                        </div>

                        {/* Buyer */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{order.buyerName}</span>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <img src={item.image} alt={item.name} className="w-12 h-12 rounded object-cover bg-muted" />
                              <span className="text-sm flex-1 truncate">{item.name}</span>
                              <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <Separator className="opacity-50" />

                        {/* Bottom */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="font-heading font-bold text-lg text-kolecta-gold">{formatBRL(order.total / 100)}</span>

                          <div className="flex items-center gap-2 flex-wrap">
                            {order.status === 'pagamento_confirmado' && (
                              <Button
                                size="sm"
                                variant="kolecta"
                                className="glow-primary"
                                disabled={updateStatus.isPending}
                                onClick={() => markShipped(order.id)}
                              >
                                <Truck className="h-3.5 w-3.5 mr-1" /> Marcar como enviado
                              </Button>
                            )}
                            {order.status === 'enviado' && order.trackingCode && (
                              <Badge variant="outline" className="bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30">
                                <Package className="h-3 w-3 mr-1" /> {order.trackingCode}
                              </Badge>
                            )}
                            {order.status === 'entregue' && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Entregue
                              </Badge>
                            )}
                            {order.status === 'cancelado' && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" /> Cancelado
                              </Badge>
                            )}
                            {CHAT_ELIGIBLE.includes(order.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={startChat.isPending}
                                onClick={() => handleChat(order.id)}
                              >
                                <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/painel/pedidos/${order.id}`}>Ver detalhes</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
            <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{selected.size} pedido{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="kolecta"
                className="glow-primary"
                disabled={updateStatus.isPending}
                onClick={bulkMarkShipped}
              >
                <Truck className="h-3.5 w-3.5 mr-1" /> Marcar como enviado
              </Button>
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}

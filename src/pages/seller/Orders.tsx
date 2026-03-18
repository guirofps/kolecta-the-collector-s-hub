import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package, Search, ChevronLeft, ChevronRight, Clock, Truck,
  CheckCircle2, XCircle, AlertTriangle, User,
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
import { formatBRL } from '@/lib/mock-data';
import EmptyState from '@/components/EmptyState';

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
  total: number;
  shipDeadline?: string;
  trackingCode?: string;
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

// ── Mock data ────────────────────────────────────────────

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const mockSellerOrders: SellerOrder[] = [
  {
    id: 'so1', number: 'KL-000201', date: '2025-03-15',
    buyerName: 'Lucas Mendes',
    items: [{ name: 'Turbo HKS GT3076R', image: '/placeholder.svg', quantity: 1, price: 4890 }],
    status: 'pagamento_confirmado', total: 4890,
    shipDeadline: tomorrow.toISOString().slice(0, 10),
  },
  {
    id: 'so2', number: 'KL-000198', date: '2025-03-14',
    buyerName: 'Ana Carolina',
    items: [
      { name: 'Coilovers Tein Flex Z', image: '/placeholder.svg', quantity: 1, price: 3200 },
      { name: 'Barra estabilizadora Cusco', image: '/placeholder.svg', quantity: 1, price: 890 },
    ],
    status: 'enviado', total: 4090, trackingCode: 'BR123456789',
  },
  {
    id: 'so3', number: 'KL-000195', date: '2025-03-12',
    buyerName: 'Rafael Souza',
    items: [{ name: 'Escape Tomei Expreme Ti', image: '/placeholder.svg', quantity: 1, price: 6500 }],
    status: 'entregue', total: 6500,
  },
  {
    id: 'so4', number: 'KL-000190', date: '2025-03-10',
    buyerName: 'Fernanda Lima',
    items: [{ name: 'Volante Nardi Classic', image: '/placeholder.svg', quantity: 1, price: 1850 }],
    status: 'cancelado', total: 1850,
  },
  {
    id: 'so5', number: 'KL-000188', date: '2025-03-09',
    buyerName: 'Thiago Oliveira',
    items: [{ name: 'Kit embreagem Exedy Stage 2', image: '/placeholder.svg', quantity: 1, price: 2400 }],
    status: 'pagamento_confirmado', total: 2400,
    shipDeadline: '2025-03-20',
  },
  {
    id: 'so6', number: 'KL-000185', date: '2025-03-07',
    buyerName: 'Mariana Costa',
    items: [{ name: 'ECU Link G4X', image: '/placeholder.svg', quantity: 1, price: 7200 }],
    status: 'em_separacao', total: 7200,
  },
];

// ── Helpers ──────────────────────────────────────────────

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

const PER_PAGE = 5;

// ── Component ────────────────────────────────────────────

export default function SellerOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [period, setPeriod] = useState('todos');
  const [sort, setSort] = useState('recentes');

  const activeTab = (searchParams.get('tab') as TabKey) || 'todos';
  const page = Number(searchParams.get('page') || '1');

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  /* API: GET /api/seller/orders?status=&period=&sort=&search=&page=
     Retorna: { orders: SellerOrder[], total: number } */

  const filtered = useMemo(() => {
    let list = [...mockSellerOrders];

    // Tab filter
    const tabSt = tabStatuses[activeTab];
    if (tabSt) list = list.filter((o) => tabSt.includes(o.status));

    // Status dropdown
    if (statusFilter !== 'todos') list = list.filter((o) => o.status === statusFilter);

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
  }, [activeTab, statusFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { todos: mockSellerOrders.length, acao: 0, andamento: 0, concluidos: 0 };
    mockSellerOrders.forEach((o) => {
      if (tabStatuses.acao!.includes(o.status)) counts.acao++;
      if (tabStatuses.andamento!.includes(o.status)) counts.andamento++;
      if (tabStatuses.concluidos!.includes(o.status)) counts.concluidos++;
    });
    return counts;
  }, []);

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
          <p className="text-muted-foreground text-sm mt-1">{mockSellerOrders.length} pedidos no total</p>
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
              const deadlineDays = order.shipDeadline ? daysUntil(order.shipDeadline) : null;
              const urgent = deadlineDays !== null && deadlineDays <= 1 && order.status === 'pagamento_confirmado';

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
                          <span className="font-heading font-bold text-lg text-kolecta-gold">{formatBRL(order.total)}</span>

                          <div className="flex items-center gap-2 flex-wrap">
                            {urgent && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-kolecta-red">
                                <Clock className="h-3.5 w-3.5" />
                                Enviar até {formatDate(order.shipDeadline!)}
                              </span>
                            )}
                            {order.status === 'pagamento_confirmado' && (
                              <Button size="sm" variant="kolecta" className="glow-primary">
                                <Truck className="h-3.5 w-3.5 mr-1" /> Marcar como enviado
                              </Button>
                            )}
                            {order.status === 'enviado' && (
                              <Button size="sm" variant="outline-gold">
                                <Package className="h-3.5 w-3.5 mr-1" /> Ver rastreamento
                              </Button>
                            )}
                            {order.status === 'entregue' && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Concluído
                              </Badge>
                            )}
                            {order.status === 'cancelado' && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" /> Cancelado
                              </Badge>
                            )}
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/painel-vendedor/pedidos/${order.id}`}>Ver detalhes</Link>
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
              {/* API: POST /api/seller/orders/bulk-update */}
              <Button size="sm" variant="kolecta" className="glow-primary">
                <Truck className="h-3.5 w-3.5 mr-1" /> Marcar como enviado
              </Button>
              <Button size="sm" variant="ghost">Exportar selecionados</Button>
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}

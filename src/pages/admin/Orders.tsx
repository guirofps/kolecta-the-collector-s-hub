import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Truck } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOrders } from '@/hooks/use-api';
import { formatBRL } from '@/lib/currency';

// Rótulo e cor por status do pedido. `pending_payment`/`cancelled` aparecem aqui
// de propósito: é o admin querendo achar "os N pedidos" que o KPI conta, e a
// maioria deles é Pix gerado e não pago.
const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: 'Aguardando pagamento', cls: 'bg-yellow-500/10 text-yellow-500' },
  pending: { label: 'Aguardando pagamento', cls: 'bg-yellow-500/10 text-yellow-500' },
  paid: { label: 'Pago', cls: 'bg-green-500/10 text-green-400' },
  processing: { label: 'Em separação', cls: 'bg-blue-500/10 text-blue-400' },
  shipped: { label: 'Enviado', cls: 'bg-blue-500/10 text-blue-400' },
  delivered: { label: 'Entregue', cls: 'bg-primary/10 text-primary' },
  completed: { label: 'Concluído', cls: 'bg-primary/10 text-primary' },
  cancelled: { label: 'Cancelado', cls: 'bg-accent/10 text-accent' },
  refunded: { label: 'Estornado', cls: 'bg-accent/10 text-accent' },
};

const ABAS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Enviados', value: 'shipped' },
  { label: 'Entregues', value: 'delivered' },
  { label: 'Concluídos', value: 'completed' },
  { label: 'Não pagos', value: 'pending_payment' },
  { label: 'Cancelados', value: 'cancelled' },
];

const ETIQUETA: Record<string, { label: string; cls: string }> = {
  ready: { label: 'Etiqueta pronta', cls: 'text-green-400' },
  pending: { label: 'Emitindo etiqueta', cls: 'text-yellow-500' },
  error: { label: 'Falha na etiqueta', cls: 'text-accent' },
};

export default function AdminOrders() {
  const [aba, setAba] = useState('todos');
  const { data, isLoading } = useAdminOrders(aba === 'todos' ? undefined : aba, 100);
  const orders = data?.data ?? [];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${data.total} pedidos no total` : 'Todas as vendas da plataforma'} · abra uma venda para ver etiqueta, declaração e rastreio.
          </p>
        </div>

        {/* Abas de status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
          {ABAS.map((t) => (
            <button
              key={t.value}
              onClick={() => setAba(t.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-heading uppercase tracking-wider whitespace-nowrap transition-colors ${
                aba === t.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Nenhum pedido com esse filtro.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => {
              const st = STATUS[o.status] ?? { label: o.status, cls: 'bg-secondary text-muted-foreground' };
              const et = o.shippingLabelStatus ? ETIQUETA[o.shippingLabelStatus] : null;
              return (
                <Link key={o.id} to={`/admin/pedidos/${o.id}`}>
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{o.orderId}</span>
                          <Badge className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
                          {o.trackingCode && <Truck className="h-3.5 w-3.5 text-muted-foreground" />}
                          {et && <span className={`text-[10px] ${et.cls}`}>{et.label}</span>}
                        </div>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {o.product ?? 'Item'} · {o.seller} → {o.buyer}
                        </p>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <div className="font-heading text-sm font-bold">{formatBRL(o.gross)}</div>
                        <div className="text-[10px] text-muted-foreground">{o.paymentInstrument ?? ''}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

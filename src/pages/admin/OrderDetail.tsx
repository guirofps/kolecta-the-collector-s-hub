import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, RefreshCw, Truck, MapPin, User, Store } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOrder, useDownloadLabel, useRetryLabel } from '@/hooks/use-api';
import { formatBRL } from '@/lib/currency';

const STATUS: Record<string, string> = {
  pending_payment: 'Aguardando pagamento', pending: 'Aguardando pagamento', paid: 'Pago',
  processing: 'Em separação', shipped: 'Enviado', delivered: 'Entregue',
  completed: 'Concluído', cancelled: 'Cancelado', refunded: 'Estornado',
};

const brl = (cents: number | null | undefined) => formatBRL((cents ?? 0) / 100);

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: o, isLoading } = useAdminOrder(id);
  const baixarCompleto = useDownloadLabel(id ?? '', 'completo');
  const baixarEtiqueta = useDownloadLabel(id ?? '', 'etiqueta');
  const baixarDeclaracao = useDownloadLabel(id ?? '', 'declaracao');
  const reemitir = useRetryLabel(id ?? '');

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/admin/pedidos"><ArrowLeft className="h-4 w-4" /> Voltar aos pedidos</Link>
        </Button>

        {isLoading || !o ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
        ) : (
          <div className="space-y-4">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-extrabold italic uppercase">Pedido #{o.id.slice(0, 8)}</h1>
                <p className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              <Badge className="bg-primary/10 text-primary">{STATUS[o.status] ?? o.status}</Badge>
            </div>

            {/* Produto */}
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {o.listing?.image && <img src={o.listing.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{o.listing?.title ?? 'Item indisponível'}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.listing?.type === 'auction' ? 'Modo Lance' : 'Compra direta'}
                    {o.paymentInstrument ? ` · ${o.paymentInstrument}${o.installments && o.installments > 1 ? ` ${o.installments}x` : ''}` : ''}
                  </p>
                </div>
                {o.listing && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/anuncios/${o.listing.id}`}>Ver anúncio</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Valores */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Valores</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <Linha rotulo="Item" valor={brl(o.totalInCents - (o.shippingInCents ?? 0))} />
                <Linha rotulo="Frete (pago pelo comprador)" valor={brl(o.shippingInCents)} />
                <Linha rotulo="Comissão Kolecta" valor={`- ${brl(o.commissionInCents)}`} classe="text-accent" />
                <div className="line-tech my-2" />
                <Linha rotulo="Vendedor recebe (líquido)" valor={o.sellerNetInCents != null ? brl(o.sellerNetInCents) : '—'} classe="font-medium text-primary" />
                <Linha rotulo="Total pago pelo comprador" valor={brl(o.totalInCents)} classe="font-medium" />
              </CardContent>
            </Card>

            {/* Pessoas + endereço */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card><CardContent className="p-4 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-xs font-heading uppercase text-muted-foreground"><Store className="h-3.5 w-3.5" /> Vendedor</p>
                <p className="font-medium">{o.seller?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{o.seller?.email ?? ''}</p>
                <p className="flex items-center gap-2 text-xs font-heading uppercase text-muted-foreground mt-3"><User className="h-3.5 w-3.5" /> Comprador</p>
                <p className="font-medium">{o.buyer?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{o.buyer?.email ?? ''}</p>
              </CardContent></Card>

              <Card><CardContent className="p-4 space-y-1 text-sm">
                <p className="flex items-center gap-2 text-xs font-heading uppercase text-muted-foreground mb-1"><MapPin className="h-3.5 w-3.5" /> Entrega</p>
                {o.address ? (
                  <>
                    <p className="font-medium">{o.address.recipientName}</p>
                    <p className="text-muted-foreground">{o.address.street}, {o.address.number}{o.address.complement ? ` · ${o.address.complement}` : ''}</p>
                    <p className="text-muted-foreground">{o.address.neighborhood ? `${o.address.neighborhood}, ` : ''}{o.address.city}/{o.address.state}</p>
                    <p className="text-muted-foreground">CEP {o.address.zip}</p>
                  </>
                ) : <p className="text-muted-foreground">Sem endereço (retirada em mãos ou não informado).</p>}
              </CardContent></Card>
            </div>

            {/* Envio: rastreio + etiqueta + declaração */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4" /> Envio, etiqueta e declaração</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span>Transportadora: <span className="text-foreground">{o.shippingServiceName ?? '—'}</span></span>
                  <span>Rastreio: <span className="text-foreground font-mono">{o.trackingCode ?? '—'}</span></span>
                  <span>Etiqueta: <span className="text-foreground">{o.shippingLabelStatus ?? 'não emitida'}</span></span>
                </div>
                <p className="text-xs text-muted-foreground">
                  O PDF "completo" traz etiqueta e declaração de conteúdo na mesma folha. Se a declaração ainda estiver sendo emitida pelo Melhor Envio, baixa só a etiqueta e avisa.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => baixarCompleto.mutate()} disabled={baixarCompleto.isPending}>
                    <Download className="h-4 w-4" /> Etiqueta + declaração
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => baixarEtiqueta.mutate()} disabled={baixarEtiqueta.isPending}>
                    <Download className="h-4 w-4" /> Só etiqueta
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => baixarDeclaracao.mutate()} disabled={baixarDeclaracao.isPending}>
                    <FileText className="h-4 w-4" /> Só declaração
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reemitir.mutate()} disabled={reemitir.isPending}>
                    <RefreshCw className="h-4 w-4" /> Reemitir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Linha({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className={`flex justify-between ${classe ?? ''}`}>
      <span className="text-muted-foreground">{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}

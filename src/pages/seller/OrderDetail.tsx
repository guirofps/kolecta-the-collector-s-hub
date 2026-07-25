import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Truck, Package, CreditCard, CheckCircle2, Clock,
  Copy, MessageSquare, ShieldCheck, User, MapPin, Tag, ExternalLink, Loader2, AlertCircle, AlertTriangle,
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBRL } from '@/lib/currency';
import EmptyState from '@/components/EmptyState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  useOrderById, useUpdateOrderStatus, useMarkDelivered, useStartConversationFromOrder,
  useRetryLabel,
} from '@/hooks/use-api';
import { api } from '@/lib/api';
import type {
  Order, OrderStatus as ApiOrderStatus, OrderAddress, ShippingQuoteOption, GenerateLabelResult,
} from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────

type LocalStatus = 'aguardando_pagamento' | 'pagamento_confirmado' | 'em_separacao' | 'enviado' | 'entregue' | 'cancelado';

interface TimelineEvent {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
}


// ── Status config ────────────────────────────────────────

const statusConfig: Record<LocalStatus, { label: string; cls: string }> = {
  // F20: 'pending' (PIX ainda não confirmado) NÃO é pagamento confirmado.
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30' },
  pagamento_confirmado: { label: 'Pagamento confirmado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  em_separacao: { label: 'Em separação', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  enviado: { label: 'Enviado', cls: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30' },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  cancelado: { label: 'Cancelado', cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
};

// `pending` NAO pode virar "pagamento confirmado": pedido sem pagamento
// aparecia como pago e liberava etiqueta/envio (risco de despachar sem receber).
const apiToLocalStatus: Record<ApiOrderStatus, LocalStatus> = {
  pending: 'aguardando_pagamento',
  paid: 'pagamento_confirmado',
  processing: 'em_separacao',
  shipped: 'enviado',
  delivered: 'entregue',
  cancelled: 'cancelado',
  disputed: 'entregue',
};

const timelineSteps: TimelineEvent[] = [
  { key: 'pagamento_confirmado', label: 'Pagamento confirmado', description: 'Pagamento processado com sucesso', icon: CreditCard },
  { key: 'em_separacao', label: 'Em separação', description: 'Produto sendo preparado para envio', icon: Clock },
  { key: 'enviado', label: 'Enviado', description: 'Produto enviado ao comprador', icon: Truck },
  { key: 'entregue', label: 'Entregue', description: 'Comprador recebeu o produto', icon: CheckCircle2 },
];

function getActiveIndex(status: LocalStatus) {
  const map: Record<string, number> = {
    aguardando_pagamento: -1,
    pagamento_confirmado: 0,
    em_separacao: 1,
    enviado: 2,
    entregue: 3,
    cancelado: -1,
  };
  return map[status] ?? 0;
}

function formatAddress(a: OrderAddress): string {
  const parts = [
    `${a.street}, ${a.number}`,
    a.complement,
    a.neighborhood,
    `${a.city} - ${a.state}`,
    `CEP ${a.zip}`,
  ].filter(Boolean);
  return parts.join(', ');
}

// ── Component ────────────────────────────────────────────

export default function SellerOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');

  const { data: order, isLoading, isError } = useOrderById(id ?? '');
  const updateStatus = useUpdateOrderStatus();
  const markDelivered = useMarkDelivered();
  const startChat = useStartConversationFromOrder();

  function copyAddress(order: Order) {
    if (!order.address) return;
    navigator.clipboard.writeText(formatAddress(order.address));
    toast({ title: 'Endereço copiado!', description: 'Colado na área de transferência.' });
  }

  async function handleShip(order: Order) {
    // Retirada pessoal não tem rastreio; marca deliveryMethod='pickup' para o
    // backend liberar o saldo na hora quando o comprador confirmar.
    const isPickup = carrier === 'retirada';
    if (!isPickup && !trackingCode) return;
    await updateStatus.mutateAsync({
      id: order.id,
      status: 'shipped',
      trackingCode: trackingCode || undefined,
      deliveryMethod: isPickup ? 'pickup' : 'shipping',
    });
    setShipDialogOpen(false);
  }

  async function handleChat(order: Order) {
    const result = await startChat.mutateAsync(order.id);
    navigate(`/painel/mensagens?conv=${result.conversationId}`);
  }

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48" /><Skeleton className="h-64" />
            </div>
            <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
          </div>
        </div>
      </SellerLayout>
    );
  }

  if (isError || !order) {
    return (
      <SellerLayout>
        <div className="p-6 max-w-6xl mx-auto py-16">
          <EmptyState
            icon={Package}
            title="Pedido não encontrado"
            action={
              <Button variant="kolecta" asChild>
                <Link to="/painel/pedidos">Voltar aos pedidos</Link>
              </Button>
            }
          />
        </div>
      </SellerLayout>
    );
  }

  const localStatus = apiToLocalStatus[order.status] ?? 'pagamento_confirmado';
  const sc =
    order.status === 'disputed'
      ? { label: 'Em disputa', cls: 'bg-destructive/10 text-destructive border-destructive/30' }
      : statusConfig[localStatus];
  const activeIdx = getActiveIndex(localStatus);

  const gross = order.totalInCents;
  const commission = order.platformFeeInCents ?? 0;
  const net = order.sellerNetInCents ?? gross - commission;
  const commissionRate = gross > 0 ? commission / gross : 0;
  // "Liberado" só quando o pedido vira 'completed' (release efetivo pelo cron).
  // Confirmado mas ainda em 'delivered' = retido na janela de 48h.
  const payoutStatus =
    order.status === 'completed'
      ? 'Liberado ao vendedor'
      : order.buyerConfirmedAt
        ? 'Em liberação (janela de 48h)'
        : order.status === 'delivered'
          ? 'Aguardando confirmação do comprador'
          : 'Aguardando entrega';

  const listing = order.listing;

  return (
    <SellerLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-3">
            <Link to="/painel/pedidos"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar aos pedidos</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold tracking-tight">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
            <Badge variant="outline" className={sc.cls}>{sc.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN (2/3) ──────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg">Itens do pedido</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <img src={listing?.images?.[0] || '/placeholder.svg'} alt={listing?.title ?? ''} className="w-20 h-20 rounded object-cover bg-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold">{listing?.title ?? 'Item'}</p>
                    {listing?.condition && <Badge variant="secondary" className="text-[10px] mt-1">{listing.condition}</Badge>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">x1</p>
                    <p className="font-medium">{formatBRL(gross / 100)}</p>
                  </div>
                </div>
                <Separator className="opacity-50" />
                <div className="flex justify-end">
                  <span className="font-heading font-bold text-xl text-kolecta-gold">{formatBRL(gross / 100)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg">Timeline do pedido</CardTitle></CardHeader>
              <CardContent>
                <div className="relative space-y-6 pl-8">
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                  {timelineSteps.map((step, i) => {
                    const isComplete = i <= activeIdx;
                    const isCurrent = i === activeIdx;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="relative flex items-start gap-4">
                        <div
                          className={cn(
                            'absolute -left-8 w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 bg-background',
                            isComplete && !isCurrent && 'border-primary bg-primary/10',
                            isCurrent && 'border-kolecta-gold bg-kolecta-gold/10',
                            !isComplete && 'border-border opacity-50',
                          )}
                        >
                          <Icon className={cn('h-3.5 w-3.5', isComplete && !isCurrent && 'text-primary', isCurrent && 'text-kolecta-gold', !isComplete && 'text-muted-foreground')} />
                        </div>
                        <div className={cn(!isComplete && 'opacity-50')}>
                          <p className={cn('font-heading font-semibold text-sm', isCurrent && 'text-kolecta-gold')}>{step.label}</p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Messages preview */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Mensagens</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Fale com o comprador sobre este pedido.</p>
                <Button
                  variant="outline-gold"
                  size="sm"
                  disabled={startChat.isPending}
                  onClick={() => handleChat(order)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {startChat.isPending ? 'Abrindo...' : 'Abrir conversa'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN (1/3) ─────────────── */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Actions */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg">Ações</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status atual:</span>
                  <Badge variant="outline" className={sc.cls}>{sc.label}</Badge>
                </div>
                {/* F20: pedido só libera etiqueta/envio DEPOIS de pago. 'pending'
                    (PIX não confirmado) não pode gerar etiqueta nem despachar. */}
                {order.status === 'pending' && (
                  // Sem pagamento, sem envio: nada de etiqueta aqui.
                  <div className="flex items-start gap-2 rounded-md border border-kolecta-gold/30 bg-kolecta-gold/5 p-3">
                    <Clock className="h-4 w-4 text-kolecta-gold shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      O comprador ainda não pagou. As opções de etiqueta e envio
                      liberam automaticamente quando o pagamento for confirmado.
                      <strong className="block mt-1 text-foreground">Não envie o produto antes disso.</strong>
                    </p>
                  </div>
                )}
                {(order.status === 'paid' || order.status === 'processing') && (
                  <>
                    <ShippingLabelPanel order={order} />
                    <Button className="w-full glow-primary" variant="kolecta" onClick={() => setShipDialogOpen(true)}>
                      <Truck className="h-4 w-4 mr-2" /> Confirmar envio
                    </Button>
                  </>
                )}
                {order.status === 'shipped' && (
                  <div className="space-y-2">
                    {order.trackingCode && (
                      <>
                        <p className="text-xs text-muted-foreground">Código de rastreamento</p>
                        <p className="font-mono text-sm font-medium">{order.trackingCode}</p>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline-gold"
                      className="w-full"
                      disabled={markDelivered.isPending}
                      onClick={() => markDelivered.mutate(order.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {markDelivered.isPending ? 'Marcando...' : 'Marcar como entregue'}
                    </Button>
                  </div>
                )}
                {order.status === 'delivered' && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 w-full justify-center py-2">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Entregue
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Buyer */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><User className="h-4 w-4" /> Comprador</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-medium">{order.buyer?.name ?? '—'}</p>
                {order.address && (
                  <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{order.address.city}/{order.address.state}</p>
                )}
                <Separator className="opacity-50" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Endereço de entrega</p>
                  <p className="text-xs leading-relaxed">{order.address ? formatAddress(order.address) : 'Endereço não informado'}</p>
                </div>
                {order.address && (
                  <Button size="sm" variant="ghost" className="w-full" onClick={() => copyAddress(order)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar endereço
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Financial */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg">Financeiro</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor bruto</span>
                  <span>{formatBRL(gross / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comissão Kolecta ({(commissionRate * 100).toFixed(0)}%)</span>
                  <span className="text-kolecta-red">-{formatBRL(commission / 100)}</span>
                </div>
                <Separator className="opacity-50" />
                <div className="flex justify-between items-center">
                  <span className="font-heading font-semibold">Valor líquido</span>
                  <span className="font-heading font-bold text-lg text-kolecta-gold">{formatBRL(net / 100)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{payoutStatus}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Ship Dialog ────────────────────── */}
      {/* Após confirmar: status muda para Enviado, comprador recebe notificação automática */}
      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Confirmar envio</DialogTitle>
            <DialogDescription>Informe os dados de envio do pedido #{order.id.slice(-6).toUpperCase()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Transportadora *</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="correios-pac">Correios PAC</SelectItem>
                  <SelectItem value="correios-sedex">Correios SEDEX</SelectItem>
                  <SelectItem value="jadlog">Jadlog</SelectItem>
                  <SelectItem value="total-express">Total Express</SelectItem>
                  <SelectItem value="retirada">Retirada pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {carrier === 'retirada' ? (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                Retirada pessoal (em mãos). Sem código de rastreamento. Quando o
                comprador confirmar o recebimento, o valor é <strong className="text-foreground">liberado na hora</strong> (sem os 48h).
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Código de rastreamento *</Label>
                  <Input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="Ex: BR123456789" />
                </div>
                <div className="space-y-2">
                  <Label>Data estimada de entrega</Label>
                  <Input type="date" value={estimatedDate} onChange={(e) => setEstimatedDate(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShipDialogOpen(false)}>Cancelar</Button>
            <Button variant="kolecta" className="glow-primary" disabled={!carrier || (carrier !== 'retirada' && !trackingCode) || updateStatus.isPending} onClick={() => handleShip(order)}>
              {carrier === 'retirada' ? 'Confirmar retirada' : 'Confirmar envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </SellerLayout>
  );
}

// ── Painel da etiqueta ─────────────────────────────────
// A etiqueta é emitida AUTOMATICAMENTE quando o pedido é pago (ou o leilão
// arrematado), no serviço que o COMPRADOR escolheu e pagou no checkout, e o PDF
// vai por e-mail ao vendedor.
//
// Antes aqui havia um diálogo que recotava o frete e deixava o vendedor escolher
// serviço e origem de novo. Isso permitia despachar num serviço diferente do que
// foi cobrado do comprador e criava um SEGUNDO carrinho no Melhor Envio — a
// carteira da Kolecta era debitada duas vezes pelo mesmo pedido.
//
// O que sobrou é status + "tentar de novo" para quando a emissão falha.

function ShippingLabelPanel({ order }: { order: Order }) {
  const retry = useRetryLabel(order.id);
  const status = order.shippingLabelStatus ?? null;
  const pronta = status === 'ready' && !!order.shippingLabelUrl;
  const falhou = status === 'failed';
  const emAndamento = !!status && !pronta && !falhou;

  if (pronta) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <strong className="block text-foreground">Etiqueta enviada por e-mail</strong>
            {order.shippingServiceName || 'Serviço escolhido pelo comprador'}
            {order.trackingCode ? ` · ${order.trackingCode}` : ''}
            <span className="block mt-1">O frete já foi pago pela Kolecta — é só imprimir, colar e postar.</span>
          </div>
        </div>
        <Button asChild className="w-full" variant="outline-gold" size="sm">
          <a href={order.shippingLabelUrl!} target="_blank" rel="noopener noreferrer">
            <Tag className="h-4 w-4 mr-2" /> Baixar etiqueta (PDF)
          </a>
        </Button>
      </div>
    );
  }

  if (falhou) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <strong className="block text-foreground">Não conseguimos emitir a etiqueta</strong>
            {order.shippingLabelError || 'Falha na comunicação com o Melhor Envio.'}
          </div>
        </div>
        <Button
          className="w-full"
          variant="outline-gold"
          size="sm"
          disabled={retry.isPending}
          onClick={() => retry.mutate()}
        >
          {retry.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Tag className="h-4 w-4 mr-2" />}
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
      <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground">
        {emAndamento
          ? 'Estamos emitindo sua etiqueta no Melhor Envio.'
          : 'A etiqueta é emitida automaticamente pela Kolecta.'}
        <strong className="block mt-1 text-foreground">
          Você recebe o PDF por e-mail — não precisa gerar nada aqui.
        </strong>
      </p>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Truck, Package, CreditCard, CheckCircle2, Clock,
  Copy, MessageSquare, ShieldCheck, User, MapPin, Tag, ExternalLink, Loader2, AlertCircle,
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
  useAddresses, useListing, useGenerateLabel,
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
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  pagamento_confirmado: { label: 'Pagamento confirmado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  em_separacao: { label: 'Em separação', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  enviado: { label: 'Enviado', cls: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30' },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  cancelado: { label: 'Cancelado', cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
};

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
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
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
    if (!trackingCode) return;
    // carrier/estimatedDate são apenas UX — o backend persiste só o trackingCode.
    await updateStatus.mutateAsync({ id: order.id, status: 'shipped', trackingCode });
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
  const payoutStatus = order.buyerConfirmedAt
    ? 'Liberado ao vendedor'
    : order.status === 'delivered'
      ? 'Em verificação (aguardando confirmação)'
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
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-600">
                    Aguardando confirmação do pagamento. As ações de envio ficam
                    liberadas assim que o pagamento for confirmado.
                  </div>
                )}
                {(order.status === 'paid' || order.status === 'processing') && (
                  <>
                    <Button className="w-full" variant="outline-gold" onClick={() => setLabelDialogOpen(true)}>
                      <Tag className="h-4 w-4 mr-2" /> Gerar etiqueta
                    </Button>
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
            <div className="space-y-2">
              <Label>Código de rastreamento *</Label>
              <Input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="Ex: BR123456789" />
            </div>
            <div className="space-y-2">
              <Label>Data estimada de entrega</Label>
              <Input type="date" value={estimatedDate} onChange={(e) => setEstimatedDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShipDialogOpen(false)}>Cancelar</Button>
            <Button variant="kolecta" className="glow-primary" disabled={!carrier || !trackingCode || updateStatus.isPending} onClick={() => handleShip(order)}>
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Gerar etiqueta (Melhor Envio) ──── */}
      <GenerateLabelDialog order={order} open={labelDialogOpen} onOpenChange={setLabelDialogOpen} />
    </SellerLayout>
  );
}

// ── Diálogo de geração de etiqueta ───────────────────────────
// Cota o frete (origem = endereço do vendedor; pacote = medidas do anúncio),
// deixa escolher serviço/origem, e chama POST /api/shipping/label. O retorno é
// a URL do painel Melhor Envio para o vendedor pagar e imprimir a etiqueta.

function GenerateLabelDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const { query: addressQuery } = useAddresses();
  const addresses = addressQuery.data ?? [];
  const { data: listing } = useListing(order.listingId);
  const generateLabel = useGenerateLabel();

  const [originId, setOriginId] = useState('');
  const [options, setOptions] = useState<ShippingQuoteOption[]>([]);
  const [serviceId, setServiceId] = useState<string>('');
  const [quoting, setQuoting] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [lengthCm, setLengthCm] = useState('');
  const [result, setResult] = useState<GenerateLabelResult | null>(null);

  // Origem: preseleciona o endereço padrão do vendedor.
  useEffect(() => {
    if (!originId && addresses.length) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setOriginId(def.id);
    }
  }, [addresses, originId]);

  // Volumes: prefill das medidas do anúncio (peso em g → kg), com defaults.
  useEffect(() => {
    if (!listing) return;
    setWeightKg(listing.weightGrams != null ? String(listing.weightGrams / 1000) : '0.3');
    setWidthCm(listing.widthCm != null ? String(listing.widthCm) : '16');
    setHeightCm(listing.heightCm != null ? String(listing.heightCm) : '6');
    setLengthCm(listing.lengthCm != null ? String(listing.lengthCm) : '12');
  }, [listing]);

  // Cota ao abrir.
  useEffect(() => {
    if (!open) return;
    setResult(null);
    let cancelled = false;
    (async () => {
      if (!order.address?.zip) return;
      setQuoting(true);
      try {
        const opts = await api.shipping.quote({
          to_cep: order.address.zip,
          listing_id: order.listingId,
        });
        if (cancelled) return;
        setOptions(opts);
        const first = opts.find((o) => typeof o.raw?.id === 'number');
        setServiceId(first?.raw?.id != null ? String(first.raw.id) : '');
      } catch (e: any) {
        if (!cancelled) toast({ title: 'Erro ao cotar frete', description: e.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setQuoting(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const num = (s: string, d: number) => {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : d;
  };

  async function handleGenerate() {
    if (!serviceId || !originId) return;
    const res = await generateLabel.mutateAsync({
      order_id: order.id,
      service_id: Number(serviceId),
      origin_address_id: originId,
      volumes: {
        weight_kg: num(weightKg, 0.3),
        width_cm: Math.round(num(widthCm, 16)),
        height_cm: Math.round(num(heightCm, 6)),
        length_cm: Math.round(num(lengthCm, 12)),
      },
    });
    setResult(res);
  }

  const noAddress = !addressQuery.isLoading && addresses.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Gerar etiqueta</DialogTitle>
          <DialogDescription>
            Adiciona o envio ao carrinho do Melhor Envio. Você finaliza o pagamento e imprime no painel.
          </DialogDescription>
        </DialogHeader>

        {/* Sem endereço de origem cadastrado */}
        {noAddress ? (
          <div className="p-4 rounded-md bg-destructive/5 border border-destructive/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Cadastre um endereço de origem</p>
              <p className="text-muted-foreground mt-0.5">É de lá que a etiqueta será postada.</p>
              <Button variant="kolecta" size="sm" className="mt-3" asChild>
                <Link to="/conta/enderecos">Cadastrar endereço</Link>
              </Button>
            </div>
          </div>
        ) : result ? (
          // Sucesso: link para o painel
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-md bg-emerald-500/5 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Envio no carrinho do Melhor Envio</p>
                <p className="text-muted-foreground mt-0.5">{result.message}</p>
                {result.protocol && (
                  <p className="text-xs text-muted-foreground mt-1">Protocolo: {result.protocol}</p>
                )}
              </div>
            </div>
            <Button variant="kolecta" className="w-full glow-primary" asChild>
              <a href={result.panelUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Abrir painel Melhor Envio
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Origem */}
            <div className="space-y-2">
              <Label>Endereço de origem</Label>
              <Select value={originId} onValueChange={setOriginId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {addresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label ? `${a.label} — ` : ''}{a.city}/{a.state} · CEP {a.zip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serviço (cotação) */}
            <div className="space-y-2">
              <Label>Serviço de envio</Label>
              {quoting ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cotando…
                </div>
              ) : options.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma opção de frete retornada.</p>
              ) : (
                <RadioGroup value={serviceId} onValueChange={setServiceId} className="space-y-2">
                  {options.map((o) => {
                    const id = typeof o.raw?.id === 'number' ? String(o.raw.id) : '';
                    return (
                      <label
                        key={id || o.service}
                        htmlFor={`svc-${id}`}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                          serviceId === id ? 'border-kolecta-gold/60 bg-kolecta-gold/5' : 'border-border hover:border-primary/40',
                          !id && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <RadioGroupItem value={id} id={`svc-${id}`} disabled={!id} />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{o.carrier} {o.service}</span>
                          <span className="text-xs text-muted-foreground ml-2">{o.delivery_time_days} dias úteis</span>
                        </div>
                        <span className="text-sm font-bold text-primary">{formatBRL(o.price)}</span>
                      </label>
                    );
                  })}
                </RadioGroup>
              )}
            </div>

            {/* Pacote */}
            <div className="space-y-2">
              <Label>Pacote</Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0.3" />
                  <span className="text-[10px] text-muted-foreground">Peso (kg)</span>
                </div>
                <div>
                  <Input value={widthCm} onChange={(e) => setWidthCm(e.target.value)} placeholder="16" />
                  <span className="text-[10px] text-muted-foreground">Larg (cm)</span>
                </div>
                <div>
                  <Input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="6" />
                  <span className="text-[10px] text-muted-foreground">Alt (cm)</span>
                </div>
                <div>
                  <Input value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} placeholder="12" />
                  <span className="text-[10px] text-muted-foreground">Compr (cm)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!noAddress && !result && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              variant="kolecta"
              className="glow-primary"
              disabled={!serviceId || !originId || generateLabel.isPending}
              onClick={handleGenerate}
            >
              {generateLabel.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tag className="h-4 w-4 mr-2" />}
              Gerar etiqueta
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

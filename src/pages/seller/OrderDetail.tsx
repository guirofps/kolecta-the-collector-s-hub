import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Truck, Package, CreditCard, CheckCircle2, Clock,
  Copy, MessageSquare, ShieldCheck, User, MapPin,
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

// ── Types ────────────────────────────────────────────────

type OrderStatus = 'pagamento_confirmado' | 'em_separacao' | 'enviado' | 'entregue' | 'cancelado';

interface TimelineEvent {
  key: string;
  label: string;
  description: string;
  date?: string;
  icon: React.ElementType;
}

// ── Status config ────────────────────────────────────────

const statusConfig: Record<OrderStatus, { label: string; cls: string }> = {
  pagamento_confirmado: { label: 'Pagamento confirmado', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  em_separacao: { label: 'Em separação', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  enviado: { label: 'Enviado', cls: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30' },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  cancelado: { label: 'Cancelado', cls: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/30' },
};

// ── Mock data ────────────────────────────────────────────

const mockOrderDetail = {
  id: 'so1',
  number: 'KL-000201',
  date: '2025-03-15',
  status: 'pagamento_confirmado' as OrderStatus,
  buyer: {
    name: 'Lucas Mendes',
    city: 'São Paulo',
    state: 'SP',
    address: 'Rua Augusta, 1234, Apto 56, Consolação, São Paulo - SP, CEP 01304-001',
  },
  items: [
    {
      name: 'Turbo HKS GT3076R',
      image: '/placeholder.svg',
      condition: 'Novo',
      quantity: 1,
      unitPrice: 4890,
      subtotal: 4890,
    },
  ],
  total: 4890,
  trackingCode: '',
  financial: {
    gross: 4890,
    commissionRate: 0.08,
    commission: 391.2,
    net: 4498.8,
    payoutStatus: 'Aguardando entrega' as string,
    payoutDate: null as string | null,
  },
  messages: [
    { from: 'buyer', text: 'Olá, quando pretende enviar?', date: '15/03/2025 14:30' },
    { from: 'seller', text: 'Envio amanhã!', date: '15/03/2025 15:02' },
  ],
};

const timelineSteps: TimelineEvent[] = [
  { key: 'pedido', label: 'Pedido realizado', description: 'Comprador finalizou a compra', date: '15/03/2025 10:22', icon: Package },
  { key: 'pagamento_confirmado', label: 'Pagamento confirmado', description: 'Pagamento processado com sucesso', date: '15/03/2025 10:25', icon: CreditCard },
  { key: 'em_separacao', label: 'Em separação', description: 'Produto sendo preparado para envio', icon: Clock },
  { key: 'enviado', label: 'Enviado', description: 'Produto enviado ao comprador', icon: Truck },
  { key: 'entregue', label: 'Entregue', description: 'Comprador recebeu o produto', icon: CheckCircle2 },
];

function getActiveIndex(status: OrderStatus) {
  const map: Record<string, number> = {
    pagamento_confirmado: 1,
    em_separacao: 2,
    enviado: 3,
    entregue: 4,
    cancelado: -1,
  };
  return map[status] ?? 0;
}

// ── Component ────────────────────────────────────────────

export default function SellerOrderDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');

  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);

  /* API: GET /api/seller/orders/:id — detalhe completo */
  const order = mockOrderDetail;
  const sc = statusConfig[order.status];
  const activeIdx = getActiveIndex(order.status);
  const fin = order.financial;

  function copyAddress() {
    navigator.clipboard.writeText(order.buyer.address);
    toast({ title: 'Endereço copiado!', description: 'Colado na área de transferência.' });
  }

  function handleShip() {
    if (!carrier || !trackingCode) return;
    /* API: PATCH /api/seller/orders/:id/status
       Body: { status: string, trackingCode?: string, carrier?: string } */
    toast({ title: 'Envio confirmado!', description: `Código: ${trackingCode}` });
    setShipDialogOpen(false);
  }

  if (loading) {
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

  return (
    <SellerLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-3">
            <Link to="/painel-vendedor/pedidos"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar aos pedidos</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold tracking-tight">Pedido #{order.number}</h1>
            <Badge variant="outline" className={sc.cls}>{sc.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{new Date(order.date).toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN (2/3) ──────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg">Itens do pedido</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <img src={item.image} alt={item.name} className="w-20 h-20 rounded object-cover bg-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold">{item.name}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">{item.condition}</Badge>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">x{item.quantity}</p>
                      <p className="font-medium">{formatBRL(item.unitPrice)}</p>
                    </div>
                  </div>
                ))}
                <Separator className="opacity-50" />
                <div className="flex justify-end">
                  <span className="font-heading font-bold text-xl text-kolecta-gold">{formatBRL(order.total)}</span>
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
                          {step.date && <p className="text-[10px] text-muted-foreground mt-0.5">{step.date}</p>}
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
                {order.messages.map((m, i) => (
                  <div key={i} className={cn('flex gap-2', m.from === 'seller' && 'justify-end')}>
                    <div className={cn('rounded-lg px-3 py-2 max-w-[80%] text-sm', m.from === 'buyer' ? 'bg-muted' : 'bg-primary/10')}>
                      <p>{m.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{m.date}</p>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/painel-vendedor/mensagens">Ver conversa completa</Link>
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
                {order.status === 'pagamento_confirmado' && (
                  <Button className="w-full glow-primary" variant="kolecta" onClick={() => setShipDialogOpen(true)}>
                    <Truck className="h-4 w-4 mr-2" /> Confirmar envio
                  </Button>
                )}
                {order.status === 'enviado' && order.trackingCode && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Código de rastreamento</p>
                    <p className="font-mono text-sm font-medium">{order.trackingCode}</p>
                    <Button size="sm" variant="outline-gold" className="w-full">Atualizar rastreamento</Button>
                  </div>
                )}
                {order.status === 'entregue' && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 w-full justify-center py-2">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Concluído
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Buyer */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><User className="h-4 w-4" /> Comprador</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-medium">{order.buyer.name}</p>
                <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{order.buyer.city}/{order.buyer.state}</p>
                <Separator className="opacity-50" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Endereço de entrega</p>
                  <p className="text-xs leading-relaxed">{order.buyer.address}</p>
                </div>
                <Button size="sm" variant="ghost" className="w-full" onClick={copyAddress}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar endereço
                </Button>
              </CardContent>
            </Card>

            {/* Financial */}
            {/* API: GET /api/seller/orders/:id/financial */}
            <Card className="bg-gradient-card">
              <CardHeader><CardTitle className="font-heading text-lg">Financeiro</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor bruto</span>
                  <span>{formatBRL(fin.gross)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comissão Kolecta ({(fin.commissionRate * 100).toFixed(0)}%)</span>
                  <span className="text-kolecta-red">-{formatBRL(fin.commission)}</span>
                </div>
                <Separator className="opacity-50" />
                <div className="flex justify-between items-center">
                  <span className="font-heading font-semibold">Valor líquido</span>
                  <span className="font-heading font-bold text-lg text-kolecta-gold">{formatBRL(fin.net)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{fin.payoutStatus}</span>
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
            <DialogDescription>Informe os dados de envio do pedido #{order.number}</DialogDescription>
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
            <Button variant="kolecta" className="glow-primary" disabled={!carrier || !trackingCode} onClick={handleShip}>
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}

import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, Clock, Plus, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
type DisputeReason = 'not_received' | 'different_item' | 'defective' | 'wrong_charge';
type DisputeStatus = 'awaiting_seller' | 'awaiting_buyer' | 'under_review' | 'resolved' | 'closed_no_resolution';
type Resolution = 'buyer_favor' | 'seller_favor' | 'no_resolution';

interface DisputeProduct {
  id: string;
  title: string;
  image: string;
  seller: { name: string; slug: string };
}

interface TimelineEvent {
  id: string;
  type: 'message' | 'system';
  sender?: 'buyer' | 'seller' | 'admin';
  senderName?: string;
  content: string;
  createdAt: string;
}

interface Dispute {
  id: string;
  orderId: string;
  product: DisputeProduct;
  reason: DisputeReason;
  status: DisputeStatus;
  description: string;
  openedAt: string;
  deadlineAt?: string;
  resolution?: Resolution;
  resolvedAt?: string;
  timeline: TimelineEvent[];
}

/* ─── Config ─── */
const reasonLabels: Record<DisputeReason, string> = {
  not_received: 'Item não recebido',
  different_item: 'Item diferente do anunciado',
  defective: 'Item com defeito',
  wrong_charge: 'Cobrança indevida',
};
const reasonColors: Record<DisputeReason, string> = {
  not_received: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  different_item: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/20',
  defective: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/20',
  wrong_charge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};
const statusLabels: Record<DisputeStatus, string> = {
  awaiting_seller: 'Aguardando vendedor',
  awaiting_buyer: 'Aguardando comprador',
  under_review: 'Em análise pela Kolecta',
  resolved: 'Resolvida',
  closed_no_resolution: 'Encerrada sem resolução',
};
const statusColors: Record<DisputeStatus, string> = {
  awaiting_seller: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  awaiting_buyer: 'bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/20',
  under_review: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed_no_resolution: 'bg-muted text-muted-foreground',
};
const resolutionLabels: Record<Resolution, string> = {
  buyer_favor: 'Resolvido a favor do comprador',
  seller_favor: 'Resolvido a favor do vendedor',
  no_resolution: 'Encerrado sem resolução',
};
const resolutionColors: Record<Resolution, string> = {
  buyer_favor: 'bg-green-500/10 text-green-600 border-green-500/20',
  seller_favor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  no_resolution: 'bg-muted text-muted-foreground',
};

/* ─── Mock Data ─── */
const now = new Date();
const twoDaysLater = new Date(now.getTime() + 2 * 86400000).toISOString();
const fiveDaysLater = new Date(now.getTime() + 5 * 86400000).toISOString();

const mockDisputes: Dispute[] = [
  {
    id: 'DSP-001',
    orderId: 'KL-000123',
    product: { id: 'p1', title: 'Volante Nardi Classic 330mm', image: '/placeholder.svg', seller: { name: 'JDM Imports', slug: 'jdm-imports' } },
    reason: 'different_item',
    status: 'awaiting_buyer',
    description: 'O volante recebido é diferente do anunciado. Anúncio mostrava couro preto, recebi couro marrom.',
    openedAt: '2025-03-12',
    deadlineAt: twoDaysLater,
    timeline: [
      { id: 'e1', type: 'system', content: 'Disputa aberta pelo comprador', createdAt: '2025-03-12T10:00:00' },
      { id: 'e2', type: 'message', sender: 'buyer', senderName: 'Você', content: 'O volante recebido é diferente do anunciado.', createdAt: '2025-03-12T10:01:00' },
      { id: 'e3', type: 'message', sender: 'seller', senderName: 'JDM Imports', content: 'Peço desculpas, houve um erro no envio. Posso enviar o correto.', createdAt: '2025-03-13T09:00:00' },
      { id: 'e4', type: 'system', content: 'Aguardando resposta do comprador', createdAt: '2025-03-13T09:01:00' },
    ],
  },
  {
    id: 'DSP-002',
    orderId: 'KL-000125',
    product: { id: 'p4', title: 'Shift Knob Tomei Duracon', image: '/placeholder.svg', seller: { name: 'Drift Garage', slug: 'drift-garage' } },
    reason: 'not_received',
    status: 'under_review',
    description: 'Já se passaram 30 dias e o item não chegou.',
    openedAt: '2025-03-05',
    deadlineAt: fiveDaysLater,
    timeline: [
      { id: 'e5', type: 'system', content: 'Disputa aberta pelo comprador', createdAt: '2025-03-05T14:00:00' },
      { id: 'e6', type: 'message', sender: 'buyer', senderName: 'Você', content: 'Já se passaram 30 dias e não recebi o item.', createdAt: '2025-03-05T14:01:00' },
      { id: 'e7', type: 'message', sender: 'seller', senderName: 'Drift Garage', content: 'O código de rastreio indica que foi entregue.', createdAt: '2025-03-06T10:00:00' },
      { id: 'e8', type: 'message', sender: 'buyer', senderName: 'Você', content: 'Não recebi nada no endereço informado.', createdAt: '2025-03-06T11:00:00' },
      { id: 'e9', type: 'system', content: 'Disputa escalada para análise da Kolecta', createdAt: '2025-03-07T08:00:00' },
      { id: 'e10', type: 'message', sender: 'admin', senderName: 'Kolecta', content: 'Estamos analisando as evidências. Retornaremos em breve.', createdAt: '2025-03-07T09:00:00' },
    ],
  },
  {
    id: 'DSP-003',
    orderId: 'KL-000100',
    product: { id: 'p2', title: 'Coilovers Tein Flex Z - S14', image: '/placeholder.svg', seller: { name: 'Touge Parts', slug: 'touge-parts' } },
    reason: 'defective',
    status: 'resolved',
    description: 'Uma das molas veio quebrada.',
    openedAt: '2025-02-10',
    resolution: 'buyer_favor',
    resolvedAt: '2025-02-20',
    timeline: [
      { id: 'e11', type: 'system', content: 'Disputa aberta pelo comprador', createdAt: '2025-02-10T10:00:00' },
      { id: 'e12', type: 'message', sender: 'buyer', senderName: 'Você', content: 'Uma das molas veio quebrada na embalagem.', createdAt: '2025-02-10T10:01:00' },
      { id: 'e13', type: 'system', content: 'Resolvido a favor do comprador — reembolso total', createdAt: '2025-02-20T12:00:00' },
    ],
  },
  {
    id: 'DSP-004',
    orderId: 'KL-000090',
    product: { id: 'p3', title: 'Adesivo Recaro Racing - Par', image: '/placeholder.svg', seller: { name: 'JDM Imports', slug: 'jdm-imports' } },
    reason: 'wrong_charge',
    status: 'closed_no_resolution',
    description: 'Fui cobrado duas vezes pelo mesmo pedido.',
    openedAt: '2025-01-20',
    resolution: 'no_resolution',
    resolvedAt: '2025-02-05',
    timeline: [
      { id: 'e14', type: 'system', content: 'Disputa aberta pelo comprador', createdAt: '2025-01-20T08:00:00' },
      { id: 'e15', type: 'message', sender: 'buyer', senderName: 'Você', content: 'Fui cobrado duas vezes.', createdAt: '2025-01-20T08:01:00' },
      { id: 'e16', type: 'message', sender: 'seller', senderName: 'JDM Imports', content: 'Verificamos e a cobrança está correta.', createdAt: '2025-01-21T10:00:00' },
      { id: 'e17', type: 'system', content: 'Disputa encerrada sem resolução', createdAt: '2025-02-05T12:00:00' },
    ],
  },
];

const mockOrders = [
  { id: 'KL-000130', title: 'Pedido #KL-000130 — Turbo Timer HKS' },
  { id: 'KL-000132', title: 'Pedido #KL-000132 — Bucket Seat Bride' },
];

/* ─── Helpers ─── */
function daysRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/* ─── Detail Dialog ─── */
function DisputeDetailDialog({
  dispute,
  open,
  onOpenChange,
  onRespond,
}: {
  dispute: Dispute;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRespond: (disputeId: string, message: string) => void;
}) {
  const [response, setResponse] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const isBuyerTurn = dispute.status === 'awaiting_buyer';

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).slice(0, 5 - files.length).map(f => URL.createObjectURL(f));
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="font-heading text-xl font-bold uppercase">
              Disputa {dispute.id}
            </DialogTitle>
            <Badge className={cn('text-[10px]', statusColors[dispute.status])}>
              {statusLabels[dispute.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Pedido #{dispute.orderId}</p>
        </DialogHeader>

        <Separator />

        {/* API: GET /api/disputes/:id — detalhe completo
            POST /api/disputes/:id/messages — enviar resposta
            POST /api/disputes/:id/escalate — escalar para admin */}

        <ScrollArea className="flex-1 px-5 py-3">
          <div className="space-y-4">
            {dispute.timeline.map((event) => {
              if (event.type === 'system') {
                return (
                  <div key={event.id} className="flex justify-center">
                    <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full text-center">
                      {event.content}
                    </span>
                  </div>
                );
              }
              const isRight = event.sender === 'buyer';
              const initials = event.sender === 'admin' ? 'K' : event.sender === 'seller' ? 'V' : 'EU';
              return (
                <div key={event.id} className={cn('flex gap-2', isRight ? 'flex-row-reverse' : '')}>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-heading">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn('max-w-[80%]', isRight ? 'text-right' : '')}>
                    <p className="text-[10px] text-muted-foreground font-medium">{event.senderName}</p>
                    <div className={cn(
                      'px-3 py-2 rounded-xl text-sm mt-0.5',
                      isRight ? 'bg-kolecta-gold/10 border border-kolecta-gold/20 rounded-tr-sm' : 'bg-muted rounded-tl-sm'
                    )}>
                      {event.content}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(event.createdAt).toLocaleDateString('pt-BR')} {new Date(event.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {isBuyerTurn && (
          <>
            <Separator />
            <div className="px-5 py-3 space-y-3 shrink-0">
              <Textarea
                placeholder="Adicione sua resposta ou evidências..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="resize-none min-h-[80px]"
              />
              {/* POST /api/uploads para enviar arquivos */}
              <div className="flex gap-2 flex-wrap items-center">
                {files.map((f, i) => (
                  <div key={i} className="relative w-12 h-12 rounded bg-muted overflow-hidden">
                    <img src={f} alt="" className="w-full h-full object-cover" />
                    <button className="absolute top-0 right-0 bg-background/80 rounded-full p-0.5" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                {files.length < 5 && (
                  <button
                    className="w-12 h-12 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-kolecta-gold hover:text-kolecta-gold transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="kolecta"
                  className="glow-primary flex-1"
                  disabled={!response.trim()}
                  onClick={() => {
                    onRespond(dispute.id, response);
                    setResponse('');
                    setFiles([]);
                    onOpenChange(false);
                  }}
                >
                  Enviar resposta
                </Button>
              </div>
            </div>
          </>
        )}

        {dispute.status !== 'resolved' && dispute.status !== 'closed_no_resolution' && dispute.status !== 'under_review' && (
          <div className="px-5 pb-4 shrink-0">
            {/* API: POST /api/disputes/:id/escalate */}
            <Button variant="ghost" className="w-full text-sm" onClick={() => onOpenChange(false)}>
              Solicitar mediação da Kolecta
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── New Dispute Dialog ─── */
function NewDisputeDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: () => void;
}) {
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).slice(0, 5 - files.length).map(f => URL.createObjectURL(f));
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    e.target.value = '';
  };

  const canSubmit = orderId && reason && description.length >= 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* API: POST /api/disputes
          Body: { orderId, reason, description, files[] } */}
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold uppercase">Abrir nova disputa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pedido relacionado</label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger><SelectValue placeholder="Selecione o pedido" /></SelectTrigger>
              <SelectContent>
                {mockOrders.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Motivo</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>
                {(Object.entries(reasonLabels) as [DisputeReason, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <div className="relative">
              <Textarea
                placeholder="Descreva o problema em detalhes (mínimo 50 caracteres)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none min-h-[100px]"
              />
              <span className={cn('absolute bottom-2 right-2 text-xs', description.length < 50 ? 'text-kolecta-red' : 'text-muted-foreground')}>
                {description.length}/50 mín.
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Evidências (opcional)</label>
            <div className="flex gap-2 flex-wrap">
              {files.map((f, i) => (
                <div key={i} className="relative w-16 h-16 rounded bg-muted overflow-hidden">
                  <img src={f} alt="" className="w-full h-full object-cover" />
                  <button className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <button
                  className="w-16 h-16 rounded border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:border-kolecta-gold hover:text-kolecta-gold transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="text-[10px]">Anexar</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="kolecta"
            className="glow-primary"
            disabled={!canSubmit}
            onClick={() => { onSubmit(); onOpenChange(false); }}
          >
            Abrir disputa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ─── */
export default function DisputesPage() {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  /* API: GET /api/disputes?status=open|closed
     Retorna: { disputes: Dispute[] } */

  // Simulate loading
  useState(() => {
    setTimeout(() => {
      setDisputes(mockDisputes);
      setLoading(false);
    }, 600);
  });

  const openDisputes = disputes.filter(d => !['resolved', 'closed_no_resolution'].includes(d.status));
  const closedDisputes = disputes.filter(d => ['resolved', 'closed_no_resolution'].includes(d.status));

  const handleRespond = (disputeId: string, message: string) => {
    setDisputes(prev =>
      prev.map(d =>
        d.id === disputeId
          ? {
              ...d,
              status: 'awaiting_seller' as DisputeStatus,
              timeline: [...d.timeline, {
                id: `e-${Date.now()}`,
                type: 'message' as const,
                sender: 'buyer' as const,
                senderName: 'Você',
                content: message,
                createdAt: new Date().toISOString(),
              }],
            }
          : d
      )
    );
  };

  const renderCard = (dispute: Dispute, isClosed: boolean) => {
    const days = dispute.deadlineAt ? daysRemaining(dispute.deadlineAt) : null;

    return (
      <Card key={dispute.id} className="bg-gradient-card border-border p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
            <img src={dispute.product.image} alt={dispute.product.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-heading font-bold text-sm">
                  {dispute.id} <span className="text-muted-foreground font-normal">· Pedido #{dispute.orderId}</span>
                </p>
                <p className="font-heading font-bold line-clamp-1 mt-0.5">{dispute.product.title}</p>
                <Link
                  to={`/vendedor/${dispute.product.seller.slug}`}
                  className="text-xs text-muted-foreground hover:text-kolecta-gold transition-colors"
                >
                  {dispute.product.seller.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aberta em {new Date(dispute.openedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge className={cn('text-[10px]', reasonColors[dispute.reason])}>
                  {reasonLabels[dispute.reason]}
                </Badge>
                {isClosed && dispute.resolution ? (
                  <Badge className={cn('text-[10px]', resolutionColors[dispute.resolution])}>
                    {resolutionLabels[dispute.resolution]}
                  </Badge>
                ) : (
                  <Badge className={cn('text-[10px]', statusColors[dispute.status])}>
                    {statusLabels[dispute.status]}
                  </Badge>
                )}
              </div>
            </div>

            {!isClosed && dispute.status === 'awaiting_buyer' && days !== null && (
              <div className={cn('flex items-center gap-1 mt-2 text-xs', days <= 2 ? 'text-kolecta-red' : 'text-muted-foreground')}>
                <Clock className="h-3.5 w-3.5" />
                {days} {days === 1 ? 'dia restante' : 'dias restantes'}
              </div>
            )}

            <div className="mt-3">
              <Button
                variant="kolecta"
                size="sm"
                className="glow-primary"
                onClick={() => {
                  setSelectedDispute(dispute);
                  setDetailOpen(true);
                }}
              >
                Ver disputa
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl font-extrabold uppercase tracking-wide">Disputas</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie problemas com seus pedidos</p>
          </div>
          <Button variant="kolecta" className="glow-primary" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" />
            Abrir nova disputa
          </Button>
        </div>

        <Tabs defaultValue="open">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="open" className="font-heading uppercase tracking-wider text-xs gap-1.5">
              Abertas
              {openDisputes.length > 0 && (
                <Badge className="bg-kolecta-red/10 text-kolecta-red border-kolecta-red/20 text-[10px] h-5 min-w-5 px-1.5">
                  {openDisputes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed" className="font-heading uppercase tracking-wider text-xs">
              Encerradas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-6">
            {loading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : openDisputes.length === 0 ? (
              <EmptyState icon={Shield} title="Nenhuma disputa aberta" />
            ) : (
              <div className="space-y-4">{openDisputes.map(d => renderCard(d, false))}</div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-6">
            {loading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : closedDisputes.length === 0 ? (
              <EmptyState icon={Shield} title="Nenhuma disputa encerrada" />
            ) : (
              <div className="space-y-4">{closedDisputes.map(d => renderCard(d, true))}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail dialog */}
      {selectedDispute && (
        <DisputeDetailDialog
          dispute={selectedDispute}
          open={detailOpen}
          onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedDispute(null); }}
          onRespond={handleRespond}
        />
      )}

      {/* New dispute dialog */}
      <NewDisputeDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={() => {}}
      />
    </Layout>
  );
}

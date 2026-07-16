import { useState } from 'react';
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
import { Shield, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDisputes, useDispute, useDisputeEligibleOrders, useCreateDispute, useAddDisputeMessage,
} from '@/hooks/use-api';
import type { UserDispute, UserDisputeStatus } from '@/lib/api';

/* ─── Config ─── */
const reasonLabels: Record<string, string> = {
  not_received: 'Item não recebido',
  different_item: 'Item diferente do anunciado',
  defective: 'Item com defeito',
  wrong_charge: 'Cobrança indevida',
};
const reasonColors: Record<string, string> = {
  not_received: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  different_item: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/20',
  defective: 'bg-kolecta-red/10 text-kolecta-red border-kolecta-red/20',
  wrong_charge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};
const statusLabels: Record<UserDisputeStatus, string> = {
  open: 'Aberta',
  under_review: 'Em análise pela Kolecta',
  resolved: 'Resolvida',
  closed: 'Encerrada',
};
const statusColors: Record<UserDisputeStatus, string> = {
  open: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  under_review: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed: 'bg-muted text-muted-foreground',
};
const resolutionLabels: Record<string, string> = {
  buyer_favor: 'Resolvido a favor do comprador',
  seller_favor: 'Resolvido a favor do vendedor',
  no_resolution: 'Encerrado sem resolução',
};
const resolutionColors: Record<string, string> = {
  buyer_favor: 'bg-green-500/10 text-green-600 border-green-500/20',
  seller_favor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  no_resolution: 'bg-muted text-muted-foreground',
};

const OPEN_STATUSES: UserDisputeStatus[] = ['open', 'under_review'];

/* ─── Detail Dialog ─── */
function DisputeDetailDialog({
  disputeId,
  open,
  onOpenChange,
}: {
  disputeId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: dispute, isLoading } = useDispute(open ? disputeId : undefined);
  const addMessage = useAddDisputeMessage();
  const [response, setResponse] = useState('');

  const canReply = dispute && OPEN_STATUSES.includes(dispute.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="font-heading text-xl font-bold uppercase">
              Disputa
            </DialogTitle>
            {dispute && (
              <Badge className={cn('text-[10px]', statusColors[dispute.status])}>
                {statusLabels[dispute.status]}
              </Badge>
            )}
          </div>
          {dispute && <p className="text-xs text-muted-foreground">Pedido #{dispute.orderId.slice(0, 8)}</p>}
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 px-5 py-3">
          {isLoading || !dispute ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {(dispute.timeline ?? []).map((event) => {
                if (event.type === 'system') {
                  return (
                    <div key={event.id} className="flex justify-center">
                      <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full text-center">
                        {event.content}
                      </span>
                    </div>
                  );
                }
                const isRight = event.senderRole === 'buyer';
                const initials = event.senderRole === 'admin' ? 'K' : event.senderRole === 'seller' ? 'V' : 'EU';
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
          )}
        </ScrollArea>

        {canReply && (
          <>
            <Separator />
            <div className="px-5 py-3 space-y-3 shrink-0">
              <Textarea
                placeholder="Adicione sua resposta..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="resize-none min-h-[80px]"
              />
              <Button
                variant="kolecta"
                className="glow-primary w-full"
                disabled={!response.trim() || addMessage.isPending}
                onClick={() => {
                  addMessage.mutate(
                    { id: disputeId, content: response },
                    { onSuccess: () => setResponse('') },
                  );
                }}
              >
                {addMessage.isPending ? 'Enviando...' : 'Enviar resposta'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── New Dispute Dialog ─── */
function NewDisputeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: eligibleOrders = [], isLoading } = useDisputeEligibleOrders(open);
  const createDispute = useCreateDispute();
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const canSubmit = orderId && reason && description.length >= 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold uppercase">Abrir nova disputa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pedido relacionado</label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Carregando...' : 'Selecione o pedido'} />
              </SelectTrigger>
              <SelectContent>
                {eligibleOrders.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && eligibleOrders.length === 0 && (
              <p className="text-xs text-muted-foreground">Você não tem pedidos elegíveis para disputa.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Motivo</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(reasonLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <div className="relative">
              <Textarea
                placeholder="Descreva o problema em detalhes (mínimo 20 caracteres)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none min-h-[100px]"
              />
              <span className={cn('absolute bottom-2 right-2 text-xs', description.length < 20 ? 'text-kolecta-red' : 'text-muted-foreground')}>
                {description.length}/20 mín.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="kolecta"
            className="glow-primary"
            disabled={!canSubmit || createDispute.isPending}
            onClick={() => {
              createDispute.mutate(
                { orderId, reason, description },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setOrderId(''); setReason(''); setDescription('');
                  },
                },
              );
            }}
          >
            {createDispute.isPending ? 'Abrindo...' : 'Abrir disputa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ─── */
export default function DisputesPage() {
  const { data: disputes = [], isLoading } = useDisputes();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const openDisputes = disputes.filter(d => OPEN_STATUSES.includes(d.status));
  const closedDisputes = disputes.filter(d => !OPEN_STATUSES.includes(d.status));

  const renderCard = (dispute: UserDispute, isClosed: boolean) => (
    <Card key={dispute.id} className="bg-gradient-card border-border p-4">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
          <img src={dispute.order.listingImage ?? '/placeholder.svg'} alt={dispute.order.listingTitle} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-heading font-bold text-sm">
                Pedido #{dispute.orderId.slice(0, 8)}
              </p>
              <p className="font-heading font-bold line-clamp-1 mt-0.5">{dispute.order.listingTitle}</p>
              {dispute.order.sellerId ? (
                <Link
                  to={`/vendedor/${dispute.order.sellerId}`}
                  className="text-xs text-muted-foreground hover:text-kolecta-gold transition-colors"
                >
                  {dispute.order.sellerName}
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">{dispute.order.sellerName}</span>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                Aberta em {new Date(dispute.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge className={cn('text-[10px]', reasonColors[dispute.reason] ?? 'bg-muted')}>
                {reasonLabels[dispute.reason] ?? dispute.reason}
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

          <div className="mt-3">
            <Button
              variant="kolecta"
              size="sm"
              className="glow-primary"
              onClick={() => {
                setSelectedId(dispute.id);
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
            {isLoading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : openDisputes.length === 0 ? (
              <EmptyState icon={Shield} title="Nenhuma disputa aberta" />
            ) : (
              <div className="space-y-4">{openDisputes.map(d => renderCard(d, false))}</div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-6">
            {isLoading ? (
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
      {selectedId && (
        <DisputeDetailDialog
          disputeId={selectedId}
          open={detailOpen}
          onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedId(null); }}
        />
      )}

      {/* New dispute dialog */}
      <NewDisputeDialog open={newOpen} onOpenChange={setNewOpen} />
    </Layout>
  );
}

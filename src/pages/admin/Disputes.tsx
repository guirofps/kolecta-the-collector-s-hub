import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Eye, DollarSign, RotateCcw } from 'lucide-react';
import { useAdminDisputes, useResolveDispute } from '@/hooks/use-api';
import type { AdminDispute } from '@/lib/api';

type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';

const statusConfig: Record<DisputeStatus, { label: string; color: string }> = {
  open:        { label: 'Aberta',     color: 'bg-accent/10 text-accent border-accent/20' },
  under_review:{ label: 'Em análise', color: 'bg-primary/10 text-primary border-primary/20' },
  resolved:    { label: 'Resolvida',  color: 'bg-secondary text-muted-foreground border-border' },
  closed:      { label: 'Fechada',    color: 'bg-secondary text-muted-foreground border-border' },
};

export default function AdminDisputesPage() {
  const { data: disputes = [], isLoading } = useAdminDisputes();
  const resolveDispute = useResolveDispute();
  const [selected, setSelected] = useState<AdminDispute | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const pending = disputes.filter((d) => d.status === 'open' || d.status === 'under_review');

  const handleAction = (id: string, newStatus: 'resolved' | 'under_review' | 'closed') => {
    resolveDispute.mutate({ disputeId: id, body: { status: newStatus } }, {
      onSuccess: () => setDetailOpen(false),
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Disputas</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Carregando...' : `${pending.length} pendentes`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card border-b border-border">
                  <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">Pedido</th>
                  <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">Motivo</th>
                  <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => {
                  const cfg = statusConfig[d.status as DisputeStatus] ?? statusConfig.closed;
                  return (
                    <tr key={d.id} className="border-b border-border hover:bg-card/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-foreground font-mono text-xs">{d.orderId.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.reason}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${cfg.color} border text-[10px]`}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost-light" size="sm" className="text-xs" onClick={() => { setSelected(d); setDetailOpen(true); }}>
                          <Eye className="h-3 w-3" /> Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          {selected && (
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl uppercase">Disputa {selected.id.slice(0, 8)}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground block">Pedido</span>{selected.orderId.slice(0, 8)}</div>
                  <div><span className="text-xs text-muted-foreground block">Reportado por</span>{selected.reporterId.slice(0, 8)}</div>
                  <div className="col-span-2"><span className="text-xs text-muted-foreground block">Motivo</span>{selected.reason}</div>
                  {selected.description && (
                    <div className="col-span-2"><span className="text-xs text-muted-foreground block">Descrição</span>{selected.description}</div>
                  )}
                </div>

                {selected.status !== 'resolved' && selected.status !== 'closed' && (
                  <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button variant="kolecta" size="sm" disabled={resolveDispute.isPending} onClick={() => handleAction(selected.id, 'resolved')}>
                      <DollarSign className="h-4 w-4" /> Resolver
                    </Button>
                    <Button variant="outline" size="sm" disabled={resolveDispute.isPending} onClick={() => handleAction(selected.id, 'under_review')}>
                      <RotateCcw className="h-4 w-4" /> Em análise
                    </Button>
                    <Button variant="ghost" size="sm" disabled={resolveDispute.isPending} onClick={() => handleAction(selected.id, 'closed')}>
                      Fechar
                    </Button>
                  </DialogFooter>
                )}
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AdminLayout>
  );
}

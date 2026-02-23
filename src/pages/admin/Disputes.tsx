import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Eye, CheckCircle2, RotateCcw, DollarSign } from 'lucide-react';
import { formatBRL } from '@/lib/mock-data';

type DisputeStatus = 'open' | 'in_review' | 'resolved';

interface Dispute {
  id: string;
  orderId: string;
  buyer: string;
  seller: string;
  product: string;
  reason: string;
  amount: number;
  status: DisputeStatus;
  createdAt: string;
}

const statusConfig: Record<DisputeStatus, { label: string; color: string }> = {
  open: { label: 'Aberta', color: 'bg-accent/10 text-accent border-accent/20' },
  in_review: { label: 'Em análise', color: 'bg-primary/10 text-primary border-primary/20' },
  resolved: { label: 'Resolvida', color: 'bg-secondary text-muted-foreground border-border' },
};

const mockDisputes: Dispute[] = [
  { id: 'D001', orderId: 'ORD-2026-0038', buyer: 'Col***or', seller: 'JDM Garage', product: 'HW RLC Skyline R34', reason: 'Item não corresponde à descrição', amount: 520, status: 'open', createdAt: '2026-02-21' },
  { id: 'D002', orderId: 'ORD-2026-0035', buyer: 'Rac***er', seller: 'Escala Premium', product: 'Tomica AE86', reason: 'Item com defeito / danificado', amount: 289, status: 'in_review', createdAt: '2026-02-19' },
  { id: 'D003', orderId: 'ORD-2026-0029', buyer: 'Min***ra', seller: 'Coleção Turbo', product: 'Majorette 911 GT3', reason: 'Embalagem danificada', amount: 45, status: 'resolved', createdAt: '2026-02-15' },
];

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState(mockDisputes);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleAction = (id: string, action: 'release' | 'refund' | 'return') => {
    setDisputes((prev) => prev.map((d) => d.id === id ? { ...d, status: 'resolved' as const } : d));
    setDetailOpen(false);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Disputas</h1>
            <p className="text-sm text-muted-foreground">{disputes.filter((d) => d.status !== 'resolved').length} pendentes</p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card border-b border-border">
                <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">Produto</th>
                <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">Motivo</th>
                <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">Valor</th>
                <th className="text-left px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => {
                const cfg = statusConfig[d.status];
                return (
                  <tr key={d.id} className="border-b border-border hover:bg-card/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.id}</td>
                    <td className="px-4 py-3 text-foreground">{d.product}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.reason}</td>
                    <td className="px-4 py-3 font-heading font-bold">{formatBRL(d.amount)}</td>
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

        {/* Detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          {selected && (
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl uppercase">Disputa {selected.id}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground block">Pedido</span>{selected.orderId}</div>
                  <div><span className="text-xs text-muted-foreground block">Valor</span>{formatBRL(selected.amount)}</div>
                  <div><span className="text-xs text-muted-foreground block">Comprador</span>{selected.buyer}</div>
                  <div><span className="text-xs text-muted-foreground block">Vendedor</span>{selected.seller}</div>
                  <div className="col-span-2"><span className="text-xs text-muted-foreground block">Motivo</span>{selected.reason}</div>
                </div>

                {selected.status !== 'resolved' && (
                  <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button variant="kolecta" size="sm" onClick={() => handleAction(selected.id, 'release')}>
                      <DollarSign className="h-4 w-4" /> Liberar repasse
                    </Button>
                    <Button variant="accent" size="sm" onClick={() => handleAction(selected.id, 'refund')}>
                      <RotateCcw className="h-4 w-4" /> Reembolsar comprador
                    </Button>
                    <Button variant="outline-gold" size="sm" onClick={() => handleAction(selected.id, 'return')}>
                      Solicitar devolução
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

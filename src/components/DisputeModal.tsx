import { useState } from 'react';
import { AlertTriangle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const reasons = [
  'Item não corresponde à descrição',
  'Item com defeito / danificado',
  'Item falsificado / não autêntico',
  'Item não recebido',
  'Embalagem danificada',
  'Outro',
];

interface DisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSubmit?: (data: { reason: string; description: string }) => void;
}

export default function DisputeModal({ open, onOpenChange, orderId, onSubmit }: DisputeModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!reason || !description) return;
    onSubmit?.({ reason, description });
    setSubmitted(true);
    setTimeout(() => {
      onOpenChange(false);
      setSubmitted(false);
      setReason('');
      setDescription('');
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" />
            Abrir Disputa
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderId}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="font-heading text-lg font-bold text-primary uppercase">Disputa registrada!</p>
            <p className="text-sm text-muted-foreground mt-1">Nossa equipe analisará em até 48h.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Warning */}
            <div className="rounded-md bg-accent/5 border border-accent/20 p-3 text-xs text-accent">
              <AlertTriangle className="h-3.5 w-3.5 inline mr-1.5" />
              A abertura de disputa pausa a liberação do repasse ao vendedor.
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
                Motivo
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione um motivo</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Descreva o problema com detalhes..."
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Image upload placeholder */}
            <div>
              <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
                Evidências (fotos)
              </label>
              <div className="border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-primary/30 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Arraste fotos ou clique para enviar</p>
                <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG até 5MB cada</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost-light" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="accent" onClick={handleSubmit} disabled={!reason || !description}>
                Enviar Disputa
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

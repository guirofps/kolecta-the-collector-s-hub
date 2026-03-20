import { useState, useEffect } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const REPORT_REASONS = [
  'Produto falsificado ou réplica não declarada',
  'Descrição enganosa ou fotos falsas',
  'Preço abusivo ou golpe',
  'Produto proibido ou ilegal',
  'Vendedor suspeito ou fraudulento',
  'Anúncio duplicado',
  'Outro motivo',
] as const;

interface ReportListingDialogProps {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported: () => void;
}

export default function ReportListingDialog({
  listingId,
  listingTitle,
  sellerId,
  open,
  onOpenChange,
  onReported,
}: ReportListingDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isOther = reason === 'Outro motivo';
  const descriptionRequired = isOther && description.trim().length === 0;
  const canSubmit = reason && confirmed && !descriptionRequired;

  useEffect(() => {
    if (!open) {
      setReason('');
      setDescription('');
      setConfirmed(false);
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    /* API: POST /api/reports
       Body: {
         listingId: string,       (id do anúncio atual)
         reason: string,          (motivo selecionado)
         description: string,     (detalhes opcionais/obrigatórios)
         reportedSellerId: string (id do vendedor do anúncio)
       }
       Retorna: { success: boolean, reportId: string }

       Por ora simular resposta com setTimeout de 1500ms
       retornando sucesso para visualização do fluxo completo */
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const _body = { listingId, reason, description, reportedSellerId: sellerId };
      console.log('[mock] Report submitted:', _body);

      /* Persistir estado via localStorage com chave report_listingId
         para manter estado após reload até integração real com API */
      localStorage.setItem(`report_${listingId}`, 'true');

      onOpenChange(false);
      onReported();
      toast({
        title: 'Denúncia enviada',
        description: 'Nossa equipe irá analisar em até 48 horas.',
      });
    } catch {
      setError('Erro ao enviar denúncia. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase">Denunciar anúncio</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground truncate">
            {listingTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {/* Seção 1 — Motivo */}
          <div className="space-y-2">
            <Label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
              Motivo da denúncia
            </Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={`reason-${r}`} />
                  <Label htmlFor={`reason-${r}`} className="text-sm cursor-pointer font-normal">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Seção 2 — Descrição */}
          {reason && (
            <div className="space-y-2">
              <Label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                {isOther ? 'Descreva o problema' : 'Detalhes adicionais (opcional)'}
              </Label>
              <div className="relative">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Descreva o problema com mais detalhes..."
                  className="bg-input border-border text-foreground min-h-[100px] resize-none"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground tabular-nums">
                  {description.length}/500
                </span>
              </div>
            </div>
          )}

          {/* Seção 3 — Confirmação */}
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <Checkbox
                id="report-confirm"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(!!v)}
                className="mt-0.5"
              />
              <Label htmlFor="report-confirm" className="text-sm cursor-pointer font-normal leading-snug">
                Confirmo que esta denúncia é verdadeira e feita de boa-fé
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Denúncias falsas ou de má-fé podem resultar em suspensão da conta
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="kolecta"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar denúncia'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

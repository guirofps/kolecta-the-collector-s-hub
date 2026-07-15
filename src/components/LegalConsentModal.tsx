import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { recordConsent } from '@/lib/legal-consent';

/**
 * Modal de consentimento exigido antes do cadastro (T10).
 * Dois aceites separados (Termos da plataforma + LGPD); o botão "Aceitar" só
 * habilita com os dois marcados. "Cancelar" delega ao chamador (volta para a home).
 * Ver docs/PLAN-programa-fundadores.md.
 */
export default function LegalConsentModal({
  open,
  onAccept,
  onCancel,
}: {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const [terms, setTerms] = useState(false);
  const [lgpd, setLgpd] = useState(false);
  const bothChecked = terms && lgpd;

  const handleAccept = () => {
    if (!bothChecked) return;
    recordConsent();
    onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="sm:max-w-md"
        // Força uma escolha: não fecha ao clicar fora nem no ESC.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-heading uppercase italic">
            Antes de continuar
          </DialogTitle>
          <DialogDescription>
            Para criar sua conta na Kolecta, confirme os itens abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={terms}
              onCheckedChange={(v) => setTerms(v === true)}
              className="mt-0.5"
              aria-label="Aceito os Termos de Uso"
            />
            <span className="text-sm text-foreground">
              Li e aceito os{' '}
              <Link
                to="/termos"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                Termos de Uso
              </Link>{' '}
              da plataforma Kolecta.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={lgpd}
              onCheckedChange={(v) => setLgpd(v === true)}
              className="mt-0.5"
              aria-label="Concordo com o tratamento de dados conforme a LGPD"
            />
            <span className="text-sm text-foreground">
              Concordo com o tratamento dos meus dados conforme a{' '}
              <Link
                to="/privacidade"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                Política de Privacidade
              </Link>{' '}
              e a LGPD (Lei nº 13.709/2018).
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleAccept} disabled={!bothChecked}>
            Aceitar e continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

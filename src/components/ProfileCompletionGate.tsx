import { useState } from 'react';
import { Phone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/use-api';
import { CLERK_ENABLED } from '@/lib/clerk';
import { useToast } from '@/hooks/use-toast';

/** Só dígitos, no máximo 11 (DDD + celular). */
const apenasDigitos = (v: string) => v.replace(/\D/g, '').slice(0, 11);

/** (DD) 9XXXX-XXXX enquanto digita. Aceita fixo (10) e celular (11). */
function formatarTelefone(v: string): string {
  const d = apenasDigitos(v);
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, '($1');
  if (d.length <= 6) return d.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

/**
 * Captura obrigatória do telefone logo após o cadastro.
 *
 * O Clerk só coleta e-mail; o telefone é crucial para contato/suporte e para o
 * cadastro do contato na Pagar.me, mas hoje só era pedido lá no checkout. Este
 * gate bloqueia o uso do site enquanto o usuário logado não tiver telefone no
 * perfil. Não verifica por SMS (decisão de custo): apenas capta, validando o
 * formato. Verificação/2FA ficam para uma etapa futura de segurança.
 */
export default function ProfileCompletionGate() {
  const { data: profile } = useMyProfile();
  const { mutateAsync, isPending } = useUpdateMyProfile();
  const { toast } = useToast();
  const [valor, setValor] = useState('');

  // Sem Clerk (modo degradado) não há sessão para completar.
  if (!CLERK_ENABLED) return null;
  // Sem perfil carregado ainda, ou já com telefone: nada a fazer.
  if (!profile || (profile.phone ?? '').length >= 10) return null;

  const digitos = apenasDigitos(valor);
  const valido = digitos.length === 10 || digitos.length === 11;

  const salvar = async () => {
    if (!valido) return;
    try {
      await mutateAsync({ phone: digitos });
      // Sucesso: a invalidação do perfil recarrega com o telefone e fecha o gate.
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Não deu para salvar',
        description:
          e instanceof Error ? e.message : 'Confira o número e tente de novo.',
      });
    }
  };

  return (
    <AlertDialog open>
      <AlertDialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-md"
      >
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <AlertDialogTitle className="text-center font-heading uppercase">
            Complete seu cadastro
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Falta seu telefone. Usamos para falar sobre seus pedidos, dar suporte
            e proteger sua conta. Leva 10 segundos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void salvar();
          }}
          className="space-y-3 pt-1"
        >
          <div className="space-y-1.5">
            <Label htmlFor="phone-gate">Telefone com DDD</Label>
            <Input
              id="phone-gate"
              inputMode="tel"
              autoFocus
              placeholder="(11) 91234-5678"
              value={formatarTelefone(valor)}
              onChange={(e) => setValor(e.target.value)}
              aria-invalid={valor.length > 0 && !valido}
            />
            {valor.length > 0 && !valido && (
              <p className="text-xs text-destructive">
                Informe DDD + número (10 ou 11 dígitos).
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!valido || isPending}>
            {isPending ? 'Salvando...' : 'Salvar e continuar'}
          </Button>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

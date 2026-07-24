import { AlertTriangle } from 'lucide-react';

/**
 * Motivo da reprovação, para o vendedor.
 *
 * O backend grava `rejectionReason` quando o admin reprova, e o e-mail de
 * "precisa de ajuste" leva o texto. Mas o painel mostrava só o selo "Reprovado":
 * quem apagasse o e-mail, ou não o recebesse, ficava sem saber o que corrigir e
 * sem caminho a seguir.
 *
 * Fica em vermelho e no topo de propósito. É a única informação que destrava o
 * vendedor, então não pode estar escondida atrás de um clique.
 */
export default function RejectionNotice({
  motivo,
  className = '',
  compacto = false,
}: {
  motivo: string | null | undefined;
  className?: string;
  compacto?: boolean;
}) {
  const texto = (motivo ?? '').trim();

  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 ${
        compacto ? 'p-2.5' : 'p-3'
      } ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className={`font-medium text-destructive ${compacto ? 'text-xs' : 'text-sm'}`}>
          {texto ? 'Motivo da reprovação' : 'Anúncio reprovado'}
        </p>
        <p className={`mt-0.5 text-muted-foreground ${compacto ? 'text-xs' : 'text-sm'} leading-relaxed`}>
          {texto || (
            // Anúncio reprovado antes do campo existir, ou motivo não preenchido.
            // Melhor assumir a falta do que deixar o vendedor achando que existe
            // um motivo escondido em algum lugar.
            'O motivo não foi registrado. Fale com a gente pelo suporte para entender o que ajustar.'
          )}
        </p>
      </div>
    </div>
  );
}

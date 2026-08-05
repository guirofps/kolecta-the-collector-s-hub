import { Moon, Sun } from 'lucide-react';
import { useTema } from '@/hooks/use-tema';
import { rotuloTema } from '@/lib/tema';
import { Button } from '@/components/ui/button';

/**
 * Alterna claro e escuro.
 *
 * Mostra o ícone do DESTINO, não do estado atual: no modo escuro aparece o sol,
 * porque é isso que o clique faz. Mostrar o estado atual é a confusão clássica
 * desse controle, e a pessoa clica sem saber para onde vai.
 */
export default function BotaoTema({ className }: { className?: string }) {
  const { efetivo, alternar } = useTema();
  const rotulo = rotuloTema(efetivo);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      className={className}
    >
      {efetivo === 'escuro'
        ? <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
        : <Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
    </Button>
  );
}

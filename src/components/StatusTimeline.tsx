import { CheckCircle2, Circle, CreditCard, Truck, Package, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OrderStep = 'pago' | 'enviado' | 'entregue' | 'verificacao' | 'concluido';

const steps: { key: OrderStep; label: string; icon: React.ElementType }[] = [
  { key: 'pago', label: 'Pago', icon: CreditCard },
  { key: 'enviado', label: 'Enviado', icon: Truck },
  { key: 'entregue', label: 'Entregue', icon: Package },
  { key: 'verificacao', label: 'Verificação 7 dias', icon: Clock },
  { key: 'concluido', label: 'Concluído', icon: ShieldCheck },
];

interface StatusTimelineProps {
  currentStep: OrderStep;
  daysLeft?: number;
  className?: string;
}

export default function StatusTimeline({ currentStep, daysLeft, className }: StatusTimelineProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className={cn('flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0', className)}>
      {steps.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = isComplete ? CheckCircle2 : step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1 w-full md:w-auto">
            <div className="flex md:flex-col items-center gap-3 md:gap-2 flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  isComplete && 'border-primary bg-primary/10',
                  isCurrent && 'border-accent bg-accent/10 animate-pulse',
                  !isComplete && !isCurrent && 'border-border bg-card'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    isComplete && 'text-primary',
                    isCurrent && 'text-accent',
                    !isComplete && !isCurrent && 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="md:text-center">
                <span
                  className={cn(
                    'text-xs font-heading uppercase tracking-wider',
                    isComplete && 'text-primary',
                    isCurrent && 'text-accent',
                    !isComplete && !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
                {isCurrent && step.key === 'verificacao' && daysLeft !== undefined && (
                  <div className="text-[10px] text-accent font-bold mt-0.5">
                    {daysLeft} dias restantes
                  </div>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'hidden md:block h-px flex-1 min-w-[20px]',
                  i < currentIndex ? 'bg-primary/50' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

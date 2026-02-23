import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  verified: boolean;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export default function VerificationBadge({ verified, size = 'sm', showLabel, className }: VerificationBadgeProps) {
  if (!verified) return null;

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <span className={cn('inline-flex items-center gap-1 text-primary', className)}>
      <ShieldCheck className={iconSize} />
      {showLabel && (
        <span className="text-[10px] font-heading uppercase tracking-widest">Verificado</span>
      )}
    </span>
  );
}

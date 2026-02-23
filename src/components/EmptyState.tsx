import { LucideIcon, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon = SearchX, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-16', className)}>
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="font-heading text-xl font-bold text-muted-foreground uppercase">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

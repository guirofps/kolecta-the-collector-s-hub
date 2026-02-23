import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'detail';
  count?: number;
  className?: string;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-secondary/50', className)} />;
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <SkeletonBlock className="aspect-square" />
      <div className="p-3 space-y-2">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-6 w-24 mt-2" />
        <SkeletonBlock className="h-8 w-full mt-2" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
      <SkeletonBlock className="w-16 h-16 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
      <SkeletonBlock className="h-8 w-20" />
    </div>
  );
}

export default function LoadingSkeleton({ variant = 'card', count = 4, className }: LoadingSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <ListSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

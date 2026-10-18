import { cn } from '@/lib/cn';

export function LoadingState({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="status" aria-live="polite" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-subtle)] motion-reduce:animate-none"
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

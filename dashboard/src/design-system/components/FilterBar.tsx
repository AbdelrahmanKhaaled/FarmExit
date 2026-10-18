import { cn } from '@/lib/cn';

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] p-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

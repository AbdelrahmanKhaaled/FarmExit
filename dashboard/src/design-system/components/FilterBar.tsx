import { cn } from '@/lib/cn';

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] p-4 shadow-[var(--admin-shadow-xs)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

import { cn } from '@/lib/cn';

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
      <table className={cn('w-full min-w-[32rem] border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('border-b border-[var(--admin-border-subtle)] px-4 py-3 text-[var(--admin-text-secondary)] last:border-0', className)}
      {...props}
    />
  );
}

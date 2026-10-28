import { cn } from '@/lib/cn';

export function DataTable({
  children,
  className,
  embedded,
}: {
  children: React.ReactNode;
  className?: string;
  /** Inside PaginatedTableShell — no outer card chrome */
  embedded?: boolean;
}) {
  const table = (
    <table className="admin-data-table w-full min-w-[48rem] border-collapse text-[var(--admin-text-base)]">{children}</table>
  );
  if (embedded) {
    return <div className={cn('overflow-x-auto', className)}>{table}</div>;
  }
  return (
    <div
      className={cn(
        'luxe-card overflow-hidden p-0',
        className,
      )}
    >
      <div className="overflow-x-auto">{table}</div>
    </div>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-sunken)] px-4 py-3 text-start text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--admin-text-muted)]',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn('border-b border-[var(--admin-border-subtle)] px-4 py-3.5 text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-surface-muted)]/80', className)}>
      {children}
    </td>
  );
}

export function TablePagination({
  page,
  pageSize,
  total,
  labels,
}: {
  page: number;
  pageSize: number;
  total: number;
  labels: { showing: string; prev: string; next: string; page: string };
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--admin-border-subtle)] px-4 py-3 text-xs text-[var(--admin-text-muted)] sm:flex-row sm:items-center sm:justify-between">
      <span>{labels.showing.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(total))}</span>
      <span>{labels.page.replace('{page}', String(page)).replace('{pages}', String(pages))}</span>
    </div>
  );
}

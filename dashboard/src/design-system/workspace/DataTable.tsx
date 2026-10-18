import { cn } from '@/lib/cn';

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]', className)}>
      <table className="w-full min-w-[48rem] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] px-4 py-2.5 text-start text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]',
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
    <td colSpan={colSpan} className={cn('border-b border-[var(--admin-border-subtle)] px-4 py-3 text-[var(--admin-text-secondary)]', className)}>
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

import { Link } from '@/i18n/navigation';

export function TablePaginationLinks({
  page,
  pageSize,
  total,
  labels,
  query,
  pathname,
}: {
  page: number;
  pageSize: number;
  total: number;
  labels: { showing: string; prev: string; next: string; page: string };
  query: Record<string, string | undefined>;
  pathname: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
    if (p > 1) qs.set('page', String(p));
    else qs.delete('page');
    const s = qs.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--admin-border-subtle)] px-4 py-3 text-xs text-[var(--admin-text-muted)] sm:flex-row sm:items-center sm:justify-between">
      <span>{labels.showing.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(total))}</span>
      <div className="flex flex-wrap items-center gap-3">
        <span>{labels.page.replace('{page}', String(page)).replace('{pages}', String(pages))}</span>
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="rounded border border-[var(--admin-border-subtle)] px-2 py-1 hover:border-[var(--admin-brand-primary)]">
            {labels.prev}
          </Link>
        ) : (
          <span className="rounded border border-transparent px-2 py-1 opacity-40">{labels.prev}</span>
        )}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className="rounded border border-[var(--admin-border-subtle)] px-2 py-1 hover:border-[var(--admin-brand-primary)]">
            {labels.next}
          </Link>
        ) : (
          <span className="rounded border border-transparent px-2 py-1 opacity-40">{labels.next}</span>
        )}
      </div>
    </div>
  );
}

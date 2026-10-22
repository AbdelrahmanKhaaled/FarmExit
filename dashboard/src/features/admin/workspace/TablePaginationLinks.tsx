import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { paginationRange } from './pagination-range';

export async function TablePaginationLinks({
  page,
  pageSize,
  total,
  query,
  pathname,
}: {
  page: number;
  pageSize: number;
  total: number;
  query: Record<string, string | undefined>;
  pathname: string;
}) {
  const t = await getTranslations('admin.pagination');
  const { from, to, pages, page: currentPage } = paginationRange(page, pageSize, total);

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

  const navBtn =
    'inline-flex min-h-8 items-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] px-3 py-1 text-xs font-semibold text-[var(--admin-text-secondary)] transition-colors hover:border-[var(--admin-brand-secondary)] hover:text-[var(--admin-brand-primary)]';

  return (
    <div
      className="flex flex-col gap-3 rounded-b-[var(--admin-radius-lg)] border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]/50 px-4 py-3 text-xs text-[var(--admin-text-muted)] sm:flex-row sm:items-center sm:justify-between"
      data-testid="table-pagination"
    >
      <span className="font-medium text-[var(--admin-text-secondary)]">
        {total === 0 ? t('showingEmpty') : t('showing', { from, to, total })}
      </span>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-[var(--admin-text-muted)]">{t('page', { page: currentPage, pages })}</span>
        {currentPage > 1 ? (
          <Link href={hrefFor(currentPage - 1)} className={navBtn}>
            {t('prev')}
          </Link>
        ) : (
          <span className={cn(navBtn, 'pointer-events-none opacity-40')}>{t('prev')}</span>
        )}
        {currentPage < pages ? (
          <Link href={hrefFor(currentPage + 1)} className={navBtn}>
            {t('next')}
          </Link>
        ) : (
          <span className={cn(navBtn, 'pointer-events-none opacity-40')}>{t('next')}</span>
        )}
      </div>
    </div>
  );
}

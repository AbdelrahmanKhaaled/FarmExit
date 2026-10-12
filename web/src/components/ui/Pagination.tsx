'use client';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Marketplace Filters → Pagination + Page Item (Current · Default). 44px items, r12,
 * gap 8. Current = brand/primary with white Label/Button; Default = white, border/default, text/secondary.
 * Previous/Next at 40% when unavailable (Source of Truth 4p sample state: Previous (disabled) · 1 · Next (disabled)).
 * Arrows mirror in RTL.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  label,
  previousLabel,
  nextLabel,
  pageLabel,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
  previousLabel: string;
  nextLabel: string;
  pageLabel: (page: number) => string;
  className?: string;
}) {
  const item =
    'flex size-44 items-center justify-center rounded-lg border type-label-button transition-colors duration-150';
  const arrow = cn(
    item,
    'border-border-default bg-bg-surface text-text-primary hover:border-brand-primary disabled:opacity-40',
  );

  return (
    <nav aria-label={label} className={cn('flex items-center gap-8', className)}>
      <button
        type="button"
        className={arrow}
        aria-label={previousLabel}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <Icon name="arrow-left" size={18} />
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          aria-label={pageLabel(p)}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPageChange(p)}
          className={cn(
            item,
            p === page
              ? 'border-brand-primary bg-brand-primary text-text-on-dark'
              : 'border-border-default bg-bg-surface text-text-secondary hover:border-brand-primary',
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className={arrow}
        aria-label={nextLabel}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <Icon name="arrow-right" size={18} />
      </button>
    </nav>
  );
}

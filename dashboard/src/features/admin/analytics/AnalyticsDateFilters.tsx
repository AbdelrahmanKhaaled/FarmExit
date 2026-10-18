'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { AnalyticsRangePreset } from './analytics-query';

const PRESETS: AnalyticsRangePreset[] = ['7d', '30d', '90d', '12m', 'all'];

export function AnalyticsDateFilters({
  activeRange,
  customFrom,
  customTo,
}: {
  activeRange: AnalyticsRangePreset;
  customFrom?: string;
  customTo?: string;
}) {
  const t = useTranslations('admin.analytics');
  const usingCustom = Boolean(customFrom && customTo);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((r) => (
          <Link
            key={r}
            href={`/admin/analytics?range=${r}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${!usingCustom && activeRange === r ? 'bg-[var(--admin-brand-primary)] text-white' : 'border border-[var(--admin-border-subtle)] bg-white'}`}
          >
            {t(`ranges.${r}`)}
          </Link>
        ))}
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1 text-xs text-[var(--admin-text-muted)]">
          {t('customFrom')}
          <input type="date" name="from" defaultValue={customFrom ?? ''} className="rounded border px-2 py-1" required />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--admin-text-muted)]">
          {t('customTo')}
          <input type="date" name="to" defaultValue={customTo ?? ''} className="rounded border px-2 py-1" required />
        </label>
        <button type="submit" className="rounded bg-[var(--admin-brand-primary)] px-3 py-1.5 text-xs font-semibold text-white">
          {t('applyCustom')}
        </button>
      </form>
    </div>
  );
}

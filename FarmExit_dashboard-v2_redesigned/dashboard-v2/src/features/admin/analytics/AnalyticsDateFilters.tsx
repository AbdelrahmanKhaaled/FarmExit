'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
  const b = useTranslations('batch');
  const [custom, setCustom] = useState(usingCustom);
  const [from, setFrom] = useState(customFrom ?? '');
  const [to, setTo] = useState(customTo ?? '');
  const [invalid, setInvalid] = useState(false);

  return (
    <div className="analytics-filters mb-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((r) => (
          <Link
            key={r}
            href={`/admin/analytics?range=${r}`}
            aria-current={!usingCustom && activeRange === r ? 'date' : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${!usingCustom && activeRange === r ? 'bg-[var(--admin-brand-primary)] text-white' : 'border border-[var(--admin-border-subtle)] bg-white'}`}
          >
            {t(`ranges.${r}`)}
          </Link>
        ))}
        <button type="button" className="admin-btn-secondary" aria-expanded={custom} onClick={() => setCustom(!custom)}>
          {b('custom')}
        </button>
      </div>
      {custom && (
        <form
          method="get"
          className="flex flex-wrap items-end gap-3 text-sm"
          onSubmit={(e) => {
            if (!from || !to || from > to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) {
              e.preventDefault();
              setInvalid(true);
            }
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-[var(--admin-text-muted)]">
            {t('customFrom')}
            <input
              type="date"
              name="from"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setInvalid(false);
              }}
              max={to || undefined}
              className="admin-form-control"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--admin-text-muted)]">
            {t('customTo')}
            <input
              type="date"
              name="to"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setInvalid(false);
              }}
              min={from || undefined}
              className="admin-form-control"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded bg-[var(--admin-brand-primary)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t('applyCustom')}
          </button>
        </form>
      )}
      {invalid && (
        <p role="alert" className="text-sm text-red-700">
          {b('invalidRange')}
        </p>
      )}
    </div>
  );
}

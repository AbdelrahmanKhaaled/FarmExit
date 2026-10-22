'use client';

import { useTranslations } from 'next-intl';

export type SeriesPoint = { date: string; count: number };

export function TimeSeriesChart({
  series,
  granularity,
  emptyLabel,
}: {
  series: SeriesPoint[];
  granularity: string;
  emptyLabel: string;
}) {
  const t = useTranslations('admin.analytics');
  const max = Math.max(1, ...series.map((p) => p.count));
  const total = series.reduce((s, p) => s + p.count, 0);

  if (series.length === 0 || total === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">{emptyLabel}</p>;
  }

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--admin-text-muted)]">
        {t('granularityLabel', { granularity })} · {t('seriesTotal', { total })}
      </p>
      <div className="mb-1 flex justify-between text-[0.65rem] tabular-nums text-[var(--admin-text-muted)]">
        <span>0</span>
        <span>{max}</span>
      </div>
      <div
        className="flex h-44 items-end gap-1 border-b border-[var(--admin-border-subtle)] bg-[linear-gradient(to_top,var(--admin-bg-subtle)_1px,transparent_1px)] bg-size-[100%_25%]"
        role="img"
        aria-label={t('chartSummary', { total, points: series.length })}
      >
        {series.map((p) => (
          <div
            key={p.date}
            className="min-w-0 flex-1 rounded-t bg-[var(--admin-chart-1)] transition-[height]"
            style={{ height: `${(p.count / max) * 100}%`, opacity: p.count === 0 ? 0.15 : 1 }}
            title={`${p.date}: ${p.count}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.65rem] text-[var(--admin-text-muted)] tabular-nums">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}

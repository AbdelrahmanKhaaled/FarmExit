'use client';
import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
export type SeriesPoint = { date: string; count: number };
/** Linear SVG paths preserve actual bucket values; no interpolated trends. */
export function TimeSeriesChart({
  series,
  granularity,
  emptyLabel,
  variant = 'area',
  secondary,
  color = '#21855c',
}: {
  series: SeriesPoint[];
  granularity: string;
  emptyLabel: string;
  variant?: 'area' | 'columns' | 'stacked';
  secondary?: SeriesPoint[];
  color?: string;
}) {
  const b = useTranslations('batch');
  const t = useTranslations('admin.analytics'),
    locale = useLocale(),
    id = useId().replace(/:/g, '');
  const [active, setActive] = useState<number | null>(null);
  const f = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const date = (s: string) =>
    new Intl.DateTimeFormat(locale, {
      month: 'short',
      ...(s.length === 7 ? { year: 'numeric' as const } : { day: 'numeric' as const }),
      timeZone: 'UTC',
    }).format(new Date(`${s.length === 7 ? `${s}-01` : s.slice(0, 10)}T00:00:00Z`));
  const extra = new Map(secondary?.map((p) => [p.date, p.count]));
  const total = series.reduce((s, p) => s + p.count + (extra.get(p.date) ?? 0), 0);
  const max = Math.max(1, ...series.map((p) => p.count + (extra.get(p.date) ?? 0))),
    ceiling = Math.max(1, Math.ceil(max / 4) * 4);
  const x = (i: number) => 46 + ((i + 0.5) / series.length) * 600,
    y = (v: number) => 218 - (v / ceiling) * 180;
  const points = series.map((p, i) => `${x(i)},${y(p.count)}`).join(' '),
    selected = active === null ? null : series[active];
  if (!series.length || !total)
    return (
      <div className="analytics-empty">
        <span aria-hidden="true">◇</span>
        <p>{emptyLabel}</p>
      </div>
    );
  return (
    <div className="analytics-series">
      <div className="analytics-series__meta">
        <span>{t('granularityLabel', { granularity: b.has(granularity) ? b(granularity) : granularity })} · UTC</span>
        <strong>{t('seriesTotal', { total })}</strong>
      </div>
      {secondary && (
        <div className="analytics-legend">
          <span>
            <i style={{ background: color }} />
            {t('sale')}
          </span>
          <span>
            <i style={{ background: '#d6ae61' }} />
            {t('rent')}
          </span>
        </div>
      )}
      <svg
        viewBox="0 0 670 260"
        className="analytics-svg"
        role="img"
        aria-label={t('chartSummary', { total, points: series.length })}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".22" />
            <stop offset="100%" stopColor={color} stopOpacity=".015" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="46"
              x2="646"
              y1={y((ceiling * i) / 4)}
              y2={y((ceiling * i) / 4)}
              stroke="#e5eee9"
              strokeDasharray="3 5"
            />
            <text x="36" y={y((ceiling * i) / 4) + 4} textAnchor="end" className="analytics-axis">
              {f.format((ceiling * i) / 4)}
            </text>
          </g>
        ))}
        {variant === 'area' ? (
          <>
            <polygon points={`${x(0)},218 ${points} ${x(series.length - 1)},218`} fill={`url(#${id})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
          </>
        ) : (
          series.map((p, i) => {
            const n = extra.get(p.date) ?? 0,
              w = Math.max(0.5, Math.min(24, (600 / series.length) * 0.65));
            return (
              <g key={p.date}>
                <rect
                  x={x(i) - w / 2}
                  y={y(p.count)}
                  width={w}
                  height={218 - y(p.count)}
                  rx={Math.min(4, w / 3)}
                  fill={color}
                />
                <rect
                  x={x(i) - w / 2}
                  y={y(p.count + n)}
                  width={w}
                  height={(n / ceiling) * 180}
                  rx={Math.min(4, w / 3)}
                  fill="#d6ae61"
                />
              </g>
            );
          })
        )}
        {series.map((p, i) => (
          <rect
            key={p.date}
            x={46 + (i / series.length) * 600}
            y="30"
            width={600 / series.length}
            height="190"
            fill="transparent"
            tabIndex={0}
            aria-label={`${date(p.date)}: ${p.count}${secondary ? ` + ${extra.get(p.date) ?? 0}` : ''}`}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onPointerEnter={() => setActive(i)}
          />
        ))}
        {[
          ...new Set([
            0,
            Math.floor((series.length - 1) / 3),
            Math.floor((2 * (series.length - 1)) / 3),
            series.length - 1,
          ]),
        ].map((i) => (
          <text key={i} x={x(i)} y="245" textAnchor="middle" className="analytics-axis">
            {date(series[i]!.date)}
          </text>
        ))}
        {selected && active !== null && (
          <>
            <line x1={x(active)} x2={x(active)} y1="30" y2="218" stroke={color} strokeDasharray="3 3" />
            <circle cx={x(active)} cy={y(selected.count)} r="4" fill={color} stroke="white" strokeWidth="2" />
          </>
        )}
      </svg>
      <div className="analytics-tooltip" aria-live="polite">
        {selected ? (
          <>
            <strong>{date(selected.date)}</strong>
            <span>
              {secondary
                ? `${t('sale')}: ${selected.count} · ${t('rent')}: ${extra.get(selected.date) ?? 0}`
                : f.format(selected.count)}
            </span>
          </>
        ) : (
          <span>{b('hoverHint')}</span>
        )}
      </div>
    </div>
  );
}

'use client';

type Row = { key: string; label: string; value: number };

export function DistributionBars({ rows, color = 'var(--admin-chart-2)' }: { rows: Row[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="text-sm">
          <div className="mb-1 flex justify-between gap-2 text-[var(--admin-text-muted)]">
            <span className="line-clamp-1">{row.label}</span>
            <span className="font-semibold tabular-nums text-[var(--admin-text-primary)]">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-bg-subtle)]">
            <div className="h-full rounded-full" style={{ width: `${Math.round((row.value / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

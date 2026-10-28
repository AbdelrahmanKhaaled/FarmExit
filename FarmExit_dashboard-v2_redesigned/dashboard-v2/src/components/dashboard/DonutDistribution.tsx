import { cn } from '@/lib/cn';

export function DonutDistribution({
  title,
  description,
  segments,
  centerLabel,
  centerValue,
  className,
}: {
  title: string;
  description?: string;
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let cursor = 0;
  const stops =
    total > 0
      ? segments
          .map((seg) => {
            const start = cursor;
            const pct = (seg.value / total) * 100;
            cursor += pct;
            return `${seg.color} ${start}% ${cursor}%`;
          })
          .join(', ')
      : 'var(--admin-border-subtle) 0% 100%';

  return (
    <div className={cn('luxe-card luxe-card--padded', className)}>
      <h3 className="luxe-card-header__title">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{description}</p> : null}
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div
          className="relative size-36 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
          role="img"
          aria-label={title}
        >
          <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-[var(--admin-surface)] text-center">
            <span className="text-[0.65rem] font-medium uppercase tracking-wider text-[var(--admin-text-muted)]">{centerLabel}</span>
            <span className="text-xl font-semibold tabular-nums text-[var(--admin-text-primary)]">{centerValue}</span>
          </div>
        </div>
        <ul className="w-full flex-1 space-y-2.5 text-sm">
          {segments.map((seg) => (
            <li key={seg.label} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-[var(--admin-text-secondary)]">
                <span className="size-2 shrink-0 rounded-full" style={{ background: seg.color }} aria-hidden />
                <span className="truncate">{seg.label}</span>
              </span>
              <span className="font-semibold tabular-nums text-[var(--admin-text-primary)]">{seg.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import { cn } from '@/lib/cn';

const accents = ['var(--admin-chart-1)', 'var(--admin-chart-2)', 'var(--admin-chart-3)', 'var(--admin-chart-4)'] as const;

export function KpiStrip({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => (
        <article
          key={item.label}
          className="relative overflow-hidden rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow-soft)]"
        >
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: accents[i % accents.length] }}
            aria-hidden
          />
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--admin-text-muted)]">{item.label}</p>
          <p className="mt-2 text-[var(--admin-text-3xl)] font-semibold tabular-nums tracking-tight text-[var(--admin-text-primary)]">{item.value}</p>
          {item.hint && <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{item.hint}</p>}
        </article>
      ))}
    </div>
  );
}

export function Panel({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-xs)]', className)}>
      <header className="border-b border-[var(--admin-border-subtle)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{description}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

import { cn } from '@/lib/cn';

type Variant = 'featured' | 'standard' | 'compact';

const shells: Record<Variant, string> = {
  featured:
    'bg-[var(--admin-surface)] border border-[color-mix(in_srgb,var(--admin-brand-primary)_18%,var(--admin-border-subtle))] shadow-[var(--admin-shadow-soft)]',
  standard: 'bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)]',
  compact: 'bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)]',
};

export function MetricCard({
  label,
  value,
  sublabel,
  variant = 'standard',
  tone = 'green',
  emphasis,
  delayMs = 0,
}: {
  label: string;
  value: string;
  sublabel?: string;
  variant?: Variant;
  tone?: 'green' | 'gold';
  emphasis?: 'priority';
  delayMs?: number;
}) {
  return (
    <article
      className={cn(
        'relative rounded-[var(--admin-radius-lg)] p-4 transition-[transform,box-shadow] duration-200 admin-stagger',
        'hover:shadow-[var(--admin-shadow-soft)] motion-reduce:transition-none',
        shells[variant],
        variant === 'featured' && 'p-5 md:p-6',
        emphasis === 'priority' &&
          'ring-1 ring-[color-mix(in_srgb,var(--admin-brand-gold)_40%,transparent)]',
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className={cn(
          'mb-3 h-0.5 w-8 rounded-full',
          tone === 'gold' ? 'bg-[var(--admin-brand-gold)]' : 'bg-[var(--admin-brand-secondary)]',
        )}
        aria-hidden
      />
      <p className="text-[var(--admin-text-xs)] font-medium uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 font-semibold tabular-nums tracking-tight text-[var(--admin-text-primary)]',
          variant === 'featured' ? 'text-3xl md:text-4xl' : variant === 'compact' ? 'text-xl' : 'text-2xl',
        )}
      >
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{sublabel}</p>}
    </article>
  );
}

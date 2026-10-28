import { cn } from '@/lib/cn';

type Variant = 'default' | 'gold' | 'warning' | 'muted' | 'outline';

const variants: Record<Variant, string> = {
  default: 'bg-[color-mix(in_srgb,var(--admin-brand-primary)_12%,white)] text-[var(--admin-brand-primary)]',
  gold: 'bg-[color-mix(in_srgb,var(--admin-brand-gold)_18%,white)] text-[#8a6b12]',
  warning: 'bg-[var(--admin-status-warning-bg)] text-[var(--admin-status-warning)]',
  muted: 'bg-[var(--admin-bg-subtle)] text-[var(--admin-text-muted)]',
  outline: 'border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)]',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

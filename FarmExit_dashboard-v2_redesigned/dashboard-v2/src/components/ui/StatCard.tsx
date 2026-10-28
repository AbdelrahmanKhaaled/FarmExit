import { cn } from '@/lib/cn';
import { Card } from './Card';

export function StatCard({
  label,
  value,
  hint,
  accent = 'green',
  delayMs = 0,
  priority,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'green' | 'gold';
  delayMs?: number;
  priority?: 'high';
}) {
  return (
    <Card
      as="article"
      variant="elevated"
      className={cn(
        'relative overflow-hidden p-5 admin-stagger transition-transform hover:-translate-y-0.5',
        priority === 'high' && 'ring-1 ring-[color-mix(in_srgb,var(--admin-brand-gold)_35%,transparent)]',
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className={cn(
          'absolute inset-y-3 w-1 rounded-full start-0',
          accent === 'gold' ? 'bg-[var(--admin-brand-gold)]' : 'bg-[var(--admin-brand-secondary)]',
        )}
      />
      <div className="ps-3">
        <p className="text-[var(--admin-text-sm)] text-[var(--admin-text-muted)]">{label}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[var(--admin-text-primary)]">{value}</p>
        {hint && <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{hint}</p>}
      </div>
      <div
        className="pointer-events-none absolute -end-8 -top-8 size-24 rounded-full opacity-[0.07]"
        style={{
          background: accent === 'gold' ? 'var(--admin-brand-gold)' : 'var(--admin-brand-primary)',
        }}
        aria-hidden
      />
    </Card>
  );
}

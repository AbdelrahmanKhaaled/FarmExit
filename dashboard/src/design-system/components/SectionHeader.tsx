import { cn } from '@/lib/cn';
import { Badge } from './Badge';

export function SectionHeader({
  title,
  description,
  badge,
  action,
  className,
}: {
  title: string;
  description?: string;
  badge?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-[var(--admin-space-5)] flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[var(--admin-text-sm)] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">
            {title}
          </h2>
          {badge && <Badge variant="gold">{badge}</Badge>}
        </div>
        {description && <p className="mt-1 max-w-2xl text-[var(--admin-text-sm)] text-[var(--admin-text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

import { cn } from '@/lib/cn';
import { Card } from './Card';

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <Card variant="muted" className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div
        className="mb-4 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--admin-brand-primary)_10%,white)] text-[var(--admin-brand-primary)]"
        aria-hidden
      >
        ◌
      </div>
      <p className="font-medium text-[var(--admin-text-primary)]">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-[var(--admin-text-muted)]">{description}</p>}
    </Card>
  );
}

import { cn } from '@/lib/cn';
import { Card } from './Card';
import { EmptyState } from './EmptyState';

export function ChartShell({
  title,
  description,
  children,
  emptyTitle,
  emptyDescription,
  isEmpty,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  isEmpty?: boolean;
  className?: string;
}) {
  return (
    <Card variant="elevated" className={cn('p-5', className)}>
      <h3 className="text-[var(--admin-text-base)] font-semibold text-[var(--admin-text-primary)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>}
      <div className="mt-5">
        {isEmpty && emptyTitle ? (
          <EmptyState title={emptyTitle} description={emptyDescription} className="py-8" />
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

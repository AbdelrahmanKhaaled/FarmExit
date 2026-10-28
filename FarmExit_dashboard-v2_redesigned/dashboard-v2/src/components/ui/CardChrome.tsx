import { cn } from '@/lib/cn';

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-[var(--admin-border-subtle)] px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[var(--admin-text-base)] font-semibold tracking-tight text-[var(--admin-text-primary)]">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-[var(--admin-text-muted)]">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

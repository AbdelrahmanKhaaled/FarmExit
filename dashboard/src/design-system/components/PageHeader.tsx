import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  subtitle,
  meta,
  className,
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-3 border-b border-[var(--admin-border-subtle)] pb-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--admin-text-primary)] md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--admin-text-muted)]">{subtitle}</p>}
      </div>
      {meta && <div className="shrink-0 text-sm text-[var(--admin-text-muted)]">{meta}</div>}
    </header>
  );
}

import { cn } from '@/lib/cn';

export function AdminDetailSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('admin-detail-panel', className)}>
      {title ? <h2 className="mb-3 text-sm font-semibold tracking-tight text-[var(--admin-text-primary)]">{title}</h2> : null}
      {children}
    </section>
  );
}

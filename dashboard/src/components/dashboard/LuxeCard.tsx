import { cn } from '@/lib/cn';

export function LuxeCard({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn('luxe-card', padding && 'luxe-card--padded', className)}>{children}</div>
  );
}

export function LuxeCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="luxe-card-header">
      <div className="min-w-0">
        <h2 className="luxe-card-header__title">{title}</h2>
        {description ? <p className="luxe-card-header__desc">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

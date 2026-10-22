import { cn } from '@/lib/cn';

export function DetailWorkspace({
  main,
  aside,
  className,
}: {
  main: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,22rem)]', className)}>
      <div className="min-w-0 space-y-6">{main}</div>
      {aside ? <aside className="min-w-0 space-y-4 lg:sticky lg:top-[calc(var(--admin-topbar-height)+1rem)] lg:self-start">{aside}</aside> : null}
    </div>
  );
}

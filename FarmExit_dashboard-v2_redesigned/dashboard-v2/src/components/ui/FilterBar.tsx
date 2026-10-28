import { cn } from '@/lib/cn';

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'luxe-card flex flex-wrap items-end gap-3 p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

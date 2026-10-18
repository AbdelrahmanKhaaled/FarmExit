import { cn } from '@/lib/cn';

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-[var(--admin-radius-md)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]',
        'px-3 py-2 text-sm text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)]',
        'placeholder:text-[var(--admin-text-muted)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--admin-focus-ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

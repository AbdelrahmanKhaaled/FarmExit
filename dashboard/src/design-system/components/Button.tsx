import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--admin-brand-primary)] text-white hover:bg-[var(--admin-brand-secondary)] shadow-[var(--admin-shadow-xs)]',
  secondary:
    'border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text-primary)] hover:border-[var(--admin-brand-secondary)] hover:text-[var(--admin-brand-primary)]',
  ghost: 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)]',
  danger: 'bg-[var(--admin-status-danger)] text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[var(--admin-text-sm)]',
  md: 'px-4 py-2.5 text-[var(--admin-text-sm)]',
};

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--admin-radius-md)] font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-focus-ring)]',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

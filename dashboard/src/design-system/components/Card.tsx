import { cn } from '@/lib/cn';

type Variant = 'default' | 'elevated' | 'muted' | 'outline';

const variants: Record<Variant, string> = {
  default: 'bg-[var(--admin-surface)] shadow-[var(--admin-shadow-soft)] border border-[var(--admin-border-subtle)]',
  elevated: 'bg-[var(--admin-surface-elevated)] shadow-[var(--admin-shadow-card)] border border-[var(--admin-border-subtle)]',
  muted: 'bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)]',
  outline: 'bg-transparent border border-[var(--admin-border-strong)]',
};

type CardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
  as?: 'div' | 'article' | 'section';
} & Omit<React.HTMLAttributes<HTMLElement>, 'className'>;

export function Card({ children, className, variant = 'default', as = 'div', ...rest }: CardProps) {
  const Tag = as;
  return (
    <Tag className={cn('rounded-[var(--admin-radius-lg)]', variants[variant], className)} {...rest}>
      {children}
    </Tag>
  );
}

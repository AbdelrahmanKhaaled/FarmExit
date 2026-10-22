import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export function EntityLink({
  href,
  label,
  mono = true,
  className,
}: {
  href: string;
  label: string;
  mono?: boolean;
  className?: string;
}) {
  const display = label.length > 22 ? `${label.slice(0, 14)}…${label.slice(-6)}` : label;
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        'font-medium text-[var(--admin-brand-primary)] hover:underline',
        mono && 'font-mono text-xs tracking-tight',
        className,
      )}
    >
      {display}
    </Link>
  );
}

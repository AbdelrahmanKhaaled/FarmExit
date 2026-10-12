import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Tabs & Chips → Filter Chip (Active · Default · Applied).
 * Active/Default are toggle tabs with an optional live count; Applied is a removable applied filter.
 */
type FilterChipProps = Omit<ComponentProps<'button'>, 'children'> & {
  children: ReactNode;
  /** Live count shown at 60% opacity (hidden where Source of Truth 4p removed counts). */
  count?: number | string;
  active?: boolean;
};

export function FilterChip({ children, count, active = false, className, type = 'button', ...rest }: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        'inline-flex h-40 shrink-0 items-center gap-4 rounded-md px-18 transition-colors duration-150',
        active
          ? 'bg-brand-primary text-text-on-dark'
          : 'text-text-secondary hover:bg-bg-hover active:bg-bg-success-soft',
        className,
      )}
      {...rest}
    >
      <span className="type-label-button">{children}</span>
      {count !== undefined && <span className="type-label-small-strong opacity-60">{count}</span>}
    </button>
  );
}

/** Applied filter: soft green, selected border, trailing close. `removeLabel` is the accessible name. */
export function AppliedChip({
  children,
  removeLabel,
  className,
  type = 'button',
  ...rest
}: Omit<ComponentProps<'button'>, 'children'> & { children: ReactNode; removeLabel: string }) {
  return (
    <button
      type={type}
      aria-label={removeLabel}
      className={cn(
        'inline-flex h-40 shrink-0 items-center gap-4 rounded-md border border-border-selected bg-bg-selected px-18',
        'text-text-brand transition-colors duration-150 hover:bg-bg-hover',
        className,
      )}
      {...rest}
    >
      <span className="type-label-button">{children}</span>
      <Icon name="close" size={16} />
    </button>
  );
}

/*
 * Figma: Components → Group / My FarmExit → Capability Chip (Active · Add).
 */
export function CapabilityChip({
  variant,
  icon,
  children,
  className,
}: {
  variant: 'active' | 'add';
  icon: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-6 rounded-full py-6 ps-10 pe-12 type-label-tag-strong',
        variant === 'active'
          ? 'bg-bg-success-soft text-text-brand'
          : 'border border-dashed border-border-strong text-text-muted',
        className,
      )}
    >
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}

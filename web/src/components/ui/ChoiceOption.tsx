import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Marketplace Filters → Filter Option (Control = Checkbox · Radio × State = Selected ·
 * Default). 44px row (touch target), 20px control, gap 12, Label/List (text/primary selected, text/secondary default).
 * Checkbox: r8, border/strong 1.5 → brand/primary fill with a white tick. Radio: circle, brand/primary ring + 10px dot.
 * A real <input> drives it, so keyboard, forms and screen readers work natively.
 */
type ChoiceProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  type: 'checkbox' | 'radio';
  children: ReactNode;
};

export function ChoiceOption({ type, children, className, checked, ...input }: ChoiceProps) {
  return (
    <label className={cn('group flex min-h-44 cursor-pointer items-center gap-12', className)}>
      <input type={type} checked={checked} className="peer sr-only" {...input} />
      <span
        aria-hidden="true"
        className={cn(
          'flex size-20 shrink-0 items-center justify-center border-[1.5px] bg-bg-surface transition-colors duration-150',
          'border-border-strong group-hover:border-brand-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          'peer-focus-visible:outline-border-focus',
          type === 'checkbox'
            ? 'rounded-sm peer-checked:border-brand-primary peer-checked:bg-brand-primary peer-checked:text-text-on-dark'
            : 'rounded-full peer-checked:border-brand-primary',
        )}
      >
        {type === 'checkbox' ? (
          <Icon name="tick" size={16} className={checked ? 'block' : 'hidden'} />
        ) : (
          <span className={cn('size-10 rounded-full bg-brand-primary', checked ? 'block' : 'hidden')} />
        )}
      </span>
      <span className={cn('min-w-0 grow type-label-list', checked ? 'text-text-primary' : 'text-text-secondary')}>
        {children}
      </span>
    </label>
  );
}

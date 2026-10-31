'use client';

import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Search Bar → Search Bar (Layout = Row · Grid · Stacked), shared by the homepage hero
 * and the Marketplace header. Search Tabs (glass inactive, white active, square bottom corners join the panel) over
 * a light-glass panel (overlay/glass-light, Glass/Hero Panel, r20 with a square top-start corner). Search Fields are
 * native selects; the Search Button is brand/accent. One row on desktop, 2 × 2 with a full-width button on tablet,
 * stacked on mobile.
 */
export function SearchTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('gap-4', options.length === 4 ? 'grid grid-cols-4 tablet:flex' : 'flex')}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'min-w-0 h-50 rounded-t-xl px-8 tablet:px-18 type-label-medium effect-hero-glass transition-colors duration-150 tablet:px-24',
            value === option.value
              ? 'bg-bg-surface text-text-brand'
              : 'bg-overlay-glass-strong text-text-on-dark hover:bg-overlay-glass-border',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SearchPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-8 rounded-3xl rounded-ss-none border border-overlay-glass-light-border bg-overlay-glass-light p-12',
        'effect-hero-panel tablet:grid-cols-2 desktop:flex',
      )}
    >
      {children}
    </div>
  );
}

export function SearchField({
  label,
  children,
  ...select
}: { label: string; children: ReactNode } & Omit<ComponentProps<'select'>, 'children' | 'className'>) {
  return (
    <label
      className={cn(
        'flex min-w-0 cursor-pointer flex-col gap-6 rounded-xl bg-bg-surface px-18 py-14 transition-shadow duration-150 desktop:flex-1',
        // Search Field / Focus: border/focus 1.5 + a 4px lime ring at 18%.
        'focus-within:shadow-[inset_0_0_0_1.5px_var(--color-border-focus),0_0_0_4px_color-mix(in_srgb,var(--color-brand-accent)_18%,transparent)]',
      )}
    >
      <span className="type-overline-field text-text-muted">{label}</span>
      <select
        className="w-full cursor-pointer appearance-none truncate bg-transparent type-label-large text-text-primary focus-visible:outline-none"
        {...select}
      >
        {children}
      </select>
    </label>
  );
}

export function SearchSubmit({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className={cn(
        'flex h-52 items-center justify-center gap-10 rounded-xl bg-brand-accent px-20 type-label-large text-text-on-dark',
        'transition-colors duration-150 hover:bg-brand-primary active:bg-brand-accent-pressed',
        'tablet:col-span-2 tablet:h-56 desktop:h-auto desktop:flex-1',
      )}
    >
      <Icon name="search" size={18} />
      {children}
    </button>
  );
}

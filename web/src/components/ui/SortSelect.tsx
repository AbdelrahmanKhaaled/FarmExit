'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

/*
 * Figma: Components → Group / Form Fields → Sort Select ("native select, no chevron"): Label/Small Strong muted
 * label + 40px select (border/strong, r10, Label/Button). The open list is the browser's native picker.
 */
export function SortSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  labelClassName,
  selectClassName,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  /** e.g. `max-tablet:sr-only`: the mobile frame shows the select without its visible label. */
  labelClassName?: string;
  /** Width utilities for the select (e.g. `grow` on mobile). */
  selectClassName?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-10', className)}>
      <label htmlFor={id} className={cn('shrink-0 type-label-small-strong text-text-muted', labelClassName)}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          'h-40 min-w-0 cursor-pointer appearance-none rounded-md border border-border-strong bg-bg-surface px-14',
          'type-label-button text-text-primary transition-colors duration-150 hover:border-brand-primary',
          selectClassName,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

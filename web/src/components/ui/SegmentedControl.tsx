'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

/*
 * Figma: Components → Group / Tabs & Chips → Segmented Control (Segmented Tab Active · Inactive), on dark bands.
 * Track overlay/glass-subtle, r14, padding 5, gap 4; tabs 44 tall, r10, padding 18, Label/Button;
 * active = white with text/brand, inactive = text/on-dark. Scrolls horizontally when it doesn't fit (mobile).
 * WAI-ARIA tabs: arrow keys move between tabs (mirrored in RTL); panels use `tabPanelId(idBase, value)`.
 */
export type SegmentedOption<T extends string> = { value: T; label: string };

export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
export const tabPanelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;

export function SegmentedControl<T extends string>({
  idBase,
  label,
  options,
  value,
  onChange,
  className,
}: {
  idBase: string;
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = -1;
    if (event.key === forward) next = (index + 1) % options.length;
    else if (event.key === backward) next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div className={cn('max-w-full overflow-x-auto', className)}>
      <div role="tablist" aria-label={label} className="flex w-max gap-4 rounded-xl bg-overlay-glass-subtle p-5">
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={tabId(idBase, option.value)}
              aria-selected={selected}
              aria-controls={tabPanelId(idBase, option.value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                'h-44 shrink-0 whitespace-nowrap rounded-md px-18 type-label-button transition-colors duration-150',
                selected ? 'bg-bg-surface text-text-brand' : 'text-text-on-dark hover:bg-overlay-glass-subtle',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

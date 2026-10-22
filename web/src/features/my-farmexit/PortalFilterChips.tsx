'use client';

import { cn } from '@/lib/cn';

export type FilterChip = { id: string; label: string; disabled?: boolean };

type Props = {
  chips: FilterChip[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
};

export function PortalFilterChips({ chips, activeId, onSelect, ariaLabel }: Props) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-8">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          disabled={chip.disabled}
          aria-pressed={activeId === chip.id}
          onClick={() => onSelect(chip.id)}
          className={cn(
            'min-h-40 rounded-full border px-16 py-8 type-label-caption transition-colors duration-150',
            activeId === chip.id
              ? 'border-brand-primary bg-bg-success-soft text-text-brand'
              : 'border-border-strong bg-bg-surface text-text-secondary hover:bg-bg-hover',
            chip.disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

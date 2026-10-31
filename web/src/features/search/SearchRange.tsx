'use client';
import { useState } from 'react';
export function SearchRange({
  label,
  prefix,
  bounds,
  ar,
  disabled = false,
  value,
}: {
  label: string;
  prefix: string;
  bounds: { min: number; max: number; step: number };
  ar: boolean;
  disabled?: boolean;
  value?: [number | undefined, number | undefined];
}) {
  const [min, setMin] = useState(value?.[0] === undefined ? '' : String(value[0]));
  return (
    <fieldset
      disabled={disabled}
      className="flex min-w-0 flex-col gap-6 rounded-xl bg-bg-surface px-18 py-14 desktop:flex-1"
    >
      <legend className="sr-only">{label}</legend>
      <span aria-hidden="true" className="type-overline-field text-text-muted">
        {label}
      </span>
      <div className="flex min-w-0 gap-8">
        <input
          aria-label={label + (ar ? ' من' : ' minimum')}
          name={prefix + 'Min'}
          defaultValue={value?.[0]}
          type="number"
          min={bounds.min}
          max={bounds.max}
          step={prefix === 'price' ? 1 : '0.01'}
          placeholder={ar ? 'من' : 'From'}
          onChange={(event) => setMin(event.target.value)}
          className="w-full min-w-0 bg-transparent type-label-medium"
        />
        <span aria-hidden="true">–</span>
        <input
          aria-label={label + (ar ? ' إلى' : ' maximum')}
          name={prefix + 'Max'}
          defaultValue={value?.[1]}
          type="number"
          min={min || bounds.min}
          max={bounds.max}
          step={prefix === 'price' ? 1 : '0.01'}
          placeholder={ar ? 'إلى' : 'To'}
          className="w-full min-w-0 bg-transparent type-label-medium"
        />
      </div>
    </fieldset>
  );
}

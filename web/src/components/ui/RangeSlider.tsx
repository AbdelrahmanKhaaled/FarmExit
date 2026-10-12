'use client';

import { cn } from '@/lib/cn';

/*
 * Figma: Components → Group / Marketplace Filters → Range Slider. 20px track: 4px track/default rail, brand/primary
 * range, white handles (2px brand/primary ring, Premium Rest). Min and Max shown stacked and in full below
 * (bg/muted boxes, border/default, r12, Overline/Field caption + Label/Small Strong value) so no digits are clipped
 * (Source of Truth 4o). Two native range inputs keep keyboard and screen-reader support; in RTL the track mirrors.
 * Thumb styles: src/styles/controls.css.
 */
export type RangeSliderProps = {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  format: (value: number) => string;
  minCaption: string;
  maxCaption: string;
  /** Accessible names for the two handles. */
  minLabel: string;
  maxLabel: string;
  className?: string;
};

export function RangeSlider({
  min,
  max,
  step,
  value: [lo, hi],
  onChange,
  format,
  minCaption,
  maxCaption,
  minLabel,
  maxLabel,
  className,
}: RangeSliderProps) {
  const pct = (v: number) => (v - min) / (max - min);
  // Handle centres sit half a handle (10.5px) inside each end of the 21px-wide thumb travel.
  const at = (p: number) => `calc(10.5px + (100% - 21px) * ${p})`;

  return (
    <div className={cn('flex flex-col gap-14', className)}>
      <div className="relative h-20">
        <span aria-hidden="true" className="absolute inset-x-0 top-8 h-4 rounded-full bg-track-default" />
        <span
          aria-hidden="true"
          className="absolute top-8 h-4 rounded-full bg-brand-primary"
          style={{ insetInlineStart: at(pct(lo)), insetInlineEnd: `calc(100% - ${at(pct(hi))})` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={minLabel}
          aria-valuetext={format(lo)}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className="fx-range"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={maxLabel}
          aria-valuetext={format(hi)}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className="fx-range"
        />
      </div>
      <dl className="flex flex-col gap-8">
        {[
          [minCaption, lo],
          [maxCaption, hi],
        ].map(([caption, v]) => (
          <div
            key={caption}
            className="flex items-center justify-between gap-8 rounded-lg border border-border-default bg-bg-muted px-14 py-10"
          >
            <dt className="type-overline-field text-text-muted">{caption}</dt>
            <dd className="type-label-small-strong text-text-primary">{format(v as number)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

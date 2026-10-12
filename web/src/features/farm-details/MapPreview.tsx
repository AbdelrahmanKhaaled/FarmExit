'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';

/*
 * Figma: Group / Farm Details → Map Preview. A stylised location preview, not a live map: plots, desert road,
 * canal, a dashed farm boundary and the pin, on bg/subtle (r24, hairline; 400 tall, 300 on mobile). Shapes keep
 * the Figma proportions (percent insets of 792×400). Approximate area only — the exact pin is never public and is
 * shared through FarmExit on request. Zoom scales the illustration around the pin.
 */
const ZOOMS = [1, 1.25, 1.5];

const PLOTS: { pos: string; tone: 'soft' | 'accent' }[] = [
  { pos: 'top-[7.5%] end-[68.43%] bottom-[60%] start-[5.05%]', tone: 'soft' },
  { pos: 'top-[5%] end-[46.97%] bottom-[67.5%] start-[34.09%]', tone: 'accent' },
  { pos: 'top-[10%] end-[20.45%] bottom-[52.5%] start-[55.56%]', tone: 'soft' },
  { pos: 'top-[5%] -end-[3.54%] bottom-[65%] start-[82.07%]', tone: 'accent' },
  { pos: 'top-[47.5%] end-[73.48%] bottom-[7.5%] start-[3.79%]', tone: 'accent' },
  { pos: 'top-[40%] end-[45.71%] bottom-[30%] start-[29.04%]', tone: 'soft' },
  { pos: 'top-[55%] end-[20.45%] bottom-[5%] start-[58.08%]', tone: 'soft' },
  { pos: 'top-[42.5%] -end-[1.01%] bottom-[5%] start-[82.07%]', tone: 'accent' },
  { pos: 'top-[75%] end-[45.71%] -bottom-[2.5%] start-[30.3%]', tone: 'accent' },
];

export function MapPreview({ place, roadLabel }: { place: string; roadLabel: string | null }) {
  const t = useTranslations('farm.details.location');
  const [zoom, setZoom] = useState(0);

  return (
    <div
      role="img"
      aria-label={`${t('mapLabel')}: ${place}. ${t('approx')}`}
      className="relative h-300 overflow-hidden rounded-card border border-border-hairline bg-bg-subtle tablet:h-400"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 origin-[50.5%_47.5%] transition-transform duration-200"
        style={{ transform: `scale(${ZOOMS[zoom]})` }}
      >
        {PLOTS.map((plot, i) => (
          <span
            key={i}
            className={cn(
              'absolute rounded-sm',
              plot.pos,
              plot.tone === 'soft' ? 'bg-bg-success-soft' : 'bg-brand-accent-soft/32',
            )}
          />
        ))}
        <span className="absolute top-[30%] end-[36.87%] bottom-[35%] start-[37.88%] rounded-lg bg-brand-primary/14" />
        <span className="absolute top-[30%] end-[36.87%] bottom-[35%] start-[37.88%] rounded-lg border-2 border-dashed border-brand-primary" />
        {/* Desert road, access road, canal road (12°) and canal. */}
        <span className="absolute top-[35%] -end-[6.06%] bottom-[61.5%] -start-[2.53%] bg-bg-surface" />
        <span className="absolute -top-[5%] end-[67.17%] -bottom-[10%] start-[31.57%] bg-bg-surface" />
        <span className="absolute -top-[10%] -bottom-[12%] start-[64%] w-10 rotate-12 bg-bg-surface rtl:-rotate-12" />
        <span className="absolute top-[72.5%] -end-[6.06%] bottom-[26%] -start-[2.53%] bg-brand-accent/40" />
        {roadLabel && (
          <span className="absolute top-[34%] start-[3.03%] rounded-sm bg-bg-surface px-8 py-3 type-label-tag text-text-muted">
            {roadLabel}
          </span>
        )}
        <span className="absolute top-[32.5%] end-[41.92%] bottom-[37.5%] start-[42.93%] rounded-full bg-brand-primary/15" />
        <span className="absolute top-[41%] start-[47.22%] flex size-52 items-center justify-center rounded-full border-3 border-bg-surface bg-brand-primary text-text-on-dark effect-premium-lift">
          <Icon name="location-pin" size={24} />
        </span>
      </div>

      <div className="absolute end-62 top-[56.5%] flex max-w-[calc(100%-32px)] flex-col gap-2 rounded-lg border border-overlay-glass-light-border bg-overlay-glass-light px-14 py-10 effect-floating-glass max-tablet:start-6 max-tablet:end-auto">
        <p className="type-label-small-strong text-text-primary">{place}</p>
        <p className="type-label-caption text-text-muted">{t('approx')}</p>
      </div>

      <div className="absolute end-17 top-19 flex flex-col overflow-hidden rounded-lg border border-border-default bg-bg-surface">
        <button
          type="button"
          aria-label={t('zoomIn')}
          disabled={zoom === ZOOMS.length - 1}
          onClick={() => setZoom((z) => Math.min(z + 1, ZOOMS.length - 1))}
          className="flex size-44 items-center justify-center text-text-primary transition-colors duration-150 hover:bg-bg-hover disabled:text-text-disabled"
        >
          <Icon name="add" size={18} />
        </button>
        <button
          type="button"
          aria-label={t('zoomOut')}
          disabled={zoom === 0}
          onClick={() => setZoom((z) => Math.max(z - 1, 0))}
          className="flex size-44 items-center justify-center text-text-primary transition-colors duration-150 hover:bg-bg-hover disabled:text-text-disabled"
        >
          <span aria-hidden="true" className="h-[1.6px] w-12 bg-current" />
        </button>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useRef, useState, type PointerEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';
import { PhotoGlassBadge } from '@/components/ui/Badge';
import { FavoriteButton } from '@/components/ui/IconButton';
import { Dialog } from '@/components/overlay/Dialog';
import { ScoreGlass } from '@/features/farms/FarmExitScore';
import { useSavedFarm } from './saved-farm';

/*
 * Figma: Farm Details › Hero Gallery (Desktop 1440 · Tablet 1024 · Mobile 390).
 * - Desktop: mosaic — main 792×560 (r24) + 2×2 thumbnails 192×274 (r18), gap 12.
 * - Tablet: main 944×520 + a 4-thumbnail strip (150 tall).
 * - Mobile: full-bleed main 390×320 (swipe) + a scrolling 96×72 thumbnail strip, inset 16, gap 8.
 * Overlays, one per corner on a 24 / 16 inset: listing status (hidden on mobile) · Save · compact Score Glass ·
 * counter (mobile: beside Save). "Illustrative image" only on a photo the listing marks that way.
 * CMS Data Map: first photo = main, next 4 = thumbnails, counter "n / photos.length", "+N" = remaining photos;
 * with fewer than 5 photos the mosaic is the main photo plus the available thumbnails.
 * Thumbnails switch the main photo; the fourth thumbnail and the counter open "View all photos".
 */
export type GalleryPhoto = { src: string; alt: string; isIllustrative: boolean; position?: string };

const GLASS_PILL =
  'inline-flex items-center gap-8 rounded-full border border-overlay-glass-border bg-overlay-deep-glass py-10 ps-14 pe-16 ' +
  'effect-hero-glass type-label-small-strong text-text-on-dark';

export function FarmGallery({
  photos,
  name,
  status,
  score,
}: {
  photos: GalleryPhoto[];
  name: string;
  /** "For sale" / "For rent". */
  status: string;
  score: number | null;
}) {
  const t = useTranslations('farm.details.gallery');
  const ta = useTranslations('farm.details.actions');
  const tc = useTranslations('farm.card');
  const rtl = useLocale() === 'ar';
  const { saved, toggle } = useSavedFarm();
  const [active, setActive] = useState(0);
  const [allOpen, setAllOpen] = useState(false);
  const swipeStart = useRef<number | null>(null);

  const total = photos.length;
  const thumbs = photos.slice(1, 5);
  const remaining = total - 1 - thumbs.length;

  const step = (delta: number) => setActive((i) => (i + delta + total) % total);

  // Mobile swipe: towards the inline start shows the next photo (mirrored in Arabic).
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') swipeStart.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) < 40 || total < 2) return;
    step(dx < 0 !== rtl ? 1 : -1);
  };

  const counter = (
    <button
      type="button"
      onClick={() => setAllOpen(true)}
      aria-label={`${t('viewAll')} (${t('counter', { current: active + 1, total })})`}
      className={cn(GLASS_PILL, 'transition-colors duration-150 hover:bg-brand-deep')}
    >
      <Icon name="gallery" size={18} />
      <span aria-live="polite">{t('counter', { current: active + 1, total })}</span>
    </button>
  );

  return (
    <section aria-label={t('label')} className="flex flex-col gap-8 tablet:gap-12 desktop:flex-row">
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
        className={cn(
          'relative h-320 touch-pan-y overflow-hidden bg-bg-image-placeholder tablet:h-520 tablet:rounded-card desktop:h-560',
          thumbs.length > 0 ? 'desktop:w-[calc((100%-12px)*2/3)] desktop:shrink-0' : 'desktop:w-full',
        )}
      >
        {photos.map((p, i) => (
          <Image
            key={p.src}
            src={p.src}
            alt={i === active ? p.alt : ''}
            aria-hidden={i === active ? undefined : true}
            fill
            priority={i === 0}
            sizes="(min-width: 1280px) 792px, 100vw"
            className={cn('object-cover transition-opacity duration-200', i === active ? 'opacity-100' : 'opacity-0')}
            style={{ objectPosition: p.position }}
          />
        ))}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 fx-shade-photo" />

        <div className="absolute start-16 top-16 flex items-center gap-8 tablet:start-24 tablet:top-24">
          <span className={cn(GLASS_PILL, 'max-tablet:hidden')}>{status}</span>
          {photos[active]?.isIllustrative && <PhotoGlassBadge icon="gallery">{tc('illustrative')}</PhotoGlassBadge>}
        </div>

        {/* Mobile: counter beside Save (top end). Desktop/tablet: Save top end, counter bottom end. */}
        <div className="absolute end-10 top-10 flex items-center gap-8 tablet:end-21 tablet:top-21">
          <span className="tablet:hidden">{counter}</span>
          <FavoriteButton saved={saved} label={ta('saveLabel', { name })} onClick={toggle} />
        </div>
        <div className="absolute end-24 bottom-24 hidden tablet:block">{counter}</div>

        {score !== null && (
          <ScoreGlass score={score} className="absolute start-16 bottom-16 tablet:start-24 tablet:bottom-24" />
        )}
      </div>

      {thumbs.length > 0 && (
        <ul
          className={cn(
            'flex gap-8 overflow-x-auto px-16 tablet:grid tablet:grid-cols-4 tablet:gap-12 tablet:overflow-visible tablet:px-0',
            'desktop:grid-cols-2 desktop:grid-rows-2 desktop:flex-1',
          )}
        >
          {thumbs.map((p, i) => {
            const index = i + 1;
            const last = i === 3;
            return (
              <li key={p.src} className="relative h-72 w-96 shrink-0 tablet:h-150 tablet:w-auto desktop:h-auto">
                <button
                  type="button"
                  onClick={() => (last ? setAllOpen(true) : setActive(index))}
                  aria-label={last ? t('viewAll') : t('showPhoto', { index: index + 1, total })}
                  aria-current={!last && active === index ? 'true' : undefined}
                  className={cn(
                    'relative block size-full overflow-hidden rounded-image bg-bg-image-placeholder',
                    'outline-offset-2 aria-[current=true]:outline-2 aria-[current=true]:outline-brand-accent',
                  )}
                >
                  <Image
                    src={p.src}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 192px, (min-width: 768px) 25vw, 96px"
                    className="object-cover"
                    style={{ objectPosition: p.position }}
                  />
                  {last && (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-deep/55 text-center">
                      {remaining > 0 && (
                        <span className="type-heading-h3 text-text-on-dark">{t('more', { count: remaining })}</span>
                      )}
                      <span className="type-label-small-strong text-overlay-on-dark-body max-tablet:sr-only">
                        {t('viewAll')}
                      </span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={allOpen}
        onOpenChange={setAllOpen}
        size="wide"
        title={t('allTitle')}
        description={t('allDescription', { count: total, name })}
      >
        <ul className="grid grid-cols-1 gap-12 tablet:grid-cols-2">
          {photos.map((p, i) => (
            <li key={p.src}>
              <button
                type="button"
                onClick={() => {
                  setActive(i);
                  setAllOpen(false);
                }}
                aria-label={t('showPhoto', { index: i + 1, total })}
                className="relative block aspect-[4/3] w-full overflow-hidden rounded-image bg-bg-image-placeholder"
              >
                <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 440px, 100vw" className="object-cover" />
                {p.isIllustrative && (
                  <PhotoGlassBadge icon="gallery" className="absolute start-14 top-14">
                    {tc('illustrative')}
                  </PhotoGlassBadge>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </section>
  );
}

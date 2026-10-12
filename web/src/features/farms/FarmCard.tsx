'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';
import { PhotoGlassBadge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { FavoriteButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Surface';
import { FarmExitScore } from './FarmExitScore';

/*
 * Figma: Components → Group / Farm Card → Farm Card (Layout = Grid, State = Default · Hover · Saved).
 * White card, hairline, Elevation/Premium Rest (hover Premium Lift), r24. 8px-inset photo (366×296 ratio, r18)
 * with the photo Fade at 60%, Favorite button top-end 12 and, only when the photo isn't the actual farm, an
 * "Illustrative image" Photo Glass badge top-start 14. Body 20/24/24: listing (Overline/Field, accent), name
 * (Card Title), location (pin + Body/Caption), attributes (area · crop · water, accent icons, Label/Meta),
 * the FarmExit Score (when the listing has one, 20 below the attributes), then a hairline footer with the price
 * block and View details (Primary M).
 * Widths: 384 homepage grid · 460 tablet · 358 mobile; the photo keeps its ratio, so crops never stretch.
 */
export type FarmCardData = {
  name: string;
  listingLabel: string;
  location: string;
  area: string;
  crop: string;
  water: string;
  priceLabel: string;
  price: string;
  priceSub: string;
  imageAlt: string;
  image: { src: string; position?: string };
  illustrative?: boolean;
  /** FarmExit Score out of 5 (FarmExit's own evaluation); omitted when no approved value exists. */
  score?: number | null;
  href: string;
};

const ATTRIBUTES: { key: 'area' | 'crop' | 'water'; icon: IconName }[] = [
  { key: 'area', icon: 'area' },
  { key: 'crop', icon: 'tree' },
  { key: 'water', icon: 'drop' },
];

export function FarmCard({ farm, sizes }: { farm: FarmCardData; sizes: string }) {
  const t = useTranslations('farm.card');

  return (
    <Card as="article" interactive padding="none" className="flex h-full flex-col">
      <FarmCardMedia
        src={farm.image.src}
        alt={farm.imageAlt}
        position={farm.image.position}
        sizes={sizes}
        illustrative={farm.illustrative}
        name={farm.name}
        aspect="aspect-[366/296]"
      />

      <div className="flex grow flex-col px-24 pt-20 pb-24">
        <div className="flex flex-col gap-6">
          <p className="type-overline-field text-text-accent">{farm.listingLabel}</p>
          <h3 className="type-heading-card-title text-text-primary">{farm.name}</h3>
          <p className="flex items-center gap-6 type-body-caption text-text-muted">
            <Icon name="location-pin" size={16} />
            {farm.location}
          </p>
        </div>

        <ul aria-label={t('attributes')} className="mt-18 flex flex-wrap gap-x-20 gap-y-10">
          {ATTRIBUTES.map(({ key, icon }) => (
            <li key={key} className="flex items-center gap-8 type-label-meta text-text-secondary">
              <Icon name={icon} size={18} className="text-brand-accent" />
              {farm[key]}
            </li>
          ))}
        </ul>

        {farm.score != null && <FarmExitScore score={farm.score} className="mt-20" />}

        <div className="mt-auto pt-20">
          <div className="flex items-start justify-between gap-12 border-t border-border-hairline pt-20">
            <div className="flex flex-col gap-4">
              <p className="type-label-caption text-text-muted">{farm.priceLabel}</p>
              <p className="type-heading-price text-text-brand">{farm.price}</p>
              <p className="type-label-caption text-text-muted">{farm.priceSub}</p>
            </div>
            <Link
              href={farm.href}
              aria-label={t('viewDetailsFor', { name: farm.name })}
              className={buttonClasses({ variant: 'primary', size: 'md' })}
            >
              {t('viewDetails')}
              <Icon name="arrow-right" size={14} className="rtl:hidden" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Photo block shared by the Grid and Marketplace Farm Card layouts: 8px inset, r18, photo Fade at 60%,
 * "Illustrative image" (only when the listing marks the photo that way) top-start 14, Favorite top-end 12.
 * Save is in-page state only until accounts exist.
 */
export function FarmCardMedia({
  src,
  alt,
  position,
  sizes,
  illustrative,
  name,
  aspect,
}: {
  src: string;
  alt: string;
  position?: string;
  sizes: string;
  illustrative?: boolean;
  name: string;
  /** Aspect-ratio utility for the photo, e.g. aspect-[366/296] (Grid) or aspect-[461/300] (Marketplace). */
  aspect: string;
}) {
  const t = useTranslations('farm.card');
  const [saved, setSaved] = useState(false);
  return (
    <div className="px-8 pt-8">
      <div className={cn('relative overflow-hidden rounded-image bg-bg-image-placeholder', aspect)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" style={{ objectPosition: position }} />
        <div aria-hidden="true" className="absolute inset-0 opacity-60 fx-shade-photo" />
        {illustrative && (
          <PhotoGlassBadge icon="gallery" className="absolute start-14 top-14">
            {t('illustrative')}
          </PhotoGlassBadge>
        )}
        {/* 38px button centred in its 44px hit area, so the visible button sits 12px from the corner. */}
        <div className="absolute end-9 top-9 z-10">
          <FavoriteButton saved={saved} label={t('save', { name })} onClick={() => setSaved((v) => !v)} />
        </div>
      </div>
    </div>
  );
}

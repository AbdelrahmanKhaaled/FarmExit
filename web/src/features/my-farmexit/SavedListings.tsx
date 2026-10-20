import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Surface';
import { FarmExitScoreBlock } from '@/features/farms/FarmExitScore';
import { LISTING_PLACEHOLDER_SRC } from '@/lib/data/marketplace-api';
import { Icon } from '@/components/icons/Icon';
export type SavedListing = {
  id: string;
  slug: string;
  farmName: string;
  governorate: string;
  listingType?: string;
  farmExitScore?: number | null;
};

/** Saved API data has no approved public photo, price or agronomic details. */
export function SavedListings({ items }: { items: SavedListing[] }) {
  const t = useTranslations('workspace.visual');
  const card = useTranslations('farm.card');
  return (
    <ul className="grid gap-24 tablet:grid-cols-2 desktop:grid-cols-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card as="article" padding="none" className="flex h-full flex-col gap-16 p-8">
            <div className="relative aspect-[4/3] overflow-hidden rounded-image bg-bg-image-placeholder">
              <Image
                src={LISTING_PLACEHOLDER_SRC}
                alt=""
                fill
                sizes="(min-width:1280px) 300px, (min-width:768px) 45vw, 90vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-12 p-16">
              {(item.listingType === 'sale' || item.listingType === 'rent') && (
                <p className="type-overline-field text-text-accent">{card(`listing.${item.listingType}`)}</p>
              )}
              <h3 className="type-heading-h4">
                <Link href={`/farms/${item.slug}`}>{item.farmName}</Link>
              </h3>
              <p className="flex items-start gap-6 type-body-caption text-text-muted">
                <Icon name="location-pin" size={16} className="shrink-0" />
                {item.governorate}
              </p>
              <FarmExitScoreBlock score={item.farmExitScore ?? null} />
              <Link
                href={`/farms/${item.slug}`}
                className="mt-auto inline-flex min-h-44 items-center justify-between gap-8 border-t border-border-hairline pt-12 type-label-small-strong text-text-brand"
              >
                {t('view')}
                <Icon name="arrow-right" size={18} />
              </Link>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

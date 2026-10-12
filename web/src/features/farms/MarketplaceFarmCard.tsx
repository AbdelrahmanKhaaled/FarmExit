'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';
import type { MarketplaceListing } from '@/lib/data/marketplace';
import { formatEgp } from '@/lib/format';
import { FarmCardMedia } from './FarmCard';
import { FarmExitScore } from './FarmExitScore';

/*
 * Figma: Components → Group / Farm Card → Farm Card (Layout = Marketplace), 477 wide in the desktop 2-column grid
 * (Source of Truth 4o). Photo 461×300 (8px inset, r18). Body 24/28/28, gap 24: listing (Overline/Field, accent),
 * name (Heading/H4), location (pin + Body/Default); Key Info under a hairline — Farm area · Activity · Water source ·
 * Irrigation method (Label/Meta label, Label/Large value); full price (Heading/Price) with the price per feddan
 * underneath (Body/Small). A dedicated action area with a top hairline holds a full-width View details (Primary M).
 * The FarmExit Score (FarmExit's own evaluation) follows Key Info when the listing has an approved value, as on the
 * Grid card. No Verified badge (4p). Missing values read "Not stated in listing"; nothing is computed.
 */
export function MarketplaceFarmCard({ listing, href }: { listing: MarketplaceListing; href: string }) {
  const t = useTranslations('farm.card');
  const to = useTranslations('marketplace.options');
  const tg = useTranslations('marketplace.governorates');
  const locale = useLocale() as 'en' | 'ar';
  const name = listing.name[locale];
  const sale = listing.purpose === 'sale';

  const info: { label: string; value: string }[] = [
    { label: t('areaLabel'), value: t('areaValue', { count: listing.areaFeddan }) },
    { label: t('activityLabel'), value: listing.activity[locale] },
    { label: t('waterLabel'), value: listing.waterSourceText?.[locale] ?? t('notStated') },
    {
      label: t('irrigationLabel'),
      value: listing.irrigationMethod ? to(`irrigationMethods.${listing.irrigationMethod}`) : t('notStated'),
    },
  ];

  const amount = sale ? listing.askingPrice : listing.annualRentPerFeddan;
  const sub = sale
    ? listing.pricePerFeddan !== null
      ? t('pricePerFeddan', { amount: formatEgp(listing.pricePerFeddan) })
      : t('pricePerFeddanNotStated')
    : t('rentPerFeddan');

  return (
    <Card as="article" interactive padding="none" className="flex h-full flex-col">
      <FarmCardMedia
        src={listing.image.src}
        alt={listing.image.alt[locale]}
        sizes="(min-width: 1280px) 461px, (min-width: 768px) 50vw, 100vw"
        illustrative={listing.image.isIllustrative}
        name={name}
        aspect="aspect-[461/300]"
      />

      <div className="flex grow flex-col gap-24 px-24 pt-24 pb-28 tablet:px-28">
        <div className="flex flex-col gap-6">
          <p className="type-overline-field text-text-accent">{t(`listing.${listing.purpose}`)}</p>
          <h3 className="type-heading-h4 text-text-primary">{name}</h3>
          <p className="flex items-center gap-6 type-body-default text-text-muted">
            <Icon name="location-pin" size={16} />
            {t('location', { area: listing.area.label[locale], governorate: tg(listing.governorate) })}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-24 gap-y-16 border-t border-border-hairline pt-20">
          {info.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col gap-4">
              <dt className="type-label-meta text-text-muted">{item.label}</dt>
              <dd className="type-label-large break-words text-text-primary">{item.value}</dd>
            </div>
          ))}
        </dl>

        {listing.score !== null && <FarmExitScore score={listing.score} />}

        <div className="mt-auto flex flex-col gap-4">
          <p className="type-label-meta text-text-muted">{t(`priceLabel.${listing.purpose}`)}</p>
          <p className="type-heading-price text-text-brand">
            {amount !== null ? t('price', { amount: formatEgp(amount) }) : t('notStated')}
          </p>
          <p className="type-body-small text-text-muted">{sub}</p>
        </div>
      </div>

      <div className="border-t border-border-hairline px-24 pt-20 pb-24 tablet:px-28">
        <Link
          href={href}
          aria-label={t('viewDetailsFor', { name })}
          className={buttonClasses({ variant: 'primary', size: 'md', fullWidth: true })}
        >
          {t('viewDetails')}
        </Link>
      </div>
    </Card>
  );
}

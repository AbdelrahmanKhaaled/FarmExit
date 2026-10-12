'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import type { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';
import { BlockButtonLink, ButtonLink } from '@/components/ui/Button';
import { FavoriteButton } from '@/components/ui/IconButton';
import type { ListingPurpose } from '@/lib/domain/enums';
import { FarmExitScore, ScoreLine } from '@/features/farms/FarmExitScore';
import { useSavedFarm } from './saved-farm';

/*
 * Figma: Group / Farm Details → Request Panel (Listing = Sale · Rent), the tablet/mobile "Price & Actions" card and
 * the Sticky Action Bar. Sale → "Request farm details"; Rent → "Request rental information". Owner contact always
 * goes through FarmExit: both actions start the FarmExit request (which asks guests to sign in first); there are
 * no phone numbers, emails or WhatsApp links. The FarmExit Score sits under the price (restored).
 */
type Href = ComponentProps<typeof Link>['href'];

export type FarmPrice = {
  /** "Asking price" / "Expected annual rent per feddan". */
  label: string;
  /** Short amount, e.g. "EGP 54M". */
  amount: string;
  /** "EGP 450K / feddan · 120 feddans" · "per feddan / year · 35 feddans". */
  sub: string;
};

type ActionProps = {
  name: string;
  purpose: ListingPurpose;
  price: FarmPrice;
  score: number | null;
  requestHref: Href;
};

export const INLINE_PRICE_ID = 'farm-price-actions';

function PriceBlock({ price, className }: { price: FarmPrice; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <p className="type-label-meta text-text-muted">{price.label}</p>
      <p className="type-heading-stat text-text-primary" data-testid="farm-price">
        {price.amount}
      </p>
      <p className="type-body-caption text-text-muted" data-testid="farm-price-sub">
        {price.sub}
      </p>
    </div>
  );
}

/** Desktop sidebar: white, hairline, r24, padding 28, gap 20, Elevation/Premium Lift; sticky under the navbar. */
export function RequestPanel({ name, purpose, price, score, requestHref }: ActionProps) {
  const t = useTranslations('farm.details.actions');
  const { saved, toggle } = useSavedFarm();
  return (
    <div
      data-testid="request-panel"
      className="flex flex-col gap-20 rounded-card border border-border-hairline bg-bg-surface p-28 effect-premium-lift"
    >
      <PriceBlock price={price} className="gap-4" />
      {score !== null && <FarmExitScore score={score} />}
      <div className="flex flex-col gap-12">
        <BlockButtonLink href={requestHref} variant="primary">
          {purpose === 'sale' ? t('requestSale') : t('requestRent')}
        </BlockButtonLink>
        <BlockButtonLink href={requestHref} variant="outline">
          {t('contact')}
        </BlockButtonLink>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={saved}
          aria-label={t('saveLabel', { name })}
          className="flex h-46 items-center justify-center gap-8 rounded-lg px-18 type-label-button text-text-brand transition-colors duration-150 hover:bg-bg-hover"
        >
          {saved ? t('saved') : t('save')}
          <Icon
            name={saved ? 'heart-filled' : 'heart'}
            size={14}
            className={saved ? 'text-status-favorite' : undefined}
          />
        </button>
      </div>
      <p className="flex gap-10 border-t border-border-subtle pt-16 type-label-caption text-text-muted">
        <Icon name="lock" size={18} />
        {t('privacy')}
      </p>
    </div>
  );
}

/**
 * Tablet / mobile: the Request Panel becomes an inline "Price & Actions" card in the overview (r24, Premium Rest).
 * Tablet: price + Request (Primary L) + Contact owner (Outline L) + Save in one row. Mobile: stacked, full width.
 */
export function PriceActions({ name, purpose, price, score, requestHref }: ActionProps) {
  const t = useTranslations('farm.details.actions');
  const { saved, toggle } = useSavedFarm();
  return (
    <div
      id={INLINE_PRICE_ID}
      className={cn(
        'flex flex-col gap-16 rounded-card border border-border-hairline bg-bg-surface p-20 effect-premium-rest',
        'tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-x-24 tablet:px-28 tablet:py-24',
      )}
    >
      <PriceBlock price={price} className="gap-2 tablet:flex-1" />
      <div className="flex flex-col gap-10 tablet:flex-row tablet:items-center tablet:gap-12">
        <ButtonLink href={requestHref} variant="primary" size="lg">
          {purpose === 'sale' ? t('requestSale') : t('requestRent')}
        </ButtonLink>
        <ButtonLink href={requestHref} variant="outline" size="lg">
          {t('contactShort')}
        </ButtonLink>
        <span className="hidden tablet:inline-flex">
          <FavoriteButton saved={saved} label={t('saveLabel', { name })} onClick={toggle} />
        </span>
      </div>
      {score !== null && <FarmExitScore score={score} className="tablet:basis-full" />}
    </div>
  );
}

/**
 * Sticky Action Bar (fixed): white 96% + Blur/Nav Glass, top border; price (Heading/Card Title) with the FarmExit
 * Score line, Save, and the primary request. Mobile: always visible. Tablet: once the inline card scrolls away.
 */
export function StickyActionBar({ name, purpose, price, score, requestHref }: ActionProps) {
  const t = useTranslations('farm.details.actions');
  const { saved, toggle } = useSavedFarm();
  const [inlineVisible, setInlineVisible] = useState(true);

  useEffect(() => {
    const target = document.getElementById(INLINE_PRICE_ID);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setInlineVisible(entry?.isIntersecting ?? true));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      role="region"
      aria-label={t('barLabel')}
      data-shown={!inlineVisible}
      data-testid="sticky-action-bar"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 flex items-center gap-12 border-t border-border-nav bg-overlay-nav px-16 pt-12 pb-24 effect-nav-glass',
        'tablet:px-40 tablet:max-desktop:hidden tablet:max-desktop:data-[shown=true]:flex desktop:hidden',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate type-heading-card-title text-text-primary">{price.amount}</p>
        {score !== null && <ScoreLine score={score} />}
      </div>
      <FavoriteButton saved={saved} label={t('saveLabel', { name })} onClick={toggle} />
      <ButtonLink href={requestHref} variant="primary" size="lg">
        {purpose === 'sale' ? t('stickySale') : t('stickyRent')}
      </ButtonLink>
    </div>
  );
}

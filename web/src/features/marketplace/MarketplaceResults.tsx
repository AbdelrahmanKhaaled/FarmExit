'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { accountLinks } from '@/components/layout/site-links';
import { BlockButton, Button, ButtonLink } from '@/components/ui/Button';
import { AppliedChip } from '@/components/ui/Chip';
import { EmptyState, TrustNote } from '@/components/ui/Notes';
import { Pagination } from '@/components/ui/Pagination';
import { SortSelect } from '@/components/ui/SortSelect';
import { Sheet } from '@/components/overlay/Sheet';
import { MarketplaceFarmCard } from '@/features/farms/MarketplaceFarmCard';
import {
  defaultFilters,
  FARM_SIZE_RANGE,
  marketplaceSorts,
  PRICE_RANGE,
  queryListings,
  type FarmMarketplaceSource,
  type MarketplaceFilters,
  type MarketplaceListing,
} from '@/lib/data/marketplace';
import { formatEgp } from '@/lib/format';
import { FilterPanel } from './FilterPanel';
import { appliedCount, defaultState, type MarketplaceState } from './url-state';
import { useMarketplaceState } from './use-marketplace-state';

/*
 * Figma: Marketplace / Explore Farms (Desktop 1440 · Tablet 1024 · Mobile 390), Filter Drawer Open, Empty Results.
 * - Desktop: sticky Filter Panel (Card, 310) 24px under the navbar; filters apply live; results toolbar (count +
 *   sample note, Sort Select); Trust Note; 2-column Marketplace Farm Cards (477); sample-state pagination.
 * - Tablet: "Filters · N" (Outline M) + Sort; applied filters as removable chips + Clear all; the Filter Drawer
 *   opens as a side sheet and applies on "Show N"; 2-up cards.
 * - Mobile: Filters + Sort in one row; bottom-sheet drawer with sticky Clear all / Show N; 1-up cards and
 *   "Load more farms" instead of pagination.
 * The result count always matches the listings on screen.
 */
const PAGE_SIZE = 9;
const MOBILE_STEP = 3;

type Props = { state: MarketplaceState; setState: (state: MarketplaceState) => void; listings: MarketplaceListing[] };

export function MarketplaceResultsView({ state, setState, listings }: Props) {
  const source = useMemo<FarmMarketplaceSource>(() => ({ all: () => listings }), [listings]);
  const t = useTranslations('marketplace');
  const locale = useLocale() as 'en' | 'ar';
  const { filters, sort } = state;

  const results = useMemo(() => queryListings(source, { filters, sort }), [source, filters, sort]);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(state.page, pageCount);
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageCountShown = Math.min(PAGE_SIZE, results.length - pageStart);

  // Mobile "Load more": restart at 3 whenever the result set changes.
  const resultKey = JSON.stringify({ filters, sort });
  const [mobile, setMobile] = useState({ key: resultKey, limit: MOBILE_STEP });
  const limit = mobile.key === resultKey ? mobile.limit : MOBILE_STEP;
  const mobileShown = Math.min(limit, results.length);

  // Tablet / mobile drawer works on a draft and applies on "Show N".
  const [drawer, setDrawer] = useState<{ open: boolean; side: 'bottom' | 'end'; draft: MarketplaceFilters }>({
    open: false,
    side: 'bottom',
    draft: filters,
  });
  const draftCount = useMemo(
    () => queryListings(source, { filters: drawer.draft, sort }).length,
    [source, drawer.draft, sort],
  );

  const update = (next: MarketplaceFilters) => setState({ ...state, filters: next, page: 1 });
  const clearAll = () => update({ ...defaultFilters, purpose: filters.purpose });
  const openDrawer = () =>
    setDrawer({
      open: true,
      side: window.matchMedia('(min-width: 768px)').matches ? 'end' : 'bottom',
      draft: filters,
    });

  const sortOptions = marketplaceSorts.map((s) => ({ value: s, label: t(`sort.${s}`) }));
  const applied = appliedCount(filters);

  return (
    <div className="flex gap-24">
      <aside aria-label={t('filters.label')} className="hidden w-310 shrink-0 desktop:block">
        <div className="sticky top-[calc(var(--spacing-r-nav-height)+24px)] max-h-[calc(100dvh-var(--spacing-r-nav-height)-48px)] overflow-y-auto rounded-card">
          <FilterPanel surface="card" filters={filters} onChange={update} onClearAll={clearAll} source={source} />
        </div>
      </aside>

      <div className="flex min-w-0 grow flex-col gap-16 tablet:gap-24">
        {/* Toolbar */}
        <div className="flex flex-col gap-16 tablet:flex-row tablet:items-end tablet:gap-24">
          <div className="flex min-w-0 grow flex-col gap-4">
            <p role="status" className="type-heading-h4 text-text-primary">
              <span className="tablet:hidden">{t('results.count', { count: mobileShown })}</span>
              <span className="hidden tablet:inline">{t('results.count', { count: pageCountShown })}</span>
            </p>
            <p className="type-body-caption text-text-muted">{t('results.meta')}</p>
          </div>
          <div className="flex items-center gap-12">
            <div className="flex desktop:hidden">
              <Button variant="outline" size="md" icon="filter" onClick={openDrawer} aria-haspopup="dialog">
                {t('filters.button', { count: applied })}
              </Button>
            </div>
            <SortSelect
              label={t('sort.label')}
              value={sort}
              onChange={(s) => setState({ ...state, sort: s, page: 1 })}
              options={sortOptions}
              className="min-w-0 grow tablet:grow-0"
              labelClassName="max-tablet:sr-only"
              selectClassName="max-tablet:grow"
            />
          </div>
        </div>

        {/* Applied filters (tablet / mobile) */}
        <AppliedFilters filters={filters} onChange={update} onClearAll={clearAll} locale={locale} source={source} />

        <TrustNote
          title={t('trust.title')}
          body={t('trust.body')}
          linkLabel={t('trust.link')}
          href={{ pathname: '/', hash: 'how-it-works' }}
        />

        {results.length === 0 ? (
          <EmptyState
            title={t('empty.title')}
            body={t('empty.body')}
            actions={
              <>
                <Button variant="primary" size="lg" onClick={clearAll}>
                  {t('empty.clear')}
                </Button>
                <ButtonLink href={accountLinks.signIn} variant="outline" size="lg">
                  {t('empty.alerts')}
                </ButtonLink>
              </>
            }
          />
        ) : (
          <>
            <ul
              aria-label={t('results.listLabel')}
              className="grid grid-cols-1 gap-16 tablet:grid-cols-2 tablet:gap-24"
            >
              {results.map((listing, i) => {
                const onPage = i >= pageStart && i < pageStart + PAGE_SIZE;
                const loaded = i < limit;
                return (
                  <li key={listing.slug} className={cn(!onPage && 'tablet:hidden', !loaded && 'max-tablet:hidden')}>
                    <MarketplaceFarmCard listing={listing} href={`/farms/${listing.slug}`} />
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col items-center gap-16 pt-24">
              <Pagination
                className="hidden tablet:flex"
                page={page}
                pageCount={pageCount}
                onPageChange={(p) => setState({ ...state, page: p })}
                label={t('pagination.label')}
                previousLabel={t('pagination.previous')}
                nextLabel={t('pagination.next')}
                pageLabel={(p) => t('pagination.page', { page: p })}
              />
              {limit < results.length && (
                <BlockButton
                  variant="outline"
                  className="tablet:hidden"
                  onClick={() => setMobile({ key: resultKey, limit: limit + MOBILE_STEP })}
                >
                  {t('results.loadMore')}
                </BlockButton>
              )}
              <p className="type-body-caption text-text-muted">
                <span className="tablet:hidden">{t('results.count', { count: mobileShown })}</span>
                <span className="hidden tablet:inline">{t('results.pageStatus', { count: pageCountShown, page })}</span>
              </p>
            </div>
          </>
        )}
      </div>

      <Sheet
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        side={drawer.side}
        title={t('filters.title')}
        description={t('filters.summary', { applied: appliedCount(drawer.draft), results: draftCount })}
        footer={
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDrawer((d) => ({ ...d, draft: { ...defaultFilters, purpose: d.draft.purpose } }))}
            >
              {t('filters.clearAll')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="grow"
              onClick={() => {
                update(drawer.draft);
                setDrawer((d) => ({ ...d, open: false }));
              }}
            >
              {t('filters.show', { count: draftCount })}
            </Button>
          </>
        }
      >
        <FilterPanel
          surface="plain"
          filters={drawer.draft}
          onChange={(draft) => setDrawer((d) => ({ ...d, draft }))}
          onClearAll={() => setDrawer((d) => ({ ...d, draft: { ...defaultFilters, purpose: d.draft.purpose } }))}
          source={source}
        />
      </Sheet>
    </div>
  );
}

/** Applied filters as chips (tablet and mobile). Transaction always shows; it changes in the drawer, not here. */
function AppliedFilters({
  filters: f,
  onChange,
  onClearAll,
  locale,
  source,
}: {
  filters: MarketplaceFilters;
  onChange: (f: MarketplaceFilters) => void;
  onClearAll: () => void;
  locale: 'en' | 'ar';
  source: FarmMarketplaceSource;
}) {
  const t = useTranslations('marketplace');
  const tc = useTranslations('farm.card');
  const tr = useTranslations('common.actions');

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (f.size[0] !== FARM_SIZE_RANGE.min || f.size[1] !== FARM_SIZE_RANGE.max)
    chips.push({
      key: 'size',
      label: t('filters.sizeRange', { min: f.size[0], max: f.size[1] }),
      remove: () => onChange({ ...f, size: [FARM_SIZE_RANGE.min, FARM_SIZE_RANGE.max] }),
    });
  for (const v of f.farmTypes)
    chips.push({
      key: `type-${v}`,
      label: t(`options.farmTypes.${v}`),
      remove: () => onChange({ ...f, farmTypes: f.farmTypes.filter((x) => x !== v) }),
    });
  if (f.governorate)
    chips.push({
      key: 'gov',
      label: t(`governorates.${f.governorate}`),
      remove: () => onChange({ ...f, governorate: null, area: null }),
    });
  if (f.area) {
    const area = source.all().find((l) => l.area.key === f.area)?.area.label[locale] ?? f.area;
    chips.push({ key: 'area', label: area, remove: () => onChange({ ...f, area: null }) });
  }
  for (const v of f.waterSources)
    chips.push({
      key: `water-${v}`,
      label: t(`options.waterSources.${v}`),
      remove: () => onChange({ ...f, waterSources: f.waterSources.filter((x) => x !== v) }),
    });
  for (const v of f.irrigationMethods)
    chips.push({
      key: `irrigation-${v}`,
      label: t(`options.irrigationMethods.${v}`),
      remove: () => onChange({ ...f, irrigationMethods: f.irrigationMethods.filter((x) => x !== v) }),
    });
  for (const v of f.energySources)
    chips.push({
      key: `energy-${v}`,
      label: t(`options.energySources.${v}`),
      remove: () => onChange({ ...f, energySources: f.energySources.filter((x) => x !== v) }),
    });
  for (const v of f.cropTypes)
    chips.push({
      key: `crop-${v}`,
      label: t(`options.cropTypes.${v}`),
      remove: () => onChange({ ...f, cropTypes: f.cropTypes.filter((x) => x !== v) }),
    });
  if (f.price[0] !== PRICE_RANGE.min || f.price[1] !== PRICE_RANGE.max)
    chips.push({
      key: 'price',
      label: t('filters.priceRange', { min: formatEgp(f.price[0]), max: formatEgp(f.price[1]) }),
      remove: () => onChange({ ...f, price: [PRICE_RANGE.min, PRICE_RANGE.max] }),
    });

  return (
    <div
      aria-label={t('filters.appliedLabel')}
      role="group"
      className="flex flex-wrap items-center gap-8 desktop:hidden"
    >
      <span className="inline-flex h-40 items-center rounded-md border border-border-selected bg-bg-selected px-18 type-label-button text-text-brand">
        {tc(`listing.${f.purpose}`)}
      </span>
      {chips.map((chip) => (
        <AppliedChip key={chip.key} removeLabel={tr('removeFilter', { label: chip.label })} onClick={chip.remove}>
          {chip.label}
        </AppliedChip>
      ))}
      {chips.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="px-4 type-label-small-strong text-text-brand hover:text-brand-primary-hover"
        >
          {t('filters.clearAll')}
        </button>
      )}
    </div>
  );
}

/** Listings come from the server (repository), so the client never imports the data adapter. */
export function MarketplaceResults({ listings }: { listings: MarketplaceListing[] }) {
  const [state, setState] = useMarketplaceState();
  return <MarketplaceResultsView state={state} setState={setState} listings={listings} />;
}

/** Prerendered default view (Suspense fallback until the URL params are read on the client). */
export function MarketplaceResultsStatic({ listings }: { listings: MarketplaceListing[] }) {
  return <MarketplaceResultsView state={defaultState} setState={() => {}} listings={listings} />;
}

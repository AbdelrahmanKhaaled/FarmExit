'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/Chip';
import { SortSelect } from '@/components/ui/SortSelect';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
import { FarmCard } from '@/features/farms/FarmCard';
import { homeLinks, type ListingType } from './data';
import { fetchPublicMarketplace, publicListingToMarketplaceListing } from '@/lib/data/marketplace-api';
import type { MarketplaceListing } from '@/lib/data/marketplace';
import { formatEgp } from '@/lib/format';

/*
 * Figma: Homepage › Section / Featured Farms — Section Header, toolbar (Filter Chips with live counts + Sort Select,
 * white, border/default, r16, padding 10), 3-column Farm Card grid (2 on tablet, 1 · 16 on mobile) and
 * "Browse farms" (Outline L). The Tablet/Mobile validation frames show no toolbar on mobile; it is kept on tablet,
 * where it fits the 944 column. Sorting by price compares within each listing type (sale totals vs rent per feddan).
 */
type Filter = 'all' | ListingType;
type Sort = 'newest' | 'priceAsc' | 'priceDesc';

const FILTERS: Filter[] = ['all', 'sale', 'rent'];
const SORTS: Sort[] = ['newest', 'priceAsc', 'priceDesc'];

export function FeaturedFarms() {
  const t = useTranslations('home.farms');
  const tc = useTranslations('farm.card');
  const tm = useTranslations('marketplace');
  const locale = useLocale() as 'en' | 'ar';

  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');

  const [counts, setCounts] = useState({ all: 0, sale: 0, rent: 0 });
  const [farms, setFarms] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all(
      ['sale', 'rent'].map((listingType) => fetchPublicMarketplace({ listingType, page: '1', pageSize: '1' })),
    )
      .then(([sale, rent]) => {
        if (active && sale && rent) setCounts({ all: sale.total + rent.total, sale: sale.total, rent: rent.total });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const query: Record<string, string> = { page: '1', pageSize: '6', sort };
    if (filter !== 'all') query.listingType = filter;
    void fetchPublicMarketplace(query)
      .then((data) => {
        if (!active) return;
        setFarms(data?.items.map(publicListingToMarketplaceListing) ?? []);
        setUnavailable(!data);
      })
      .catch(() => {
        if (active) {
          setFarms([]);
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, sort]);

  return (
    <section aria-labelledby="farms-title" className="py-r-section-gap">
      <Container className="flex flex-col">
        <SectionHeader eyebrow={t('eyebrow')} titleId="farms-title" title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-28 hidden items-center justify-between gap-16 rounded-2xl border border-border-default bg-bg-surface p-10 tablet:mt-40 tablet:flex">
          <div role="group" aria-label={t('filtersLabel')} className="flex gap-4">
            {FILTERS.map((f) => (
              <FilterChip key={f} active={filter === f} count={counts[f]} onClick={() => setFilter(f)}>
                {t(`filters.${f}`)}
              </FilterChip>
            ))}
          </div>
          <SortSelect
            label={t('sort.label')}
            value={sort}
            onChange={setSort}
            options={SORTS.map((s) => ({ value: s, label: t(`sort.${s}`) }))}
            className="px-14"
          />
        </div>

        {(loading || unavailable || farms.length === 0) && (
          <p role="status" className="mt-24 type-body-caption text-text-muted">
            {loading ? tm('results.loading') : unavailable ? tm('results.apiUnavailable') : tm('empty.title')}
          </p>
        )}
        <ul className="mt-28 grid grid-cols-1 gap-16 tablet:mt-24 tablet:grid-cols-2 tablet:gap-24 desktop:grid-cols-3">
          {farms.map((farm) => (
            <li key={farm.slug}>
              <FarmCard
                sizes="(min-width: 1280px) 366px, (min-width: 768px) 50vw, 100vw"
                farm={{
                  name: farm.name[locale],
                  listingLabel: tc(`listing.${farm.purpose}`),
                  location: tc('location', {
                    area: farm.area.label[locale],
                    governorate: farm.governorateDisplay?.[locale] ?? '',
                  }),
                  area: tc('areaValue', { count: farm.areaFeddan }),
                  crop: tc('notStated'),
                  water: tc('notStated'),
                  priceLabel: tc(`priceLabel.${farm.purpose}`),
                  price:
                    (farm.purpose === 'sale' ? farm.askingPrice : farm.annualRentPerFeddan) !== null
                      ? tc('price', {
                          amount: formatEgp((farm.purpose === 'sale' ? farm.askingPrice : farm.annualRentPerFeddan)!),
                        })
                      : tc('notStated'),
                  priceSub:
                    farm.purpose === 'rent'
                      ? tc('rentPerFeddan')
                      : farm.pricePerFeddan !== null
                        ? tc('pricePerFeddan', { amount: formatEgp(farm.pricePerFeddan) })
                        : tc('pricePerFeddanNotStated'),
                  imageAlt: farm.image.alt[locale],
                  image: farm.image,
                  illustrative: farm.image.isIllustrative,
                  score: farm.score,
                  href: `/farms/${farm.slug}`,
                  listingId: farm.listingId,
                }}
              />
            </li>
          ))}
        </ul>

        <div className="mt-48 flex justify-center">
          <ButtonLink href={homeLinks.farms} variant="outline" size="lg" arrow>
            {t('browse')}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

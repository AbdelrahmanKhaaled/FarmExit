'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/Chip';
import { SortSelect } from '@/components/ui/SortSelect';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
import { FarmCard } from '@/features/farms/FarmCard';
import { featuredFarms, homeLinks, type ListingType } from './data';

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

  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');

  const counts = useMemo(
    () => ({
      all: featuredFarms.length,
      sale: featuredFarms.filter((f) => f.listing === 'sale').length,
      rent: featuredFarms.filter((f) => f.listing === 'rent').length,
    }),
    [],
  );

  const farms = useMemo(() => {
    const list = featuredFarms.filter((f) => filter === 'all' || f.listing === filter);
    if (sort === 'newest') return list;
    const dir = sort === 'priceAsc' ? 1 : -1;
    return [...list].sort((a, b) =>
      a.listing === b.listing ? (a.priceValue - b.priceValue) * dir : a.listing === 'sale' ? -1 : 1,
    );
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

        <ul className="mt-28 grid grid-cols-1 gap-16 tablet:mt-24 tablet:grid-cols-2 tablet:gap-24 desktop:grid-cols-3">
          {farms.map((farm) => (
            <li key={farm.key}>
              <FarmCard
                sizes="(min-width: 1280px) 366px, (min-width: 768px) 50vw, 100vw"
                farm={{
                  name: t(`items.${farm.key}.name`),
                  listingLabel: tc(`listing.${farm.listing}`),
                  location: t(`items.${farm.key}.location`),
                  area: t(`items.${farm.key}.area`),
                  crop: t(`items.${farm.key}.crop`),
                  water: t(`items.${farm.key}.water`),
                  priceLabel: tc(`priceLabel.${farm.listing}`),
                  price: t(`items.${farm.key}.price`),
                  priceSub: t(`items.${farm.key}.priceSub`),
                  imageAlt: t(`items.${farm.key}.imageAlt`),
                  image: farm.image,
                  illustrative: farm.illustrative,
                  score: farm.score,
                  href: homeLinks.farmDetails(farm.key),
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PublicOpportunityEmpty } from '@/features/opportunities/PublicOpportunityEmpty';
import type { OpportunityFilters, PublicOpportunityList } from '@/lib/opportunities/public-opportunity';
import { filtersToSearchParams } from '@/lib/opportunities/public-opportunity';
import { FilterSidebar } from './FilterSidebar';
import { ManagementDetailDrawer } from './ManagementDetailDrawer';
import {
  formatFeddans,
  formatLocation,
  MediationBanner,
  OpportunityCardImage,
  OwnerCtaBanner,
  PaginationBar,
  VerifiedBadge,
} from './shared';
import './opportunity-marketplace.css';

type Props = {
  locale: string;
  initial: PublicOpportunityList;
  filters: OpportunityFilters;
};

export function ManagementMarketplace({ locale, initial, filters }: Props) {
  const t = useTranslations('opportunityMarketplace');
  const router = useRouter();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [selected, setSelected] = useState<(typeof initial.items)[number] | null>(null);

  function applyFilters(next: OpportunityFilters) {
    const qs = filtersToSearchParams(next).toString();
    router.push(qs ? `/management?${qs}` : '/management');
  }

  if (!initial.items.length) {
    return (
      <div className="om-grid">
        <PublicOpportunityEmpty kind="management" locale={locale} />
        <OwnerCtaBanner kind="management" />
      </div>
    );
  }

  const queryString = filtersToSearchParams(filters).toString();

  return (
    <div className="om-grid">
      <button
        type="button"
        className="tablet:hidden type-label-small-strong text-text-brand"
        onClick={() => setMobileFilters(true)}
      >
        {t('filters.openMobile')}
      </button>
      <div className="om-layout">
        <FilterSidebar
          kind="management"
          filters={filters}
          onChange={applyFilters}
          onClear={() => router.push('/management')}
          mobileOpen={mobileFilters}
          onCloseMobile={() => setMobileFilters(false)}
        />
        <div className="min-w-0">
          <div className="mb-16 flex flex-wrap items-end justify-between gap-12">
            <p className="type-body-caption text-text-muted">{t('results.count', { count: initial.total })}</p>
            <label className="flex items-center gap-8 type-label-caption">
              {t('sort.label')}
              <select
                className="rounded-lg border border-border-subtle px-10 py-8"
                value={filters.sort ?? 'newest'}
                onChange={(e) => applyFilters({ ...filters, sort: e.target.value as OpportunityFilters['sort'] })}
              >
                <option value="newest">{t('sort.newest')}</option>
                <option value="areaAsc">{t('sort.areaAsc')}</option>
                <option value="areaDesc">{t('sort.areaDesc')}</option>
              </select>
            </label>
          </div>
          <MediationBanner />
          <div className="om-card-grid mt-20">
            {initial.items.map((item) => (
              <article key={item.id} className="om-card relative">
                <div className="relative">
                  <OpportunityCardImage alt={item.farmName} />
                  <span className="om-card-badge">{t('badges.management')}</span>
                </div>
                <div className="flex flex-1 flex-col gap-10 p-16 pt-24">
                  <h2 className="type-label-large text-text-primary">{item.farmName}</h2>
                  <p className="type-body-caption text-text-muted">{formatLocation(item, locale)}</p>
                  <p className="type-body-caption">{formatFeddans(item.areaFeddan, locale, t('feddans'))}</p>
                  {item.mainActivity ? <p className="type-body-caption text-text-secondary">{item.mainActivity}</p> : null}
                  {item.managementTypes?.[0] ? (
                    <div className="om-highlight-box">{item.managementTypes[0]}</div>
                  ) : item.professionalNeed ? (
                    <div className="om-highlight-box">
                      {t(`professionalNeed.${item.professionalNeed}` as 'professionalNeed.farmManager')}
                    </div>
                  ) : null}
                  {item.experienceLevel ? (
                    <p className="type-label-caption text-text-muted">
                      {t('drawer.experience')}: {t(`experience.${item.experienceLevel}` as 'experience.entryLevel')}
                    </p>
                  ) : null}
                  <VerifiedBadge />
                  <button
                    type="button"
                    className="mt-auto w-full rounded-full border border-border-strong px-16 py-12 type-label-small-strong text-text-brand"
                    onClick={() => setSelected(item)}
                  >
                    {t('actions.viewManagement')}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <PaginationBar page={initial.page} pageSize={initial.pageSize} total={initial.total} basePath="/management" query={queryString} />
        </div>
      </div>
      <OwnerCtaBanner kind="management" />
      <ManagementDetailDrawer item={selected} locale={locale} onClose={() => setSelected(null)} />
    </div>
  );
}

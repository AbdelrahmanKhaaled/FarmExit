'use client';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type {
  OpportunityFilters,
  PublicOpportunityList,
  PublicOpportunity,
} from '@/lib/opportunities/public-opportunity';
import { filtersToSearchParams } from '@/lib/opportunities/public-opportunity';
import { FilterSidebar } from './FilterSidebar';
import { ManagementDetailDrawer } from './ManagementDetailDrawer';
import {
  OpportunityCardImage,
  OwnerCtaBanner,
  PaginationBar,
  VerifiedBadge,
  MediationBanner,
  formatLocation,
  formatFeddans,
} from './shared';
import { optionLabel } from './option-labels';
import './opportunity-marketplace.css';
export function OpportunityMarketplace({
  locale,
  initial,
  filters,
  kind,
  unavailable = false,
  initialSelected = null,
}: {
  locale: string;
  initial: PublicOpportunityList;
  filters: OpportunityFilters;
  kind: 'management' | 'partnerships';
  unavailable?: boolean;
  initialSelected?: PublicOpportunity | null;
}) {
  const t = useTranslations('opportunityMarketplace'),
    router = useRouter();
  const [mobile, setMobile] = useState(false),
    [selected, setSelected] = useState<PublicOpportunity | null>(initialSelected);
  const ar = locale === 'ar';
  const change = (next: OpportunityFilters) => {
    const q = filtersToSearchParams(next).toString();
    router.push('/' + kind + (q ? '?' + q : ''));
  };
  return (
    <div className="om-grid">
      <button type="button" className="om-mobile-filter-button" onClick={() => setMobile(true)}>
        {t('filters.openMobile')}
      </button>
      <div className="om-layout">
        <FilterSidebar
          kind={kind}
          filters={filters}
          options={initial.filterOptions}
          onChange={change}
          onClear={() => change({ page: 1 })}
          mobileOpen={mobile}
          onCloseMobile={() => setMobile(false)}
        />
        <div className="min-w-0">
          <div className="om-toolbar">
            <div>
              <h2>
                {unavailable
                  ? ar
                    ? 'البيانات غير متاحة'
                    : 'Data unavailable'
                  : t('results.count', { count: initial.total })}
              </h2>
              <p>{ar ? 'فرص تمت مراجعتها قبل النشر' : 'Opportunities reviewed before publishing'}</p>
            </div>
            <label>
              {t('sort.label')}
              <select
                value={filters.sort ?? 'newest'}
                onChange={(e) => change({ ...filters, page: 1, sort: e.target.value as OpportunityFilters['sort'] })}
              >
                {['newest', 'areaAsc', 'areaDesc'].map((v) => (
                  <option key={v} value={v}>
                    {t(('sort.' + v) as 'sort.newest')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <MediationBanner />
          {unavailable ? (
            <p role="status" className="om-empty">
              {ar ? 'تعذر تحديث النتائج. حاول مرة أخرى.' : 'Results could not be refreshed. Please try again.'}
            </p>
          ) : !initial.items.length ? (
            <p className="om-empty" role="status">
              {ar ? 'لا توجد فرص مطابقة. جرّب تغيير الفلاتر.' : 'No matching opportunities. Try changing the filters.'}
            </p>
          ) : (
            <div className="om-card-grid">
              {initial.items.map((item, index) => (
                <article className="om-card" key={item.id}>
                  <div className="om-card-image-wrap">
                    <OpportunityCardImage alt={item.farmName} kind={kind} index={index} />
                    <span className="om-card-badge">
                      ▦ {t(kind === 'management' ? 'badges.management' : 'badges.partnership')}
                    </span>
                  </div>
                  <div className="om-card-body">
                    {kind === 'partnerships' && (
                      <div className="om-highlight-box">
                        <p className="om-overline">♧ {ar ? 'الشراكة المطلوبة' : 'Partnership sought'}</p>
                        <h3>
                          {item.objective?.map((v) => optionLabel(v, locale)).join(' · ') ||
                            item.description ||
                            (ar ? 'فرصة شراكة' : 'Partnership opportunity')}
                        </h3>
                        {item.acceptedPartnerTypes?.length ? (
                          <p>♧ {item.acceptedPartnerTypes.map((v) => optionLabel(v, locale)).join(' · ')}</p>
                        ) : null}
                      </div>
                    )}
                    <h2 className="om-card-title">{item.farmName}</h2>
                    <p className="om-location">♧ {formatLocation(item, locale)}</p>
                    <div className="om-farm-facts">
                      <span>↗ {formatFeddans(item.areaFeddan, locale, t('feddans'))}</span>
                      {item.farmType && <span>♧ {t(('farmTypes.' + item.farmType) as 'farmTypes.vegetable')}</span>}
                    </div>
                    {kind === 'management' && (
                      <div className="om-highlight-box">
                        <p className="om-overline">♧ {ar ? 'الإدارة المطلوبة' : 'Management needed'}</p>
                        <h3>
                          {item.managementTypes?.length
                            ? item.managementTypes.map((v) => optionLabel(v, locale)).join(' · ')
                            : item.professionalNeed
                              ? t(('professionalNeed.' + item.professionalNeed) as 'professionalNeed.farmManager')
                              : ar
                                ? 'متطلبات الإدارة غير مذكورة'
                                : 'Management scope not stated'}
                        </h3>
                        {item.experienceLevel && (
                          <p>♧ {t(('experience.' + item.experienceLevel) as 'experience.experienced')}</p>
                        )}
                      </div>
                    )}
                    <VerifiedBadge />
                    {kind === 'management' ? (
                      <button type="button" className="om-primary-cta" onClick={() => setSelected(item)}>
                        {t('actions.viewManagement')} <span aria-hidden="true">→</span>
                      </button>
                    ) : (
                      <Link className="om-primary-cta" href={'/partnerships/opportunities/' + item.id}>
                        {t('actions.viewPartnership')} <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {!unavailable && (
            <PaginationBar
              page={initial.page}
              pageSize={initial.pageSize}
              total={initial.total}
              basePath={('/' + kind) as '/management' | '/partnerships'}
              query={filtersToSearchParams(filters).toString()}
            />
          )}
        </div>
      </div>
      <OwnerCtaBanner kind={kind} />
      {kind === 'management' && (
        <ManagementDetailDrawer
          item={selected}
          locale={locale}
          onClose={() => {
            setSelected(null);
            if (typeof window !== 'undefined' && window.location.search.includes('id=')) {
              const params = new URLSearchParams(window.location.search);
              params.delete('id');
              const qs = params.toString();
              window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
            }
          }}
        />
      )}
    </div>
  );
}

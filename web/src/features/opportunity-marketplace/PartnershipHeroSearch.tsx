'use client';
import type { FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { OpportunityFilters } from '@/lib/opportunities/public-opportunity';
import { filtersToSearchParams } from '@/lib/opportunities/public-opportunity';
import { optionLabel } from './option-labels';
import './opportunity-marketplace.css';
export function PartnershipHeroSearch({
  filters,
  options = {},
}: {
  filters: OpportunityFilters;
  options?: Record<string, string[]>;
}) {
  const t = useTranslations('opportunityMarketplace'),
    locale = useLocale(),
    router = useRouter();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const next = {
      ...filters,
      page: 1,
      governorate: String(d.get('governorate') || '') || undefined,
      farmType: String(d.get('farmType') || '') || undefined,
      minArea: d.get('minArea') ? Number(d.get('minArea')) : undefined,
      objective: String(d.get('objective') || '') || undefined,
    };
    router.push('/partnerships?' + filtersToSearchParams(next));
  }
  return (
    <form className="om-hero-search" onSubmit={submit} role="search" aria-label={t('hero.find')}>
      <label>
        {t('hero.location')}
        <select name="governorate" defaultValue={filters.governorate ?? ''}>
          <option value="">{t('filters.any')}</option>
          {(options.governorate ?? []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('filters.farmActivity')}
        <select name="farmType" defaultValue={filters.farmType ?? ''}>
          <option value="">{t('filters.any')}</option>
          {['vegetable', 'fruit', 'livestock', 'mixed'].map((v) => (
            <option key={v} value={v}>
              {t(('farmTypes.' + v) as 'farmTypes.vegetable')}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('filters.farmSize')}
        <input
          name="minArea"
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          placeholder={t('filters.any')}
          defaultValue={filters.minArea ?? ''}
        />
      </label>
      <label>
        {t('hero.objective')}
        <select name="objective" defaultValue={filters.objective ?? ''}>
          <option value="">{t('filters.any')}</option>
          {(options.objective ?? []).map((v) => (
            <option key={v} value={v}>
              {optionLabel(v, locale)}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">⌕ {t('hero.find')}</button>
    </form>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import type { OpportunityFilters } from '@/lib/opportunities/public-opportunity';
import { governorates } from '@/lib/data/marketplace';

type Props = {
  kind: 'management' | 'partnerships';
  filters: OpportunityFilters;
  onChange: (next: OpportunityFilters) => void;
  onClear: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

const FARM_TYPES = ['vegetable', 'fruit', 'livestock', 'mixed'] as const;
const EXPERIENCE = ['entryLevel', 'experienced', 'expert'] as const;
const PROFESSIONAL_NEEDS = ['farmManager', 'agriculturalEngineer', 'both'] as const;

export function FilterSidebar({ kind, filters, onChange, onClear, mobileOpen, onCloseMobile }: Props) {
  const t = useTranslations('opportunityMarketplace');
  const panelClass = `flex flex-col gap-20 rounded-card border border-border-hairline bg-bg-surface p-20 ${
    mobileOpen ? 'block' : 'hidden tablet:block'
  }`;

  function set<K extends keyof OpportunityFilters>(key: K, value: OpportunityFilters[K]) {
    onChange({ ...filters, page: 1, [key]: value });
  }

  return (
    <aside className={panelClass} aria-label={t('filters.label')}>
      {mobileOpen && onCloseMobile ? (
        <button type="button" className="self-end type-label-small-strong text-text-brand" onClick={onCloseMobile}>
          {t('filters.close')}
        </button>
      ) : null}
      <div>
        <h2 className="type-label-large text-text-primary">{t('filters.location')}</h2>
        <label className="mt-10 flex flex-col gap-6 type-label-caption">
          {t('filters.governorate')}
          <select
            className="rounded-lg border border-border-subtle px-12 py-10"
            value={filters.governorate ?? ''}
            onChange={(e) => set('governorate', e.target.value || undefined)}
          >
            <option value="">{t('filters.any')}</option>
            {governorates.map((g) => (
              <option key={g} value={t(`governorates.${g}`)}>
                {t(`governorates.${g}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-10 flex flex-col gap-6 type-label-caption">
          {t('filters.area')}
          <input
            className="rounded-lg border border-border-subtle px-12 py-10"
            value={filters.area ?? ''}
            onChange={(e) => set('area', e.target.value || undefined)}
          />
        </label>
      </div>

      <div>
        <h2 className="type-label-large text-text-primary">{t('filters.farmActivity')}</h2>
        <div className="mt-10 flex flex-col gap-8">
          {FARM_TYPES.map((ft) => (
            <label key={ft} className="flex items-center gap-8 type-body-caption">
              <input
                type="radio"
                name="farmType"
                checked={filters.farmType === ft}
                onChange={() => set('farmType', ft)}
              />
              {t(`farmTypes.${ft}`)}
            </label>
          ))}
          <button type="button" className="text-start type-label-caption text-text-brand" onClick={() => set('farmType', undefined)}>
            {t('filters.any')}
          </button>
        </div>
      </div>

      <div>
        <h2 className="type-label-large text-text-primary">{t('filters.farmSize')}</h2>
        <div className="mt-10 grid grid-cols-2 gap-10">
          <label className="flex flex-col gap-6 type-label-caption">
            {t('filters.minFeddans')}
            <input
              type="number"
              min={0}
              className="rounded-lg border border-border-subtle px-12 py-10"
              value={filters.minArea ?? ''}
              onChange={(e) => set('minArea', e.target.value ? Number(e.target.value) : undefined)}
            />
          </label>
          <label className="flex flex-col gap-6 type-label-caption">
            {t('filters.maxFeddans')}
            <input
              type="number"
              min={0}
              className="rounded-lg border border-border-subtle px-12 py-10"
              value={filters.maxArea ?? ''}
              onChange={(e) => set('maxArea', e.target.value ? Number(e.target.value) : undefined)}
            />
          </label>
        </div>
      </div>

      {kind === 'management' ? (
        <>
          <div>
            <h2 className="type-label-large text-text-primary">{t('filters.managementType')}</h2>
            <input
              className="mt-10 w-full rounded-lg border border-border-subtle px-12 py-10 type-body-caption"
              placeholder={t('filters.managementTypeHint')}
              value={filters.managementType ?? ''}
              onChange={(e) => set('managementType', e.target.value || undefined)}
            />
          </div>
          <div>
            <h2 className="type-label-large text-text-primary">{t('filters.experience')}</h2>
            <div className="mt-10 flex flex-col gap-8">
              {EXPERIENCE.map((level) => (
                <label key={level} className="flex items-center gap-8 type-body-caption">
                  <input
                    type="radio"
                    name="experience"
                    checked={filters.experienceLevel === level}
                    onChange={() => set('experienceLevel', level)}
                  />
                  {t(`experience.${level}`)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h2 className="type-label-large text-text-primary">{t('filters.professionalNeed')}</h2>
            <select
              className="mt-10 w-full rounded-lg border border-border-subtle px-12 py-10"
              value={filters.professionalNeed ?? ''}
              onChange={(e) => set('professionalNeed', e.target.value || undefined)}
            >
              <option value="">{t('filters.any')}</option>
              {PROFESSIONAL_NEEDS.map((n) => (
                <option key={n} value={n}>{t(`professionalNeed.${n}`)}</option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <>
          <div>
            <h2 className="type-label-large text-text-primary">{t('filters.objective')}</h2>
            <input
              className="mt-10 w-full rounded-lg border border-border-subtle px-12 py-10"
              value={filters.objective ?? ''}
              onChange={(e) => set('objective', e.target.value || undefined)}
            />
          </div>
          <div>
            <h2 className="type-label-large text-text-primary">{t('filters.partnerType')}</h2>
            <input
              className="mt-10 w-full rounded-lg border border-border-subtle px-12 py-10"
              value={filters.partnerType ?? ''}
              onChange={(e) => set('partnerType', e.target.value || undefined)}
            />
          </div>
        </>
      )}

      <button type="button" className="type-label-small-strong text-text-brand" onClick={onClear}>
        {t('filters.clearAll')}
      </button>
    </aside>
  );
}

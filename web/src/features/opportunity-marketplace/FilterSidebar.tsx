'use client';
import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { OpportunityFilters } from '@/lib/opportunities/public-opportunity';
import { FilterSection } from '@/features/marketplace/FilterPanel';
import { ChoiceOption } from '@/components/ui/ChoiceOption';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { optionLabel } from './option-labels';
type Props = {
  kind: 'management' | 'partnerships';
  filters: OpportunityFilters;
  options?: Record<string, string[]>;
  onChange: (next: OpportunityFilters) => void;
  onClear: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};
export function FilterSidebar({ kind, filters, options = {}, onChange, onClear, mobileOpen, onCloseMobile }: Props) {
  const t = useTranslations('opportunityMarketplace');
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (mobileOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mobileOpen]);
  const set = (key: keyof OpportunityFilters, value: string | number | undefined) =>
    onChange({ ...filters, page: 1, [key]: value });
  const choices = (key: 'managementType' | 'objective' | 'partnerType', title: string) => (
    <FilterSection title={title} gap="md">
      {(options[key] ?? []).map((v) => (
        <ChoiceOption
          key={v}
          type="checkbox"
          checked={filters[key] === v}
          onChange={() => set(key, filters[key] === v ? undefined : v)}
        >
          {optionLabel(v, locale)}
        </ChoiceOption>
      ))}
    </FilterSection>
  );
  const body = (
    <>
      <header className="flex items-center justify-between gap-12 pb-16">
        <h2 className="type-label-large">{t('filters.label')}</h2>
        <button type="button" onClick={onClear} className="type-label-small text-text-brand">
          {t('filters.clearAll')}
        </button>
      </header>
      <FilterSection title={t('filters.location')} gap="md">
        {(['governorate', 'area'] as const).map((key) => (
          <label className="om-field" key={key}>
            {t(('filters.' + key) as 'filters.area')}
            <select value={filters[key] ?? ''} onChange={(e) => set(key, e.target.value || undefined)}>
              <option value="">{t('filters.any')}</option>
              {(options[key] ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
      </FilterSection>
      <FilterSection title={t('filters.farmActivity')} gap="md">
        {['vegetable', 'fruit', 'livestock', 'mixed'].map((v) => (
          <ChoiceOption
            key={v}
            type="checkbox"
            checked={filters.farmType === v}
            onChange={() => set('farmType', filters.farmType === v ? undefined : v)}
          >
            {t(('farmTypes.' + v) as 'farmTypes.vegetable')}
          </ChoiceOption>
        ))}
      </FilterSection>
      <FilterSection title={t('filters.farmSize')} gap="sm">
        <RangeSlider
          min={0}
          max={500}
          step={1}
          value={[filters.minArea ?? 0, filters.maxArea ?? 500]}
          onChange={([min, max]) =>
            onChange({ ...filters, page: 1, minArea: min || undefined, maxArea: max === 500 ? undefined : max })
          }
          format={(v) => v + ' ' + t('feddans')}
          minCaption={t('filters.minFeddans')}
          maxCaption={t('filters.maxFeddans')}
          minLabel={t('filters.minFeddans')}
          maxLabel={t('filters.maxFeddans')}
        />
      </FilterSection>
      {kind === 'management' ? (
        <>
          {choices('managementType', t('filters.managementType'))}
          <FilterSection title={t('filters.experience')} gap="md">
            {['entryLevel', 'experienced', 'expert'].map((v) => (
              <ChoiceOption
                key={v}
                type="checkbox"
                checked={filters.experienceLevel === v}
                onChange={() => set('experienceLevel', filters.experienceLevel === v ? undefined : v)}
              >
                {t(('experience.' + v) as 'experience.experienced')}
              </ChoiceOption>
            ))}
          </FilterSection>
        </>
      ) : (
        <>
          {choices('objective', t('filters.objective'))}
          {choices('partnerType', t('filters.partnerType'))}
        </>
      )}
    </>
  );
  return (
    <>
      <aside className="om-filter-desktop om-filter" aria-label={t('filters.label')}>
        {body}
      </aside>
      <dialog
        ref={dialog}
        className="om-filter-dialog"
        onCancel={onCloseMobile}
        onClick={(e) => {
          if (e.target === e.currentTarget) onCloseMobile?.();
        }}
      >
        <div className="om-filter">
          <button type="button" onClick={onCloseMobile} className="mb-16">
            {t('filters.close')} ×
          </button>
          {mobileOpen ? body : null}
        </div>
      </dialog>
    </>
  );
}

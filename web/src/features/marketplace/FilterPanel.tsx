'use client';

import { useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';
import { ChoiceOption } from '@/components/ui/ChoiceOption';
import { Select } from '@/components/ui/Field';
import { RangeSlider } from '@/components/ui/RangeSlider';
import {
  cropTypes,
  energySources,
  farmTypes,
  irrigationMethods,
  listingPurposes,
  waterSources,
} from '@/lib/domain/enums';
import {
  areaOptions,
  FARM_SIZE_RANGE,
  governorates,
  PRICE_RANGE,
  type FarmMarketplaceSource,
  type GovernorateKey,
  type MarketplaceFilters,
} from '@/lib/data/marketplace';
import { saleLabels, assets } from '@/features/my-farms/SaleTermsEditor';
import { formatEgp } from '@/lib/format';

/*
 * Figma: Components → Group / Marketplace Filters → Filter Panel (Surface = Card · Plain, Market = Farms).
 * Final order (Source of Truth 4o / 6 Oct): Transaction → Farm size → Farm type → Location (Governorate, Area) →
 * Water source → Irrigation method → Energy source → Crop type → Price range. No FarmExit Score; option counts hidden.
 * Card: white, hairline, Premium Rest, r24, padding 24/24/8 with a "Filters" (Heading/Row Title) + Clear all header.
 * Plain: the same sections inside the Filter Drawer. Each section has a border/subtle top rule, padding 20 and a
 * collapsible Label/Medium header.
 */
type Props = {
  filters: MarketplaceFilters;
  onChange: (filters: MarketplaceFilters) => void;
  onClearAll: () => void;
  source: FarmMarketplaceSource;
  surface: 'card' | 'plain';
  className?: string;
};

function Section({ title, children, gap }: { title: string; children: ReactNode; gap: 'none' | 'sm' | 'md' }) {
  const t = useTranslations('marketplace.filters');
  const [open, setOpen] = useState(true);
  return (
    <section className="border-t border-border-subtle py-20">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t('toggleSection', { section: title })}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-8 pb-4 text-start"
      >
        <span className="type-label-medium text-text-primary">{title}</span>
        <Icon
          name="chevron-down"
          size={16}
          className={cn('text-text-primary transition-transform duration-150', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className={cn('flex flex-col', gap === 'sm' && 'mt-12', gap === 'md' && 'mt-14 gap-14')}>{children}</div>
      )}
    </section>
  );
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export function FilterPanel({ filters: f, onChange, onClearAll, source, surface, className }: Props) {
  const t = useTranslations('marketplace');
  const locale = useLocale() as 'en' | 'ar';
  const set = (patch: Partial<MarketplaceFilters>) => onChange({ ...f, ...patch });
  const sc = saleLabels[locale];
  const areas = areaOptions(source, f.governorate);

  const checkboxes = <K extends string>(
    values: readonly K[],
    selected: K[],
    key: 'farmTypes' | 'waterSources' | 'irrigationMethods' | 'energySources' | 'cropTypes',
    labels: string,
  ) =>
    values.map((value) => (
      <ChoiceOption
        key={value}
        type="checkbox"
        checked={selected.includes(value)}
        onChange={() => set({ [key]: toggle(selected, value) } as Partial<MarketplaceFilters>)}
      >
        {t(`options.${labels}.${value}` as 'options.farmTypes.vegetable')}
      </ChoiceOption>
    ));

  const body = (
    <>
      <Section title={t('filters.sections.transaction')} gap="none">
        {listingPurposes.map((purpose) => (
          <ChoiceOption
            key={purpose}
            type="radio"
            name={`purpose-${surface}`}
            checked={f.purpose === purpose}
            onChange={() => set({ purpose })}
          >
            {t(`options.purpose.${purpose}`)}
          </ChoiceOption>
        ))}
      </Section>

      <Section title={t('filters.sections.size')} gap="sm">
        <RangeSlider
          {...FARM_SIZE_RANGE}
          value={f.size}
          onChange={(size) => set({ size })}
          format={(value) => t('filters.sizeValue', { value })}
          minCaption={t('filters.min')}
          maxCaption={t('filters.max')}
          minLabel={t('filters.minFor', { section: t('filters.sections.size') })}
          maxLabel={t('filters.maxFor', { section: t('filters.sections.size') })}
        />
      </Section>

      <Section title={t('filters.sections.farmType')} gap="none">
        {checkboxes(farmTypes, f.farmTypes, 'farmTypes', 'farmTypes')}
      </Section>

      <Section title={t('filters.sections.location')} gap="md">
        <Select
          fieldStyle="filter"
          label={t('filters.governorate.label')}
          value={f.governorate ?? ''}
          onChange={(e) => set({ governorate: (e.target.value || null) as GovernorateKey | null, area: null })}
        >
          <option value="">{t('filters.governorate.any')}</option>
          {governorates.map((g) => (
            <option key={g} value={g}>
              {t(`governorates.${g}`)}
            </option>
          ))}
        </Select>
        <Select
          fieldStyle="filter"
          label={t('filters.area.label')}
          value={f.area ?? ''}
          onChange={(e) => set({ area: e.target.value || null })}
        >
          <option value="">{t('filters.area.any')}</option>
          {areas.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label[locale]}
            </option>
          ))}
        </Select>
      </Section>

      <Section title={sc.title} gap="none">
        {(['installment', 'exchange'] as const).map((value) => (
          <ChoiceOption
            key={value}
            type="checkbox"
            checked={(f.saleMethods ?? []).includes(value)}
            onChange={() => set({ saleMethods: toggle(f.saleMethods ?? [], value) })}
          >
            {value === 'installment'
              ? locale === 'ar'
                ? 'تقسيط'
                : 'Installments'
              : locale === 'ar'
                ? 'استبدال'
                : 'Exchange'}
          </ChoiceOption>
        ))}
        {assets.map((value, i) => (
          <ChoiceOption
            key={value}
            type="checkbox"
            checked={(f.exchangeAssetTypes ?? []).includes(value)}
            onChange={() => set({ exchangeAssetTypes: toggle(f.exchangeAssetTypes ?? [], value) })}
          >
            {sc.assets[i]}
          </ChoiceOption>
        ))}
      </Section>
      <Section title={t('filters.sections.water')} gap="none">
        {checkboxes(waterSources, f.waterSources, 'waterSources', 'waterSources')}
      </Section>

      <Section title={t('filters.sections.irrigation')} gap="none">
        {checkboxes(irrigationMethods, f.irrigationMethods, 'irrigationMethods', 'irrigationMethods')}
      </Section>

      <Section title={t('filters.sections.energy')} gap="none">
        {checkboxes(energySources, f.energySources, 'energySources', 'energySources')}
      </Section>

      <Section title={t('filters.sections.crop')} gap="none">
        {checkboxes(cropTypes, f.cropTypes, 'cropTypes', 'cropTypes')}
      </Section>

      <Section title={t('filters.sections.price')} gap="sm">
        <RangeSlider
          {...PRICE_RANGE}
          value={f.price}
          onChange={(price) => set({ price })}
          format={(value) => t('filters.priceValue', { value: formatEgp(value) })}
          minCaption={t('filters.min')}
          maxCaption={t('filters.max')}
          minLabel={t('filters.minFor', { section: t('filters.sections.price') })}
          maxLabel={t('filters.maxFor', { section: t('filters.sections.price') })}
        />
      </Section>
    </>
  );

  if (surface === 'plain') return <div className={className}>{body}</div>;

  return (
    <div
      className={cn(
        'rounded-card border border-border-hairline bg-bg-surface px-24 pt-24 pb-8 shadow-premium-rest',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-8 pb-4">
        <h2 className="type-heading-row-title text-text-primary">{t('filters.title')}</h2>
        <button
          type="button"
          onClick={onClearAll}
          className="type-label-small-strong text-text-brand transition-colors duration-150 hover:text-brand-primary-hover"
        >
          {t('filters.clearAll')}
        </button>
      </div>
      {body}
    </div>
  );
}

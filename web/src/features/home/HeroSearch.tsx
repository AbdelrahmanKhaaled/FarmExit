'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { SearchField, SearchPanel, SearchSubmit, SearchTabs } from '@/features/search/SearchBar';
import { FARM_SIZE_RANGE, PRICE_RANGE } from '@/lib/data/marketplace';
import { useLocale } from 'next-intl';
import { homeLinks, searchOptions } from './data';

/*
 * Homepage hero Search Bar (Mode = Buy / Rent / Management). Management mode swaps Budget for Scope and the CTA
 * label. Submitting opens the Marketplace (or Management) with the chosen values as search params; Area, Budget and
 * Scope options arrive with their filters (Business/content validation required for the option lists).
 */
type Mode = 'buy' | 'rent' | 'management';
const MODES: Mode[] = ['buy', 'rent', 'management'];

export function HeroSearch() {
  const ar = useLocale() === 'ar';
  const t = useTranslations('home.hero.search');
  const to = useTranslations('home.options');
  const filters = useTranslations('marketplace.filters');
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('buy');
  const management = mode === 'management';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query: Record<string, string> = {};
    for (const [key, value] of new FormData(event.currentTarget)) if (value) query[key] = String(value);
    if (management) router.push({ pathname: homeLinks.management });
    else
      router.push({ pathname: homeLinks.farms, query: { ...(mode === 'rent' ? { listing: 'rent' } : {}), ...query } });
  }

  return (
    <form role="search" aria-label={t('label')} onSubmit={onSubmit} className="flex flex-col">
      <SearchTabs
        label={t('modesLabel')}
        value={mode}
        onChange={setMode}
        options={MODES.map((m) => ({ value: m, label: t(`modes.${m}`) }))}
      />
      <SearchPanel>
        <SearchField label={t('location.label')} name="location" defaultValue="" disabled={management}>
          <option value="">{t('location.any')}</option>
          {searchOptions.governorates.map((g) => (
            <option key={g} value={g}>
              {to(`governorates.${g}`)}
            </option>
          ))}
        </SearchField>
        <SearchField
          label={t('activity.label')}
          name="activity"
          defaultValue=""
          disabled
          title={filters('unavailableSection')}
        >
          <option value="">{filters('unavailableSection')}</option>
        </SearchField>
        <HeroRange
          label={`${t('area.label')} (${ar ? 'فدان' : 'feddans'})`}
          prefix="size"
          bounds={FARM_SIZE_RANGE}
          ar={ar}
          disabled={management}
        />
        {management ? (
          <SearchField key="scope" label={t('scope.label')} name="scope" defaultValue="" disabled>
            <option value="">{t('scope.any')}</option>
          </SearchField>
        ) : (
          <HeroRange
            label={`${t('budget.label')} (${ar ? 'جنيه' : 'EGP'})`}
            prefix="price"
            bounds={PRICE_RANGE}
            ar={ar}
          />
        )}
        <SearchSubmit>{management ? t('submit.requests') : t('submit.farms')}</SearchSubmit>
      </SearchPanel>
    </form>
  );
}

function HeroRange({
  label,
  prefix,
  bounds,
  ar,
  disabled = false,
}: {
  label: string;
  prefix: string;
  bounds: { min: number; max: number; step: number };
  ar: boolean;
  disabled?: boolean;
}) {
  const [min, setMin] = useState('');
  return (
    <fieldset
      disabled={disabled}
      className="flex min-w-0 flex-col gap-6 rounded-xl bg-bg-surface px-18 py-14 desktop:flex-1"
    >
      <legend className="sr-only">{label}</legend>
      <span aria-hidden="true" className="type-overline-field text-text-muted">
        {label}
      </span>
      <div className="flex min-w-0 gap-8">
        <input
          aria-label={label + (ar ? ' من' : ' minimum')}
          name={prefix + 'Min'}
          type="number"
          min={bounds.min}
          max={bounds.max}
          step="any"
          placeholder={ar ? 'من' : 'From'}
          onChange={(event) => setMin(event.target.value)}
          className="w-full min-w-0 bg-transparent type-label-medium"
        />
        <span aria-hidden="true">–</span>
        <input
          aria-label={label + (ar ? ' إلى' : ' maximum')}
          name={prefix + 'Max'}
          type="number"
          min={min || bounds.min}
          max={bounds.max}
          step="any"
          placeholder={ar ? 'إلى' : 'To'}
          className="w-full min-w-0 bg-transparent type-label-medium"
        />
      </div>
    </fieldset>
  );
}

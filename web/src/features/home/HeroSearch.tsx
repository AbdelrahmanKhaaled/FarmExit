'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { SearchField, SearchPanel, SearchSubmit, SearchTabs } from '@/features/search/SearchBar';
import { FARM_SIZE_RANGE, PRICE_RANGE, governorates } from '@/lib/data/marketplace';
import { useLocale } from 'next-intl';
import { SearchRange } from '@/features/search/SearchRange';
import { managementTypes } from '@/lib/domain/enums';
import { GOVERNORATE_API_LABEL } from '@/lib/data/marketplace-api';
import { homeLinks } from './data';

/*
 * Homepage hero Search Bar (Mode = Buy / Rent / Management). Management mode swaps Budget for Scope and the CTA
 * label. Submitting opens the Marketplace (or Management) with the chosen values as search params; Area, Budget and
 * Scope options arrive with their filters (Business/content validation required for the option lists).
 */
type Mode = 'buy' | 'rent' | 'management' | 'quickSale';
const MODES: Mode[] = ['buy', 'rent', 'management', 'quickSale'];

export function HeroSearch() {
  const ar = useLocale() === 'ar';
  const t = useTranslations('home.hero.search');
  const filters = useTranslations('marketplace');
  const router = useRouter();
  const managementLabels = useTranslations('workspace.management.managementTypeLabels');
  const [mode, setMode] = useState<Mode>('buy');
  const management = mode === 'management';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query: Record<string, string> = {};
    for (const [key, value] of new FormData(event.currentTarget)) if (value) query[key] = String(value);
    if (management) {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(query))
        mapped[
          (
            { location: 'governorate', activity: 'farmType', sizeMin: 'minArea', sizeMax: 'maxArea' } as Record<
              string,
              string
            >
          )[key] ?? key
        ] = value;
      router.push({ pathname: homeLinks.management, query: mapped });
    } else
      router.push({
        pathname: homeLinks.farms,
        query: {
          ...(mode === 'rent' ? { listing: 'rent' } : {}),
          ...(mode === 'quickSale' ? { quickSale: 'true' } : {}),
          ...query,
        },
      });
  }

  return (
    <form role="search" aria-label={t('label')} onSubmit={onSubmit} className="flex flex-col">
      <SearchTabs
        label={t('modesLabel')}
        value={mode}
        onChange={setMode}
        options={MODES.map((m) => ({
          value: m,
          label: m === 'quickSale' ? (ar ? 'بيع سريع' : 'Quick Sale') : t(`modes.${m}`),
        }))}
      />
      <SearchPanel>
        <SearchField label={t('location.label')} name="location" defaultValue="">
          <option value="">{t('location.any')}</option>
          {governorates.map((g) => (
            <option key={g} value={management ? GOVERNORATE_API_LABEL[g] : g}>
              {filters(`governorates.${g}`)}
            </option>
          ))}
        </SearchField>
        <SearchField label={t('activity.label')} name="activity" defaultValue="">
          <option value="">{ar ? 'كل الأنشطة' : 'All activities'}</option>
          {['vegetable', 'fruit', 'livestock', 'mixed'].map((v) => (
            <option key={v} value={v}>
              {filters(`options.farmTypes.${v}` as 'options.farmTypes.vegetable')}
            </option>
          ))}
        </SearchField>
        <SearchRange
          label={`${t('area.label')} (${ar ? 'فدان' : 'feddans'})`}
          prefix="size"
          bounds={FARM_SIZE_RANGE}
          ar={ar}
        />
        {management ? (
          <SearchField key="scope" label={t('scope.label')} name="managementType" defaultValue="">
            <option value="">{t('scope.any')}</option>
            {managementTypes.map((v) => (
              <option key={v} value={v}>
                {managementLabels(v)}
              </option>
            ))}
          </SearchField>
        ) : (
          <SearchRange
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

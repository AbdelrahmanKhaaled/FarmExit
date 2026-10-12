'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { SearchField, SearchPanel, SearchSubmit, SearchTabs } from '@/features/search/SearchBar';
import { homeLinks, searchOptions } from './data';

/*
 * Homepage hero Search Bar (Mode = Buy / Rent / Management). Management mode swaps Budget for Scope and the CTA
 * label. Submitting opens the Marketplace (or Management) with the chosen values as search params; Area, Budget and
 * Scope options arrive with their filters (Business/content validation required for the option lists).
 */
type Mode = 'buy' | 'rent' | 'management';
const MODES: Mode[] = ['buy', 'rent', 'management'];

export function HeroSearch() {
  const t = useTranslations('home.hero.search');
  const to = useTranslations('home.options');
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('buy');
  const management = mode === 'management';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query: Record<string, string> = {};
    for (const [key, value] of new FormData(event.currentTarget)) if (value) query[key] = String(value);
    if (management) router.push({ pathname: homeLinks.management, query });
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
        <SearchField label={t('location.label')} name="location" defaultValue="">
          <option value="">{t('location.any')}</option>
          {searchOptions.governorates.map((g) => (
            <option key={g} value={g}>
              {to(`governorates.${g}`)}
            </option>
          ))}
        </SearchField>
        <SearchField label={t('activity.label')} name="activity" defaultValue="">
          <option value="">{t('activity.any')}</option>
          {searchOptions.activities.map((a) => (
            <option key={a} value={a}>
              {to(`activities.${a}`)}
            </option>
          ))}
        </SearchField>
        <SearchField label={t('area.label')} name="area" defaultValue="">
          <option value="">{t('area.any')}</option>
        </SearchField>
        {management ? (
          <SearchField key="scope" label={t('scope.label')} name="scope" defaultValue="">
            <option value="">{t('scope.any')}</option>
          </SearchField>
        ) : (
          <SearchField key="budget" label={t('budget.label')} name="budget" defaultValue="">
            <option value="">{t('budget.any')}</option>
          </SearchField>
        )}
        <SearchSubmit>{management ? t('submit.requests') : t('submit.farms')}</SearchSubmit>
      </SearchPanel>
    </form>
  );
}

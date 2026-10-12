'use client';

import type { FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { farmTypes, listingPurposes, type FarmType } from '@/lib/domain/enums';
import { governorates, type GovernorateKey } from '@/lib/data/marketplace';
import { SearchField, SearchPanel, SearchSubmit, SearchTabs } from '@/features/search/SearchBar';
import { defaultState, type MarketplaceState } from './url-state';
import { useMarketplaceState } from './use-marketplace-state';

/*
 * Figma: Marketplace Header › Search Bar (Mode = Buy, Layout = Row · Grid · Stacked): Buy / Rent tabs + Location,
 * Farm type, Area, Price range + Search farms. The tabs switch the listing purpose at once; the fields apply on
 * Search. Area and Price range are refined with the sidebar sliders; their quick options are not defined
 * (Business/content validation required), so these two keep their "Any" value.
 */
export function MarketplaceSearchView({
  state,
  setState,
}: {
  state: MarketplaceState;
  setState: (state: MarketplaceState) => void;
}) {
  const t = useTranslations('marketplace');
  const f = state.filters;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const gov = (data.get('gov') as GovernorateKey | '') || null;
    const type = (data.get('type') as FarmType | '') || null;
    setState({
      ...state,
      page: 1,
      filters: {
        ...f,
        governorate: gov,
        area: gov === f.governorate ? f.area : null,
        farmTypes: type ? [type] : [],
      },
    });
  }

  return (
    <form
      role="search"
      aria-label={t('search.label')}
      onSubmit={onSubmit}
      className="flex flex-col"
      // Remount when the applied values change so the uncontrolled selects show them.
      key={`${f.governorate}-${f.farmTypes.join()}`}
    >
      <SearchTabs
        label={t('search.modesLabel')}
        value={f.purpose}
        onChange={(purpose) => setState({ ...state, page: 1, filters: { ...f, purpose } })}
        options={listingPurposes.map((p) => ({ value: p, label: t(`options.purpose.${p}`) }))}
      />
      <SearchPanel>
        <SearchField label={t('search.location.label')} name="gov" defaultValue={f.governorate ?? ''}>
          <option value="">{t('search.location.any')}</option>
          {governorates.map((g) => (
            <option key={g} value={g}>
              {t(`governorates.${g}`)}
            </option>
          ))}
        </SearchField>
        <SearchField
          label={t('search.farmType.label')}
          name="type"
          defaultValue={f.farmTypes.length === 1 ? f.farmTypes[0] : ''}
        >
          <option value="">{t('search.farmType.any')}</option>
          {farmTypes.map((type) => (
            <option key={type} value={type}>
              {t(`options.farmTypes.${type}`)}
            </option>
          ))}
        </SearchField>
        <SearchField label={t('search.area.label')} name="size" defaultValue="">
          <option value="">{t('search.area.any')}</option>
        </SearchField>
        <SearchField label={t('search.price.label')} name="price" defaultValue="">
          <option value="">{t('search.price.any')}</option>
        </SearchField>
        <SearchSubmit>{t('search.submit')}</SearchSubmit>
      </SearchPanel>
    </form>
  );
}

export function MarketplaceSearch() {
  const [state, setState] = useMarketplaceState();
  return <MarketplaceSearchView state={state} setState={setState} />;
}

/** Prerendered default view (Suspense fallback until the URL params are read on the client). */
export function MarketplaceSearchStatic() {
  return <MarketplaceSearchView state={defaultState} setState={() => {}} />;
}

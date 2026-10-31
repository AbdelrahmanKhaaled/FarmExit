'use client';
import { SearchRange } from '@/features/search/SearchRange';
import { useLocale } from 'next-intl';
import { FARM_SIZE_RANGE, PRICE_RANGE } from '@/lib/data/marketplace';
import { farmTypes, type FarmType } from '@/lib/domain/enums';

import type { FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { listingPurposes } from '@/lib/domain/enums';
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
  const ar = useLocale() === 'ar';
  const f = state.filters;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const gov = (data.get('gov') as GovernorateKey | '') || null;
    setState({
      ...state,
      page: 1,
      filters: {
        ...f,
        governorate: gov,
        area: gov === f.governorate ? f.area : null,
        farmTypes: data.get('farmType') ? [String(data.get('farmType')) as FarmType] : [],
        size: [Number(data.get('sizeMin') || FARM_SIZE_RANGE.min), Number(data.get('sizeMax') || FARM_SIZE_RANGE.max)],
        price: [Number(data.get('priceMin') || PRICE_RANGE.min), Number(data.get('priceMax') || PRICE_RANGE.max)],
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
      key={JSON.stringify([f.governorate, f.purpose, f.farmTypes, f.size, f.price])}
    >
      <SearchTabs
        label={t('search.modesLabel')}
        value={f.purpose}
        onChange={(purpose) =>
          setState({
            ...state,
            page: 1,
            filters: {
              ...f,
              purpose,
              ...(purpose === 'rent' ? { quickSale: false, saleMethods: [], exchangeAssetTypes: [] } : {}),
            },
          })
        }
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
        <SearchField label={t('search.farmType.label')} name="farmType" defaultValue={f.farmTypes[0] ?? ''}>
          <option value="">{ar ? 'كل الأنشطة' : 'All activities'}</option>
          {farmTypes.map((v) => (
            <option key={v} value={v}>
              {t(`options.farmTypes.${v}`)}
            </option>
          ))}
        </SearchField>
        <SearchRange
          label={t('search.area.label')}
          prefix="size"
          bounds={FARM_SIZE_RANGE}
          ar={ar}
          value={[
            f.size[0] === FARM_SIZE_RANGE.min ? undefined : f.size[0],
            f.size[1] === FARM_SIZE_RANGE.max ? undefined : f.size[1],
          ]}
        />
        <SearchRange
          label={t('search.price.label')}
          prefix="price"
          bounds={PRICE_RANGE}
          ar={ar}
          value={[
            f.price[0] === PRICE_RANGE.min ? undefined : f.price[0],
            f.price[1] === PRICE_RANGE.max ? undefined : f.price[1],
          ]}
        />
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

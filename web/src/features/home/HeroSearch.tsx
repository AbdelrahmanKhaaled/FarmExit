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
import { useSearchParams } from 'next/navigation';
import { PartnershipHeroSearch } from '@/features/opportunity-marketplace/PartnershipHeroSearch';
import { QuickBuyFields } from './QuickBuyFields';

const MODES = ['quickBuy', 'buy', 'quickSale', 'standardSale', 'rent', 'partnership', 'management'] as const;
type Mode = (typeof MODES)[number];

export function HeroSearch({ partnershipOptions }: { partnershipOptions?: Record<string, string[]> }) {
  const ar = useLocale() === 'ar';
  const t = useTranslations('home.hero.search');
  const filters = useTranslations('marketplace');
  const router = useRouter();
  const managementLabels = useTranslations('workspace.management.managementTypeLabels');
  const params = useSearchParams();
  const selected = params.get('heroTab');
  const mode: Mode = MODES.includes(selected as Mode) ? (selected as Mode) : 'quickBuy';
  const [exchange, setExchange] = useState<string[]>([]);
  const setMode = (next: Mode) => {
    const query = new URLSearchParams(window.location.search);
    query.set('heroTab', next);
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
  };
  const management = mode === 'management';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query: Record<string, string> = {};
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (value)
        query[key] =
          mode === 'quickBuy' &&
          (key === 'availableCash' || key === 'installmentAmount' || key.startsWith('assetValue_'))
            ? String(Number(value))
            : String(value);
    }
    if (mode === 'quickSale' || mode === 'standardSale' || mode === 'rent') {
      router.push({ pathname: '/my/farms/new', query: { entryMode: mode } });
      return;
    }
    if (mode === 'quickBuy') {
      query.buyIntent = 'quickBuy';
      query.exchangeItems = exchange.join(',');
      const supportedAssets = exchange.filter((value) => ['factory', 'villa', 'car', 'apartment'].includes(value));
      const methods = [
        Number(query.installmentAmount) > 0 ? 'installment' : '',
        supportedAssets.length ? 'exchange' : '',
      ].filter(Boolean);
      if (methods.length) query.saleMethods = methods.join(',');
      if (supportedAssets.length) query.exchangeAssetTypes = supportedAssets.join(',');
    }
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
          ...query,
        },
      });
  }

  return (
    <div data-testid="hero-search">
      <form role="search" aria-label={t('label')} onSubmit={onSubmit} className="flex flex-col">
        <SearchTabs
          label={t('modesLabel')}
          value={mode}
          onChange={setMode}
          options={MODES.map((m) => ({
            value: m,
            label: t(`modes.${m}`),
          }))}
        />
        {mode === 'partnership' ? null : mode === 'quickBuy' ? (
          <div className="rounded-3xl rounded-ss-none bg-overlay-glass-light">
            <SearchPanel className="desktop:items-start">
              <QuickBuyFields selected={exchange} onChange={setExchange} />
              <SearchSubmit className="desktop:py-24">{t('submit.farms')}</SearchSubmit>
            </SearchPanel>
            <p className="px-16 py-12 type-body-caption text-text-primary">{t('criteriaOnly')}</p>
          </div>
        ) : ['quickSale', 'standardSale', 'rent'].includes(mode) ? (
          <SearchPanel>
            <p className="flex-1 rounded-xl bg-bg-surface p-20 text-text-primary">
              {t(`entry.${mode as 'quickSale' | 'standardSale' | 'rent'}`)}
            </p>
            <SearchSubmit>{t('startListing')}</SearchSubmit>
          </SearchPanel>
        ) : (
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
        )}
      </form>
      {mode === 'partnership' && <PartnershipHeroSearch filters={{ page: 1 }} options={partnershipOptions} />}
    </div>
  );
}

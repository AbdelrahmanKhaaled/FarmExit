'use client';

import { type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { OpportunityFilters } from '@/lib/opportunities/public-opportunity';
import { filtersToSearchParams } from '@/lib/opportunities/public-opportunity';
import './opportunity-marketplace.css';

export function PartnershipHeroSearch({ filters }: { filters: OpportunityFilters }) {
  const t = useTranslations('opportunityMarketplace');
  const router = useRouter();

  function onHeroSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: OpportunityFilters = {
      ...filters,
      page: 1,
      governorate: String(data.get('governorate') || '') || undefined,
      farmType: String(data.get('farmType') || '') || undefined,
      minArea: data.get('minArea') ? Number(data.get('minArea')) : undefined,
      objective: String(data.get('objective') || '') || undefined,
    };
    const qs = filtersToSearchParams(next).toString();
    router.push(qs ? `/partnerships?${qs}` : '/partnerships');
  }

  return (
    <form className="om-hero-search grid gap-12 tablet:grid-cols-5" onSubmit={onHeroSearch} role="search">
      <input name="governorate" placeholder={t('hero.location')} className="rounded-lg px-12 py-10" defaultValue={filters.governorate ?? ''} />
      <select name="farmType" className="rounded-lg px-12 py-10" defaultValue={filters.farmType ?? ''}>
        <option value="">{t('filters.any')}</option>
        <option value="vegetable">{t('farmTypes.vegetable')}</option>
        <option value="fruit">{t('farmTypes.fruit')}</option>
        <option value="livestock">{t('farmTypes.livestock')}</option>
        <option value="mixed">{t('farmTypes.mixed')}</option>
      </select>
      <input name="minArea" type="number" placeholder={t('hero.minFeddans')} className="rounded-lg px-12 py-10" defaultValue={filters.minArea ?? ''} />
      <input name="objective" placeholder={t('hero.objective')} className="rounded-lg px-12 py-10" defaultValue={filters.objective ?? ''} />
      <button type="submit" className="rounded-lg bg-brand-primary px-16 py-10 font-semibold text-white">{t('hero.find')}</button>
    </form>
  );
}

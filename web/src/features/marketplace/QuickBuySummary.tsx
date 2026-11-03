'use client';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { exchangeItems } from '@/features/home/QuickBuyFields';

export function QuickBuySummary() {
  const params = useSearchParams();
  const t = useTranslations('home.hero.search');
  if (params.get('buyIntent') !== 'quickBuy') return null;
  const amount = (key: string) => {
    const value = params.get(key);
    return value && /^\d{1,13}$/.test(value) ? value : '—';
  };
  const selected = (params.get('exchangeItems') ?? '').split(',');
  return (
    <aside className="rounded-xl bg-bg-surface p-20 text-text-primary" aria-label={t('modes.quickBuy')}>
      <p className="type-label-large">{t('modes.quickBuy')}</p>
      <p>{t('criteriaOnly')}</p>
      <ul className="mt-12 flex flex-wrap gap-16">
        <li>
          {t('availableCash')}: {amount('availableCash')}
        </li>
        <li>
          {t('installmentAmount')}: {amount('installmentAmount')}
        </li>
        {exchangeItems
          .filter((v) => selected.includes(v))
          .map((v) => (
            <li key={v}>
              {t(`assets.${v}`)}: {amount(`assetValue_${v}`)}
              {v === 'other' && ` (${(params.get('otherDescription') ?? '').slice(0, 120)})`}
            </li>
          ))}
      </ul>
    </aside>
  );
}

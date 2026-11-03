'use client';
import { useTranslations } from 'next-intl';

export const exchangeItems = ['factory', 'villa', 'car', 'apartment', 'farm', 'other'] as const;
export const intentKeys = [
  'buyIntent',
  'availableCash',
  'installmentAmount',
  'exchangeItems',
  'otherDescription',
  ...exchangeItems.map((v) => `assetValue_${v}`),
];

export function QuickBuyFields({ selected, onChange }: { selected: string[]; onChange: (value: string[]) => void }) {
  const t = useTranslations('home.hero.search');
  const amount = (name: string, label: string) => (
    <label
      key={name}
      className="flex min-h-96 min-w-0 flex-1 flex-col gap-8 rounded-xl bg-bg-surface p-16 text-text-primary"
    >
      <span className="type-label-small">{label}</span>
      <input
        className="w-full min-w-0 bg-transparent"
        name={name}
        type="number"
        min="0"
        max="9999999999999"
        step="1"
        inputMode="numeric"
      />
    </label>
  );
  return (
    <>
      {amount('availableCash', t('availableCash'))}
      {amount('installmentAmount', t('installmentAmount'))}
      <details className="relative min-h-96 min-w-0 flex-1 rounded-xl bg-bg-surface p-16 text-text-primary">
        <summary className="cursor-pointer type-label-large">
          {t('exchange')} ({selected.length})
        </summary>
        <div className="mt-12 flex max-h-320 flex-col gap-12 overflow-y-auto p-4 desktop:absolute desktop:start-0 desktop:top-full desktop:z-30 desktop:mt-4 desktop:w-full desktop:min-w-280 desktop:rounded-xl desktop:border desktop:border-border-hairline desktop:bg-bg-surface desktop:p-16 desktop:shadow-premium-rest">
          {exchangeItems.map((value) => (
            <div key={value} className="flex flex-col gap-8">
              <label className="flex items-center gap-8">
                <input
                  type="checkbox"
                  checked={selected.includes(value)}
                  onChange={() =>
                    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
                  }
                />
                {t(`assets.${value}`)}
              </label>
              {selected.includes(value) && (
                <>
                  {value === 'other' && (
                    <label>
                      {t('otherDescription')}
                      <input className="w-full rounded-lg border p-8" name="otherDescription" maxLength={120} />
                    </label>
                  )}
                  {amount(`assetValue_${value}`, t('approximateValue'))}
                </>
              )}
            </div>
          ))}
        </div>
      </details>
    </>
  );
}

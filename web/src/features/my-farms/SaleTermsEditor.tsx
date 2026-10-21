'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Choice } from '@/features/phase7/TaskFrame';
import { WizardCard } from './WizardCard';
import { Button } from '@/components/ui/Button';
export type SaleTerms = {
  saleMode: string;
  acceptsCashProposals: boolean;
  acceptsInstallmentProposals: boolean;
  acceptsExchangeProposals: boolean;
  exchangePreferenceScope: string;
  exchangeAssetTypes: string[];
  configured: boolean;
};
export type SaleTermsHandle = { save: (id: string) => Promise<void> };
export class SaleTermsError extends Error {}
export const assets = ['factory', 'villa', 'apartment', 'car'] as const;
export const saleLabels = {
  en: {
    title: 'Sale conditions',
    normal: 'Normal Sale — cash only',
    quick: 'Quick Sale',
    installment: 'Installments Only',
    exchange: 'Exchange Only',
    both: 'Installments + Exchange',
    assets: ['Factory', 'Villa', 'Apartment', 'Car'],
    accepted: 'Accepted exchange assets',
    required: 'Choose a Quick Sale option and at least one asset when exchange is enabled.',
    legacy: 'Existing sale terms are preserved. Select a sale mode to replace them explicitly.',
    loading: 'Loading saved sale terms…',
    error: 'Could not load sale terms. Reload before editing.',
    unknown: 'Sale terms have not been configured.',
  },
  ar: {
    title: 'شروط البيع',
    normal: 'بيع عادي — نقدًا فقط',
    quick: 'بيع سريع',
    installment: 'تقسيط فقط',
    exchange: 'استبدال فقط',
    both: 'تقسيط واستبدال',
    assets: ['مصنع', 'فيلا', 'شقة', 'سيارة'],
    accepted: 'الأصول المقبولة للاستبدال',
    required: 'اختر طريقة البيع السريع وأصلًا واحدًا على الأقل عند تفعيل الاستبدال.',
    legacy: 'تظل شروط البيع الحالية محفوظة. اختر نوع البيع لاستبدالها صراحةً.',
    loading: 'جارٍ تحميل شروط البيع المحفوظة…',
    error: 'تعذر تحميل شروط البيع. أعد التحميل قبل التعديل.',
    unknown: 'لم تُحدد شروط البيع بعد.',
  },
};
export const SaleTermsEditor = forwardRef<
  SaleTermsHandle,
  { listingId?: string; onDirty: () => void; disabled?: boolean; visible?: boolean }
>(function SaleTermsEditor({ listingId, onDirty, disabled, visible = true }, ref) {
  const locale = useLocale();
  const c = saleLabels[locale === 'ar' ? 'ar' : 'en'];
  const [stored, setStored] = useState<SaleTerms | null>(null);
  const [mode, setMode] = useState(listingId ? '' : 'standardCash');
  const [choice, setChoice] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(!listingId);
  const [failed, setFailed] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const touched = useRef(!listingId);
  const [edited, setEdited] = useState(!listingId);
  const loaded = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!listingId || loaded.current === listingId) return;
    let active = true;
    void fetch(`/api/listing-requests/${listingId}/sale-terms`)
      .then(async (r) => {
        if (r.status !== 404 && !r.ok) throw Error();
        const value: SaleTerms | null = r.status === 404 ? null : await r.json();
        if (
          value &&
          (!Array.isArray(value.exchangeAssetTypes) ||
            typeof value.acceptsCashProposals !== 'boolean' ||
            typeof value.acceptsInstallmentProposals !== 'boolean' ||
            typeof value.acceptsExchangeProposals !== 'boolean')
        )
          throw new Error(c.error);
        if (!active) return;
        loaded.current = listingId;
        setStored(value);
        if (value) {
          setMode(value.saleMode);
          setChoice(
            value.acceptsInstallmentProposals && value.acceptsExchangeProposals
              ? 'both'
              : value.acceptsInstallmentProposals
                ? 'installment'
                : value.acceptsExchangeProposals
                  ? 'exchange'
                  : '',
          );
          setSelected(value.exchangeAssetTypes);
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [listingId, c.error]);
  useImperativeHandle(ref, () => ({
    save: async (id) => {
      if (!ready || failed) throw new SaleTermsError(c.error);
      if (!touched.current) return;
      const exchange = mode === 'quickSale' && (choice === 'exchange' || choice === 'both');
      if (mode === 'quickSale' && (!choice || (exchange && !selected.length))) {
        setInvalid(true);
        throw new SaleTermsError(c.required);
      }
      const body = {
        saleMode: mode,
        acceptsCashProposals: mode === 'standardCash',
        acceptsInstallmentProposals: mode === 'quickSale' && (choice === 'installment' || choice === 'both'),
        acceptsExchangeProposals: exchange,
        exchangePreferenceScope: exchange ? 'selected' : 'any',
        exchangeAssetTypes: exchange ? selected : [],
      };
      const r = await fetch(`/api/listing-requests/${id}/sale-terms`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new SaleTermsError(c.error);
      const saved: SaleTerms = await r.json();
      if (Object.entries(body).some(([k, v]) => JSON.stringify(saved[k as keyof SaleTerms]) !== JSON.stringify(v)))
        throw new SaleTermsError(c.error);
      loaded.current = id;
      touched.current = false;
      setEdited(false);
      setStored(saved);
      setInvalid(false);
    },
  }));
  const change = () => {
    touched.current = true;
    setEdited(true);
    setInvalid(false);
    onDirty();
  };
  return (
    <div hidden={!visible} data-testid="sale-terms-editor">
      <WizardCard title={c.title} icon="document-text">
        {!ready && <p role={failed ? 'alert' : 'status'}>{failed ? c.error : c.loading}</p>}
        {stored && !edited && (
          <p className="type-body-caption text-text-muted">
            {c.legacy} {stored.acceptsCashProposals ? (locale === 'ar' ? ' نقدًا؛ ' : ' Cash; ') : ''}
            {stored.acceptsInstallmentProposals ? (locale === 'ar' ? ' تقسيط؛ ' : ' Installments; ') : ''}
            {stored.acceptsExchangeProposals ? (locale === 'ar' ? ' استبدال؛ ' : ' Exchange; ') : ''}{' '}
            {stored.exchangePreferenceScope === 'any' && stored.acceptsExchangeProposals
              ? locale === 'ar'
                ? 'الأصول: أي نوع مدعوم'
                : 'Assets: any supported type'
              : stored.exchangeAssetTypes
                  .map((a) => c.assets[assets.indexOf(a as (typeof assets)[number])] ?? a)
                  .join('، ')}
          </p>
        )}
        {stored?.saleMode === 'quickSale' && stored.acceptsCashProposals && !edited && !disabled && (
          <Button type="button" variant="outline" onClick={change}>
            {locale === 'ar' ? 'تعديل شروط البيع السريع بدون تفعيل النقد' : 'Edit Quick Sale terms without cash'}
          </Button>
        )}
        {!stored && listingId && ready && <p className="type-body-caption text-text-muted">{c.unknown}</p>}
        <fieldset disabled={disabled || !ready || failed} className="flex flex-col gap-12">
          <Choice
            type="radio"
            name="saleMode"
            value="standardCash"
            label={c.normal}
            checked={mode === 'standardCash'}
            onChange={() => {
              setMode('standardCash');
              change();
            }}
          />
          <Choice
            type="radio"
            name="saleMode"
            value="quickSale"
            label={c.quick}
            checked={mode === 'quickSale'}
            onChange={() => {
              setMode('quickSale');
              change();
            }}
          />
          {mode === 'quickSale' && (
            <>
              {(['installment', 'exchange', 'both'] as const).map((v) => (
                <Choice
                  key={v}
                  type="radio"
                  name="quickSaleChoice"
                  value={v}
                  label={c[v]}
                  checked={choice === v}
                  onChange={() => {
                    setChoice(v);
                    change();
                  }}
                />
              ))}
              {(choice === 'exchange' || choice === 'both') && (
                <fieldset className="flex flex-col gap-12">
                  <legend className="mb-12 type-label-small-strong">{c.accepted}</legend>
                  {assets.map((v, i) => (
                    <Choice
                      key={v}
                      name="acceptedExchangeAsset"
                      value={v}
                      label={c.assets[i]!}
                      checked={selected.includes(v)}
                      onChange={() => {
                        setSelected((s) => (s.includes(v) ? s.filter((a) => a !== v) : [...s, v]));
                        change();
                      }}
                    />
                  ))}
                </fieldset>
              )}
            </>
          )}
        </fieldset>
        {invalid && (
          <p role="alert" className="type-body-caption text-status-error">
            {c.required}
          </p>
        )}
      </WizardCard>
    </div>
  );
});

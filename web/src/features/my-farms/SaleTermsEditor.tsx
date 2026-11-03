'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { EntryMode } from './entry-mode';
import { exchangeItems } from '@/features/home/QuickBuyFields';
import { Choice } from '@/features/phase7/TaskFrame';
import { WizardCard } from './WizardCard';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
export type SaleTerms = {
  saleMode: string;
  acceptsCashProposals: boolean;
  acceptsInstallmentProposals: boolean;
  acceptsExchangeProposals: boolean;
  exchangePreferenceScope: string;
  exchangeAssetTypes: string[];
  configured: boolean;
};
export type SaleTermsHandle = { validate: (required?: boolean) => void; save: (id: string) => Promise<void> };
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
  {
    listingId?: string;
    onDirty: () => void;
    disabled?: boolean;
    visible?: boolean;
    entryMode?: EntryMode;
    storageId?: string;
    userId?: string;
  }
>(function SaleTermsEditor({ listingId, onDirty, disabled, visible = true, entryMode, storageId, userId }, ref) {
  const locale = useLocale();
  const t = useTranslations('home.hero.search');
  const lockedMode =
    entryMode === 'quickSale' ? 'standardCash' : entryMode === 'standardSale' ? 'quickSale' : undefined;
  const extraKey = (id: string) => `fx:listing-assets:v1:${userId}:${id}`;
  const c = saleLabels[locale === 'ar' ? 'ar' : 'en'];
  const [stored, setStored] = useState<SaleTerms | null>(null);
  const [mode, setMode] = useState(lockedMode ?? (listingId ? '' : 'standardCash'));
  const [choice, setChoice] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
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
          const incompatible = Boolean(
            value.configured !== false &&
            lockedMode &&
            (value.saleMode !== lockedMode ||
              (lockedMode === 'standardCash'
                ? !value.acceptsCashProposals || value.acceptsInstallmentProposals || value.acceptsExchangeProposals
                : value.acceptsCashProposals)),
          );
          setConflict(incompatible);
          setMode(lockedMode ?? value.saleMode);
          setChoice(
            value.acceptsInstallmentProposals && value.acceptsExchangeProposals
              ? 'both'
              : value.acceptsInstallmentProposals
                ? 'installment'
                : value.acceptsExchangeProposals
                  ? 'exchange'
                  : '',
          );
          let extra: string[] = [];
          try {
            const raw: unknown = JSON.parse(
              localStorage.getItem(`fx:listing-assets:v1:${userId}:${listingId}`) ?? '[]',
            );
            if (Array.isArray(raw)) extra = raw.filter((v) => v === 'farm' || v === 'other');
          } catch {
            /* No saved browser-only assets. */
          }
          setSelected([...value.exchangeAssetTypes, ...extra]);
        }
        if ((!value || value.configured === false) && lockedMode) {
          touched.current = true;
          setEdited(true);
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [listingId, c.error, lockedMode, userId]);
  const validate = (required = true) => {
    if (!ready || failed) throw new SaleTermsError(c.error);
    if (conflict) throw new SaleTermsError(t('termsConflict'));
    const exchange = mode === 'quickSale' && (choice === 'exchange' || choice === 'both');
    if (
      required &&
      touched.current &&
      mode === 'quickSale' &&
      (!choice || (exchange && !selected.some((v) => assets.includes(v as (typeof assets)[number]))))
    ) {
      setInvalid(true);
      throw new SaleTermsError(lockedMode ? t('paymentRequired') : c.required);
    }
  };
  useImperativeHandle(ref, () => ({
    validate,
    save: async (id) => {
      validate();
      if (!touched.current) return;
      const exchange = mode === 'quickSale' && (choice === 'exchange' || choice === 'both');
      const body = {
        saleMode: mode,
        acceptsCashProposals: mode === 'standardCash',
        acceptsInstallmentProposals: mode === 'quickSale' && (choice === 'installment' || choice === 'both'),
        acceptsExchangeProposals: exchange,
        exchangePreferenceScope: exchange ? 'selected' : 'any',
        exchangeAssetTypes: exchange ? selected.filter((v) => assets.includes(v as (typeof assets)[number])) : [],
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
      localStorage.setItem(extraKey(id), JSON.stringify(selected.filter((v) => v === 'farm' || v === 'other')));
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
        {conflict && (
          <div className="flex flex-col gap-12">
            <p role="alert">{t('termsConflict')}</p>
            <Link href="/my/farms">{t('original')}</Link>
          </div>
        )}
        <fieldset disabled={disabled || !ready || failed || conflict} className="flex flex-col gap-12">
          <Choice
            type="radio"
            name="saleMode"
            value="standardCash"
            disabled={Boolean(lockedMode)}
            label={lockedMode ? t('cashOnly') : c.normal}
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
            disabled={Boolean(lockedMode)}
            label={lockedMode ? t('flexible') : c.quick}
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
                  {(entryMode ? exchangeItems : assets).map((v) => (
                    <Choice
                      key={v}
                      name="acceptedExchangeAsset"
                      value={v}
                      label={t(`assets.${v}`)}
                      checked={selected.includes(v)}
                      onChange={() => {
                        setSelected((s) => (s.includes(v) ? s.filter((a) => a !== v) : [...s, v]));
                        if (storageId)
                          localStorage.setItem(
                            extraKey(storageId),
                            JSON.stringify(
                              (selected.includes(v) ? selected.filter((a) => a !== v) : [...selected, v]).filter(
                                (a) => a === 'farm' || a === 'other',
                              ),
                            ),
                          );
                        change();
                      }}
                    />
                  ))}
                </fieldset>
              )}
            </>
          )}
        </fieldset>
        {entryMode === 'standardSale' && <p className="type-body-caption text-text-muted">{t('localOnly')}</p>}
        {invalid && (
          <p role="alert" className="type-body-caption text-status-error">
            {lockedMode ? t('paymentRequired') : c.required}
          </p>
        )}
      </WizardCard>
    </div>
  );
});

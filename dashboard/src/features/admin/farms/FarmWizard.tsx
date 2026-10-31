'use client';
import type { LocalizedContent } from '@/lib/content/localized';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { saveFarmAction } from '@/features/admin/actions/farms';
import { ActionIcon } from '@/features/admin/workspace/ActionIcon';

export type EditableFarm = {
  localizedContent?: LocalizedContent;
  id?: string;
  name: string;
  description?: string | null;
  farmType: string;
  governorate: string;
  areaName?: string | null;
  areaFeddan: number;
  mainActivity?: string | null;
  waterSource?: string | null;
  irrigationMethod?: string | null;
  energySource?: string | null;
  soilType?: string | null;
};
type FarmField =
  | 'name'
  | 'description'
  | 'farmType'
  | 'ownerUserId'
  | 'governorate'
  | 'areaName'
  | 'areaFeddan'
  | 'mainActivity'
  | 'waterSource'
  | 'irrigationMethod'
  | 'energySource'
  | 'soilType';
const STEPS = ['basics', 'locationOwner', 'agriculture', 'review'] as const;
export function FarmWizard({ initial, governorates }: { initial?: EditableFarm; governorates: string[] }) {
  const t = useTranslations('batch'),
    router = useRouter(),
    form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0),
    [pending, start] = useTransition(),
    [error, setError] = useState<string | null>(null),
    [dirty, setDirty] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const [contentLanguage, setContentLanguage] = useState<'en' | 'ar'>('en');
  const translated = ['name', 'description', 'mainActivity', 'areaName', 'soilType'];
  const [localizedContent, setLocalizedContent] = useState<LocalizedContent>(() => {
    const existing = initial?.localizedContent ?? {};
    return {
      en: {
        name: existing.en?.name ?? initial?.name ?? '',
        description: existing.en?.description ?? initial?.description ?? '',
        mainActivity: existing.en?.mainActivity ?? initial?.mainActivity ?? '',
        areaName: existing.en?.areaName ?? initial?.areaName ?? '',
        soilType: existing.en?.soilType ?? initial?.soilType ?? '',
      },
      ar: {
        name: existing.ar?.name ?? '',
        description: existing.ar?.description ?? '',
        mainActivity: existing.ar?.mainActivity ?? '',
        areaName: existing.ar?.areaName ?? '',
        soilType: existing.ar?.soilType ?? '',
      },
    };
  });
  const [values, setValues] = useState<Record<FarmField, string>>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    farmType: initial?.farmType ?? 'vegetable',
    ownerUserId: '',
    governorate: initial?.governorate ?? '',
    areaName: initial?.areaName ?? '',
    areaFeddan: initial ? String(initial.areaFeddan) : '',
    mainActivity: initial?.mainActivity ?? '',
    waterSource: initial?.waterSource ?? '',
    irrigationMethod: initial?.irrigationMethod ?? '',
    energySource: initial?.energySource ?? '',
    soilType: initial?.soilType ?? '',
  });
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const leave = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]');
      if (dirty && anchor && !window.confirm(t('unsaved'))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', leave, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', leave, true);
    };
  }, [dirty, t]);
  function change(key: FarmField, value: string) {
    if (translated.includes(key)) {
      setLocalizedContent((v) => ({ ...v, [contentLanguage]: { ...v[contentLanguage], [key]: value } }));
      if (contentLanguage === 'en') {
        setValues((v) => ({ ...v, [key]: value }));
      }
    } else {
      setValues((v) => ({ ...v, [key]: value }));
    }
    setDirty(true);
    setError(null);
  }
  function input(key: FarmField, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    const isTrans = translated.includes(key);
    return (
      <label>
        {t(label)} {isTrans && <span className="workflow-help">({contentLanguage === 'en' ? 'EN' : 'العربية'})</span>}
        <input
          {...props}
          required={props.required && (!isTrans || contentLanguage === 'en' || !values.name)}
          name={key}
          dir={isTrans ? (contentLanguage === 'ar' ? 'rtl' : 'ltr') : undefined}
          lang={isTrans ? contentLanguage : undefined}
          value={
            isTrans
              ? (localizedContent[contentLanguage]?.[key] ?? '')
              : values[key]
          }
          onChange={(e) => change(key, e.target.value)}
          disabled={pending}
        />
      </label>
    );
  }
  function select(key: FarmField, label: string, options: string[]) {
    return (
      <label>
        {t(label)}
        <select name={key} value={values[key]} onChange={(e) => change(key, e.target.value)} disabled={pending}>
          {key !== 'farmType' && <option value="">{t('notStated')}</option>}
          {options.map((v) => (
            <option key={v} value={v}>
              {t(v)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function next() {
    if (!form.current?.reportValidity()) return;
    setStep((s) => s + 1);
  }
  function save() {
    if (!confirmed) return;
    const area = Number(values.areaFeddan);
    const resolvedName = localizedContent.en?.name?.trim() || localizedContent.ar?.name?.trim() || values.name.trim();
    if (
      !resolvedName ||
      !values.governorate.trim() ||
      area < 0.01 ||
      area > 9999999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(values.areaFeddan) ||
      (!initial && !/^[1-9]\d{0,18}$/.test(values.ownerUserId))
    ) {
      setError(t('fieldError'));
      return;
    }
    const body: Record<string, unknown> = { localizedContent };
    for (const [key, value] of Object.entries(values)) {
      if (key === 'ownerUserId') {
        if (!initial) body[key] = value;
        continue;
      }
      body[key] = key === 'areaFeddan' ? area : value.trim() || null;
    }
    for (const key of translated) {
      body[key] = localizedContent.en?.[key]?.trim() || localizedContent.ar?.[key]?.trim() || values[key as FarmField] || null;
    }
    start(async () => {
      const res = await saveFarmAction(initial?.id ?? null, body);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDirty(false);
      router.push(`/admin/farms/${res.id}`);
      router.refresh();
    });
  }
  return (
    <div>
      <ol className="wizard-steps">
        {STEPS.map((key, i) => (
          <li key={key} aria-current={i === step ? 'step' : undefined}>
            <span>{i + 1}</span>
            {t(key)}
          </li>
        ))}
      </ol>
      <form
        ref={form}
        className="operation-card workflow-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) next();
          else save();
        }}
      >
        <header>
          <div>
            <p className="workflow-help">{t('step', { current: step + 1, total: 4 })}</p>
            <h2>{t(STEPS[step]!)}</h2>
          </div>
        </header>
        <div className="workflow-grid" role="group" aria-label="Content language">
          {(['en', 'ar'] as const).map((lang) => (
            <button
              type="button"
              key={lang}
              aria-pressed={contentLanguage === lang}
              onClick={() => setContentLanguage(lang)}
            >
              {lang === 'en' ? 'English' : 'العربية'} ·{' '}
              {translated.filter((key) => localizedContent[lang]?.[key]?.trim()).length}/{translated.length}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {step === 0 && (
          <>
            <div className="workflow-grid">
              {input('name', 'name', { required: true, maxLength: 200 })}
              {select('farmType', 'farmType', ['vegetable', 'fruit', 'livestock', 'mixed'])}
            </div>
            <label>
              {t('description')} <span className="workflow-help">({contentLanguage === 'en' ? 'EN' : 'العربية'})</span>
              <textarea
                rows={4}
                maxLength={5000}
                dir={contentLanguage === 'ar' ? 'rtl' : 'ltr'}
                lang={contentLanguage}
                value={localizedContent[contentLanguage]?.description ?? ''}
                onChange={(e) => change('description', e.target.value)}
                disabled={pending}
              />
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <div className="workflow-grid">
              {input('governorate', 'governorate', { required: true, maxLength: 120, list: 'wizard-governorates' })}
              {input('areaName', 'areaName', { maxLength: 120 })}
              <datalist id="wizard-governorates">
                {governorates.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              {!initial &&
                input('ownerUserId', 'ownerId', {
                  required: true,
                  pattern: '[1-9][0-9]{0,18}',
                  inputMode: 'numeric',
                  autoComplete: 'off',
                })}
            </div>
            <p className="workflow-help">{t(initial ? 'ownerPreserved' : 'ownerHint')}</p>
          </>
        )}
        {step === 2 && (
          <>
            <div className="workflow-grid">
              {input('areaFeddan', 'area', {
                required: true,
                type: 'number',
                min: 0.01,
                max: 9999999999.99,
                step: 0.01,
              })}
              {input('mainActivity', 'activity', { maxLength: 255 })}
              {select('waterSource', 'water', ['well', 'canal'])}
              {select('irrigationMethod', 'irrigation', ['drip', 'sprinkler', 'gravity'])}
              {select('energySource', 'energy', ['electricity', 'solar', 'diesel'])}
              {input('soilType', 'soil', { maxLength: 120 })}
            </div>
            <p className="workflow-help">{t('attachmentsRestricted')}</p>
          </>
        )}
        {step === 3 && (
          <>
            <dl className="workflow-grid">
              {Object.entries(values)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="workflow-help">
                      {t(
                        (
                          {
                            name: 'name',
                            description: 'description',
                            farmType: 'farmType',
                            governorate: 'governorate',
                            areaName: 'areaName',
                            areaFeddan: 'area',
                            mainActivity: 'activity',
                            waterSource: 'water',
                            irrigationMethod: 'irrigation',
                            energySource: 'energy',
                            soilType: 'soil',
                            ownerUserId: 'ownerId',
                          } as Record<string, string>
                        )[k]!,
                      )}
                    </dt>
                    <dd className="text-sm font-semibold break-words">
                      {['farmType', 'waterSource', 'irrigationMethod', 'energySource'].includes(k) && t.has(v)
                        ? t(v)
                        : v}
                    </dd>
                  </div>
                ))}
            </dl>
            <p className="workflow-help">{t('noDraft')}</p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={pending}
              />
              {t('confirmFarm')}
            </label>
          </>
        )}
        <footer className="workflow-footer">
          <Link href={initial?.id ? `/admin/farms/${initial.id}` : '/admin/farms'} className="admin-btn-secondary">
            {t('cancel')}
          </Link>
          <div className="operation-actions">
            {step > 0 && (
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={pending}
                onClick={() => setStep((s) => s - 1)}
              >
                <ActionIcon name="back" />
                {t('previous')}
              </button>
            )}
            <button type="submit" className="admin-btn-primary" disabled={pending || (step === 3 && !confirmed)}>
              <ActionIcon name={step === 3 ? 'check' : 'next'} />
              {pending ? t('saving') : step === 3 ? t(initial ? 'save' : 'create') : t('next')}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

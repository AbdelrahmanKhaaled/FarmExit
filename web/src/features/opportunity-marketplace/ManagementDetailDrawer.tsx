'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicOpportunity } from '@/lib/opportunities/public-opportunity';
import { VerifiedBadge } from './shared';

type Props = {
  item: PublicOpportunity | null;
  locale: string;
  onClose: () => void;
};

export function ManagementDetailDrawer({ item, locale, onClose }: Props) {
  const t = useTranslations('opportunityMarketplace');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <>
      <button type="button" className="om-drawer-backdrop" aria-label={t('drawer.close')} onClick={onClose} />
      <div className="om-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="mgmt-drawer-title">
        <header className="flex shrink-0 items-center justify-between border-b border-border-hairline px-20 py-16">
          <h2 id="mgmt-drawer-title" className="type-label-large text-text-primary">{item.farmName}</h2>
          <button ref={closeRef} type="button" className="type-label-small-strong text-text-brand" onClick={onClose}>
            {t('drawer.close')}
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-20 py-16">
          <VerifiedBadge />
          <p className="mt-12 type-body-caption text-text-muted">
            {[item.governorate, item.areaName].filter(Boolean).join(' · ')} · {item.areaFeddan.toLocaleString(locale)} {t('feddans')}
          </p>
          {item.professionalNeed ? (
            <div className="om-highlight-box mt-16">
              {t(`professionalNeed.${item.professionalNeed}` as 'professionalNeed.farmManager')}
            </div>
          ) : null}
          {item.managementTypes?.length ? (
            <section className="mt-20">
              <h3 className="type-label-small-strong text-text-primary">{t('drawer.managementTypes')}</h3>
              <ul className="mt-8 list-inside list-disc type-body-caption text-text-secondary">
                {item.managementTypes.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ) : null}
          {item.experienceLevel ? (
            <section className="mt-16">
              <h3 className="type-label-small-strong text-text-primary">{t('drawer.experience')}</h3>
              <p className="mt-6 type-body-caption">{t(`experience.${item.experienceLevel}` as 'experience.entryLevel')}</p>
            </section>
          ) : null}
          {item.goals?.length ? (
            <section className="mt-16">
              <h3 className="type-label-small-strong text-text-primary">{t('drawer.goals')}</h3>
              <ul className="mt-8 list-inside list-disc type-body-caption">
                {item.goals.map((g) => <li key={g}>{g}</li>)}
              </ul>
            </section>
          ) : null}
          {item.responsibilities?.length ? (
            <section className="mt-16">
              <h3 className="type-label-small-strong text-text-primary">{t('drawer.responsibilities')}</h3>
              <ul className="mt-8 list-inside list-disc type-body-caption">
                {item.responsibilities.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </section>
          ) : null}
          {item.resourcesAndFacilities?.length ? (
            <section className="mt-16">
              <h3 className="type-label-small-strong text-text-primary">{t('drawer.facilities')}</h3>
              <ul className="mt-8 list-inside list-disc type-body-caption">
                {item.resourcesAndFacilities.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </section>
          ) : null}
          {item.currentSituation ? (
            <section className="mt-16">
              <h3 className="type-label-small-strong text-text-primary">{t('drawer.farmContext')}</h3>
              <p className="mt-6 whitespace-pre-wrap type-body-caption text-text-secondary">{item.currentSituation}</p>
            </section>
          ) : null}
          <div className="mt-24 rounded-lg bg-bg-muted px-14 py-12 type-body-caption text-text-secondary">
            {t('mediation.body')}
          </div>
          <p className="mt-20 type-body-caption text-text-muted">{t('managementApply.gap')}</p>
        </div>
      </div>
    </>
  );
}

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ButtonLink } from '@/components/ui/Button';
import type { PublicOpportunity } from '@/lib/opportunities/public-opportunity';
import { OPPORTUNITY_PLACEHOLDER_IMAGE } from '@/lib/opportunities/public-opportunity';

export function OpportunityCardImage({ alt }: { alt: string }) {
  const t = useTranslations('opportunityMarketplace');
  return (
    <div className="om-card-media">
      <Image
        src={OPPORTUNITY_PLACEHOLDER_IMAGE}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
      <span className="absolute bottom-8 inset-inline-start-8 rounded-md bg-bg-surface/90 px-8 py-4 text-[0.65rem] font-medium text-text-muted">
        {t('illustrativeImage')}
      </span>
    </div>
  );
}

export function VerifiedBadge() {
  const t = useTranslations('opportunityMarketplace');
  return (
    <span className="inline-flex items-center gap-6 rounded-full bg-bg-success-soft px-10 py-4 type-label-caption text-text-brand">
      {t('verifiedPublished')}
    </span>
  );
}

export function formatLocation(item: PublicOpportunity, locale: string) {
  return [item.governorate, item.areaName].filter(Boolean).join(' · ');
}

export function formatFeddans(area: number, locale: string, feddansLabel: string) {
  return `${area.toLocaleString(locale)} ${feddansLabel}`;
}

export function OwnerCtaBanner({ kind }: { kind: 'management' | 'partnerships' }) {
  const t = useTranslations('opportunityMarketplace');
  const href = kind === 'management' ? '/my/management/new' : '/my/partnerships/new';
  return (
    <section className="om-owner-cta" aria-labelledby={`owner-cta-${kind}`}>
      <h2 id={`owner-cta-${kind}`} className="type-heading-h3 text-white">
        {t(`ownerCta.${kind}.title`)}
      </h2>
      <p className="mt-12 max-w-640 type-body-small text-white/90">{t(`ownerCta.${kind}.body`)}</p>
      <p className="mt-8 type-label-caption text-white/75">{t('ownerCta.reviewNote')}</p>
      <ButtonLink href={href} variant="outline" size="md" className="mt-20 !border-white/30 !bg-white !text-text-brand">
        {t(`ownerCta.${kind}.action`)}
      </ButtonLink>
    </section>
  );
}

export function MediationBanner() {
  const t = useTranslations('opportunityMarketplace');
  return (
    <div className="om-mediation-banner" role="note">
      <p className="type-label-small-strong text-text-brand">{t('mediation.title')}</p>
      <p className="mt-6 type-body-caption text-text-secondary">{t('mediation.body')}</p>
    </div>
  );
}

export function PaginationBar({
  page,
  pageSize,
  total,
  basePath,
  query,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: '/management' | '/partnerships';
  query: string;
}) {
  const t = useTranslations('opportunityMarketplace');
  const suffix = query ? `?${query}` : '';
  const prev = page > 1 ? `${basePath}?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), page: String(page - 1) }).toString()}` : null;
  const next =
    page * pageSize < total
      ? `${basePath}?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), page: String(page + 1) }).toString()}`
      : null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-12 pt-8" aria-label={t('pagination.label')}>
      <p className="type-body-caption text-text-muted">{t('pagination.count', { count: total })}</p>
      <div className="flex gap-12">
        {prev ? (
          <Link href={prev} className="type-label-small-strong text-text-brand">
            {t('pagination.previous')}
          </Link>
        ) : null}
        {next ? (
          <Link href={next} className="type-label-small-strong text-text-brand">
            {t('pagination.next')}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ButtonLink } from '@/components/ui/Button';
import type { PublicOpportunity } from '@/lib/opportunities/public-opportunity';

export function OpportunityCardImage({
  alt,
  kind = 'management',
  index = 0,
}: {
  alt: string;
  kind?: 'management' | 'partnerships';
  index?: number;
}) {
  const t = useTranslations('opportunityMarketplace');
  return (
    <div className="om-card-media">
      <Image
        src={
          '/images/home/' +
          (kind === 'management'
            ? ['management-roles', 'journey-manage', 'journey-managers']
            : ['journey-find', 'about-farmer', 'farm-tamiya'])[index % 3] +
          '.jpg'
        }
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
      <span className="absolute top-12 start-12 rounded-md bg-bg-surface/90 px-8 py-4 text-[0.65rem] font-medium text-text-muted">
        {t('illustrativeImage')}
      </span>
    </div>
  );
}

export function VerifiedBadge() {
  const t = useTranslations('opportunityMarketplace');
  return (
    <span className="inline-flex items-center gap-6 rounded-lg px-0 py-4 type-label-caption text-text-brand">
      <span aria-hidden="true" className="text-brand-gold">
        ✿
      </span>
      {t('verifiedPublished')}
    </span>
  );
}

const GOVERNORATE_AR_MAP: Record<string, string> = {
  beheira: 'البحيرة',
  ismailia: 'الإسماعيلية',
  menoufia: 'المنوفية',
  qalyubia: 'القليوبية',
  giza: 'الجيزة',
  sharqia: 'الشرقية',
  benisuef: 'بني سويف',
  minya: 'المنيا',
  fayoum: 'الفيوم',
};

export function formatLocation(item: PublicOpportunity, locale: string) {
  const govSlug = (item.governorate ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const gov = (locale === 'ar' ? GOVERNORATE_AR_MAP[govSlug] : undefined) ?? item.governorate;
  return [gov, item.areaName].filter(Boolean).join(locale === 'ar' ? '، ' : ' · ');
}

export function formatFeddans(area: number, locale: string, feddansLabel: string) {
  return `${area.toLocaleString(locale)} ${feddansLabel}`;
}

export function OwnerCtaBanner({ kind }: { kind: 'management' | 'partnerships' }) {
  const t = useTranslations('opportunityMarketplace'),
    ar = useLocale() === 'ar';
  return (
    <section className="om-owner-cta" aria-labelledby={`owner-cta-${kind}`}>
      <div className="om-owner-layout">
        <div>
          <p className="om-owner-eyebrow">{ar ? 'لأصحاب المزارع' : 'For farm owners'}</p>
          <h2 id={`owner-cta-${kind}`}>{t(`ownerCta.${kind}.title`)}</h2>
          <p className="om-owner-description">{t(`ownerCta.${kind}.body`)}</p>
        </div>
        <div className="om-owner-actions">
          <ButtonLink
            href={kind === 'management' ? '/my/management/new' : '/my/partnerships/new'}
            variant="outline"
            size="md"
            className="!border-white/30 !bg-white !text-text-brand"
          >
            {t(`ownerCta.${kind}.action`)}
          </ButtonLink>
          <p>{t('ownerCta.reviewNote')}</p>
        </div>
      </div>
      <ol className="om-owner-steps">
        {(ar
          ? [
              'اختر إحدى مزارعك',
              'تراجع FarmExit طلبك',
              kind === 'management' ? 'نشر طلب الإدارة بعد المراجعة' : 'يتقدم الشركاء عبر FarmExit',
            ]
          : [
              'Choose one of your farms',
              'FarmExit reviews your request',
              kind === 'management' ? 'Management request published after review' : 'Partners apply through FarmExit',
            ]
        ).map((text, i) => (
          <li key={i}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            {text}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MediationBanner() {
  const t = useTranslations('opportunityMarketplace'),
    ar = useLocale() === 'ar';
  return (
    <div className="om-mediation-banner" role="note">
      <span className="om-review-mark" aria-hidden="true">
        ✿
      </span>
      <div className="om-review-copy">
        <h3>{t('mediation.title')}</h3>
        <p>{t('mediation.body')}</p>
      </div>
      <Link href="/#how-it-works" className="om-review-link">
        {ar ? 'كيف نراجع الطلبات' : 'How requests are reviewed'} →
      </Link>
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

  const prev =
    page > 1
      ? `${basePath}?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), page: String(page - 1) }).toString()}`
      : null;
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

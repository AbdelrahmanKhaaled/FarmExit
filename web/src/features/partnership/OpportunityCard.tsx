import type { ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
import { RequestBadge, ReviewedBadge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';

export type PartnershipOpportunityCardData = {
  title: string;
  location: string;
  specs: { area: string; activity: string; term: string };
  scope: string;
  highlights: string[];
  requirements: string;
  applicants: string;
  href: ComponentProps<typeof Link>['href'];
};

const SPECS = ['area', 'activity', 'term'] as const;

export function OpportunityCard({ opportunity }: { opportunity: PartnershipOpportunityCardData }) {
  const t = useTranslations('partnership.card');

  return (
    <Card as="article" surface="muted" padding="lg" className="flex h-full flex-col gap-20">
      <div className="flex flex-wrap items-center justify-between gap-8">
        <RequestBadge>{t('badge')}</RequestBadge>
        <ReviewedBadge>{t('reviewed')}</ReviewedBadge>
      </div>

      <div className="flex flex-col gap-8">
        <h4 className="type-heading-card-title text-text-primary">{opportunity.title}</h4>
        <p className="flex items-center gap-6 type-body-caption text-text-muted">
          <Icon name="location-pin" size={14} />
          {opportunity.location}
        </p>
      </div>

      <dl className="flex border-y border-border-default">
        {SPECS.map((key, i) => (
          <div
            key={key}
            className={
              i === 0
                ? 'flex flex-1 flex-col gap-4 py-14'
                : 'flex flex-1 flex-col gap-4 border-s border-border-default py-14 ps-14'
            }
          >
            <dt className="type-overline-spec text-text-subtle">{t(`specs.${key}`)}</dt>
            <dd className="type-numeric-large text-text-primary">{opportunity.specs[key]}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-6">
        <p className="type-overline-field text-text-muted">{t('scope')}</p>
        <p className="type-label-large text-text-brand">{opportunity.scope}</p>
        <p className="type-overline-field text-text-muted">{t('highlights')}</p>
        <ul className="flex flex-col gap-4 type-body-caption text-text-secondary">
          {opportunity.highlights.map((item) => (
            <li key={item} className="flex gap-8">
              <Icon name="check" size={14} className="mt-2 shrink-0 text-brand-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-border-default bg-bg-surface px-16 py-14">
        <p className="type-overline-field text-text-muted">{t('requirements')}</p>
        <p className="type-body-caption text-text-secondary">{opportunity.requirements}</p>
      </div>

      <p className="type-label-caption text-text-muted">{t('nonBinding')}</p>

      <div className="flex items-center justify-between gap-12">
        <p className="type-label-tag text-text-muted">{opportunity.applicants}</p>
        <Link
          href={opportunity.href}
          aria-label={t('applyFor', { title: opportunity.title })}
          className={buttonClasses({ variant: 'primary', size: 'md' })}
        >
          {t('apply')}
        </Link>
      </div>
    </Card>
  );
}

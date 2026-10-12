import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
import { RequestBadge, ReviewedBadge, ServiceTag } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';

/*
 * Figma: Components → Group / Marketplace Cards → Request Card (State = Open).
 * bg/muted card, hairline, Premium Rest, r24, padding 28, gap 20. Management request + Reviewed badges; Card Title +
 * location; three specs (Overline/Spec + Numeric/Large) between border/default rules; required scope (Label/Large,
 * brand) with Service Tags; Owner requirements box (white, r14); applicants + Apply as manager (Primary M).
 */
export type RequestCardData = {
  title: string;
  location: string;
  specs: { area: string; activity: string; term: string };
  scope: string;
  services: string[];
  requirements: string;
  applicants: string;
  href: string;
};

const SPECS = ['area', 'activity', 'term'] as const;

export function RequestCard({ request }: { request: RequestCardData }) {
  const t = useTranslations('management.requestCard');

  return (
    <Card as="article" surface="muted" padding="lg" className="flex h-full flex-col gap-20">
      <div className="flex flex-wrap items-center justify-between gap-8">
        <RequestBadge>{t('badge')}</RequestBadge>
        <ReviewedBadge>{t('reviewed')}</ReviewedBadge>
      </div>

      <div className="flex flex-col gap-8">
        <h4 className="type-heading-card-title text-text-primary">{request.title}</h4>
        <p className="flex items-center gap-6 type-body-caption text-text-muted">
          <Icon name="location-pin" size={14} />
          {request.location}
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
            <dd className="type-numeric-large text-text-primary">{request.specs[key]}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col">
        <p className="type-overline-field text-text-muted">{t('scope')}</p>
        <p className="mt-6 type-label-large text-text-brand">{request.scope}</p>
        <ul className="mt-12 flex flex-wrap gap-6">
          {request.services.map((service) => (
            <li key={service}>
              <ServiceTag>{service}</ServiceTag>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-border-default bg-bg-surface px-16 py-14">
        <p className="type-overline-field text-text-muted">{t('ownerRequirements')}</p>
        <p className="type-body-caption text-text-secondary">{request.requirements}</p>
      </div>

      <div className="flex items-center justify-between gap-12">
        <p className="type-label-tag text-text-muted">{request.applicants}</p>
        <Link
          href={request.href}
          aria-label={t('applyFor', { title: request.title })}
          className={buttonClasses({ variant: 'primary', size: 'md' })}
        >
          {t('apply')}
        </Link>
      </div>
    </Card>
  );
}

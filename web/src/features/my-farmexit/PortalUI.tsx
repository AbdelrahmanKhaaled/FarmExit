import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon, type IconName } from '@/components/icons/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { StatusBadge, type StatusTone } from '@/components/ui/Badge';

export function PortalHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-16">
      <div className="flex min-w-0 flex-1 flex-col gap-10">
        <h2 className="type-heading-cta-panel text-text-primary">{title}</h2>
        {description && <p className="max-w-780 type-body-default text-text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function PortalEmpty({
  icon,
  title,
  body,
  href,
  action,
  testId,
}: {
  icon: IconName;
  title: string;
  body: string;
  href?: string;
  action?: string;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className="flex flex-col items-center gap-16 rounded-card border border-border-hairline bg-bg-surface px-24 py-56 text-center"
    >
      <span className="flex size-80 items-center justify-center rounded-full bg-bg-success-soft text-text-brand">
        <Icon name={icon} size={32} />
      </span>
      <h3 className="type-heading-h4 text-text-primary">{title}</h3>
      <p className="max-w-480 type-body-default text-text-muted">{body}</p>
      {href && action && (
        <ButtonLink href={href} variant="primary" size="lg" className="mt-8 max-w-full whitespace-normal text-center">
          {action}
        </ButtonLink>
      )}
    </section>
  );
}

export function PortalStatus({ status }: { status: string }) {
  const t = useTranslations('workspace.visualStatuses');
  const tone: StatusTone = /^(approved|verified|published|completed|detailsShared)$/.test(status)
    ? 'positive'
    : /^(rejected|notApproved)$/.test(status)
      ? 'negative'
      : /^(changesRequested|verificationRequired)$/.test(status)
        ? 'action'
        : /review|submitted|pending/i.test(status)
          ? 'review'
          : 'neutral';
  const key = status as Parameters<typeof t>[0];
  return (
    <StatusBadge tone={tone} className="max-w-full whitespace-normal text-start">
      {t.has(key) ? t(key) : status}
    </StatusBadge>
  );
}

export function PortalRow({
  icon,
  title,
  meta,
  status,
  href,
  children,
}: {
  icon: IconName;
  title: string;
  meta?: string;
  status?: string;
  href: string;
  children?: ReactNode;
}) {
  const t = useTranslations('workspace.visual');
  return (
    <article className="flex flex-col gap-16 rounded-2xl border border-border-hairline bg-bg-surface p-20 tablet:flex-row tablet:items-center">
      <span className="flex size-44 shrink-0 items-center justify-center rounded-lg bg-bg-success-soft text-text-brand">
        <Icon name={icon} size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={href} className="type-label-large wrap-anywhere text-text-primary hover:text-text-brand">
          {title}
        </Link>
        {meta && <p className="mt-4 type-body-caption wrap-anywhere text-text-muted">{meta}</p>}
        {children}
      </div>
      {status && <PortalStatus status={status} />}
      <Link
        href={href}
        className="inline-flex min-h-44 shrink-0 items-center gap-8 type-label-small-strong text-text-brand"
      >
        {t('view')}
        <Icon name="arrow-right" size={16} />
      </Link>
    </article>
  );
}

export function VerificationCard({ status, name }: { status: string; name?: string }) {
  const t = useTranslations('workspace.visual');
  const action = status === 'verificationRequired' || status === 'changesRequested';
  const positive = status === 'verified';
  return (
    <article
      data-testid="verification-card"
      className={`grid grid-cols-[56px_minmax(0,1fr)] items-center gap-16 rounded-card border bg-bg-surface p-24 effect-premium-rest tablet:flex tablet:flex-wrap ${action || positive ? 'border-overlay-gold-hairline' : 'border-border-hairline'}`}
    >
      <span
        className={`flex size-56 shrink-0 items-center justify-center rounded-full ${positive ? 'bg-bg-success-soft text-text-gold' : action ? 'bg-bg-notice text-text-gold' : 'bg-bg-muted text-text-muted'}`}
      >
        <Icon
          name={positive ? 'verify-filled' : status === 'changesRequested' ? 'document-text' : 'shield-tick'}
          size={28}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-8">
          <h3 className="type-label-large text-text-primary">{t('professional')}</h3>
          <PortalStatus status={status} />
        </div>
        {name && <p className="mt-4 type-body-caption text-text-muted">{name}</p>}
      </div>
      <ButtonLink
        href="/my/professional"
        variant={action ? 'primary' : 'outline'}
        size="sm"
        className="col-span-2 w-full tablet:w-auto"
      >
        {t('viewProfessional')}
      </ButtonLink>
    </article>
  );
}

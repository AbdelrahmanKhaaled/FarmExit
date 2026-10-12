import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Marketplace Filters → Trust Note (Layout = Row · Stacked).
 * Ivory, gold hairline, r16. 44px white seal (Premium Rest) with the gold Verify Filled icon, Label/Medium title,
 * Body/Caption body, Label/Small Strong brand link with an arrow. One per results page. Row from tablet, stacked on mobile.
 */
export function TrustNote({
  title,
  body,
  linkLabel,
  href,
  className,
}: {
  title: ReactNode;
  body: ReactNode;
  linkLabel: ReactNode;
  href: ComponentProps<typeof Link>['href'];
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'flex flex-col items-start gap-12 rounded-2xl border border-overlay-gold-hairline bg-bg-ivory p-16',
        'tablet:flex-row tablet:items-center tablet:gap-16 tablet:py-16 tablet:ps-16 tablet:pe-24',
        className,
      )}
    >
      <span className="flex size-44 shrink-0 items-center justify-center rounded-full bg-bg-surface text-brand-gold shadow-premium-rest">
        <Icon name="verify-filled" size={24} />
      </span>
      <div className="flex min-w-0 grow flex-col gap-2">
        <p className="type-label-medium text-text-primary">{title}</p>
        <p className="type-body-caption text-text-muted">{body}</p>
      </div>
      <Link
        href={href}
        className="flex shrink-0 items-center gap-6 type-label-small-strong text-text-brand transition-colors duration-150 hover:text-brand-primary-hover"
      >
        {linkLabel}
        <Icon name="arrow-right" size={16} />
      </Link>
    </aside>
  );
}

/*
 * Figma: Components → Group / Marketplace Filters → Empty State. White card, hairline, Premium Rest, r24, padding
 * 72/40, centred: 88px bg/success-soft medallion (border/subtle) with a 40px icon, Heading/H4 title, Body/Default body
 * (480), then the actions (Primary + Outline L).
 */
export function EmptyState({
  icon = 'search-status',
  title,
  body,
  actions,
  className,
}: {
  icon?: IconName;
  title: ReactNode;
  body: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center gap-20 rounded-card border border-border-hairline bg-bg-surface px-24 py-48 text-center',
        'shadow-premium-rest tablet:px-40 tablet:py-72',
        className,
      )}
    >
      <span className="flex size-88 items-center justify-center rounded-full border border-border-subtle bg-bg-success-soft text-text-brand">
        <Icon name={icon} size={40} />
      </span>
      <div className="flex max-w-480 flex-col items-center gap-10">
        <p className="type-heading-h4 text-text-primary">{title}</p>
        <p className="type-body-default text-text-body">{body}</p>
      </div>
      {actions && <div className="flex flex-wrap justify-center gap-12">{actions}</div>}
    </div>
  );
}

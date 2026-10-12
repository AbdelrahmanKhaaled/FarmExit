import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Badges (+ Badge / Status, Badge / Photo Glass).
 * "Each badge is its own component with a Label property — never recolour one to mean something else."
 * So each badge is a separate export with a fixed look; callers pass only the label (from messages).
 * The "FarmExit Verified" badge is intentionally absent: it was removed from the public UI (Source of Truth 4p).
 */

type LabelProps = { children: ReactNode; className?: string };

const Dot = ({ className }: { className: string }) => (
  <span aria-hidden="true" className={cn('shrink-0 rounded-full', className)} />
);

/* Badge / Status — Neutral · Review · Action · Positive · Negative (pill, 7px dot, Label/Tag Strong). */
const STATUS = {
  neutral: { box: 'bg-bg-muted text-text-muted', dot: 'bg-text-muted' },
  review: { box: 'border border-overlay-gold-hairline bg-bg-ivory text-text-gold', dot: 'bg-text-gold' },
  action: { box: 'bg-bg-notice text-text-notice', dot: 'bg-text-notice' },
  positive: { box: 'bg-bg-success-soft text-text-brand', dot: 'bg-text-brand' },
  negative: { box: 'border border-status-favorite bg-bg-surface text-status-favorite', dot: 'bg-status-favorite' },
} as const;

export type StatusTone = keyof typeof STATUS;

export function StatusBadge({ tone, children, className }: LabelProps & { tone: StatusTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-6 rounded-full py-5 ps-10 pe-12 type-label-tag-strong',
        STATUS[tone].box,
        className,
      )}
    >
      <Dot className={cn('size-7', STATUS[tone].dot)} />
      {children}
    </span>
  );
}

/* Badge / Listing Type — light glass pill on photos ("For sale", "For rent"). */
export function ListingTypeBadge({ children, className }: LabelProps) {
  return (
    <span
      className={cn(
        'inline-flex h-28 items-center gap-8 rounded-full border border-overlay-glass-light-border bg-overlay-glass-light px-12',
        'effect-nav-glass type-label-tag-strong text-text-brand',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* Badge / Request — "Management request" on brand/primary. */
export function RequestBadge({ children, className }: LabelProps) {
  return (
    <span
      className={cn(
        'inline-flex h-28 items-center gap-8 rounded-sm bg-brand-primary px-12 type-label-request-badge text-text-on-dark',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* Badge / Reviewed — check + "Reviewed by FarmExit" (workflow wording kept in 4p). */
export function ReviewedBadge({ children, className }: LabelProps) {
  return (
    <span className={cn('inline-flex items-center gap-6 type-label-tag-strong text-text-brand', className)}>
      <Icon name="check" size={12} className="text-brand-accent" />
      {children}
    </span>
  );
}

/* Badge / Service Tag — outlined tag ("Irrigation"). */
export function ServiceTag({ children, className }: LabelProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-8 rounded-sm border border-border-strong bg-bg-surface px-10 py-6 type-label-tag text-text-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* Badge / Audience Gold · Audience Soft. */
export function AudienceBadge({ tone, children, className }: LabelProps & { tone: 'gold' | 'soft' }) {
  return (
    <span
      className={cn(
        'inline-flex h-30 items-center gap-8 rounded-sm px-12 type-label-request-badge',
        tone === 'gold' ? 'bg-brand-gold text-text-primary' : 'bg-bg-success-soft text-text-brand',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* Badge / Notice — ivory-gold note with a gold dot. */
export function NoticeBadge({ children, className }: LabelProps) {
  return (
    <p
      className={cn(
        'flex items-center gap-10 rounded-lg bg-bg-notice px-14 py-10 type-label-small-strong text-text-notice',
        className,
      )}
    >
      <Dot className="size-8 bg-brand-gold" />
      <span>{children}</span>
    </p>
  );
}

/* Badge / Hero Pill — glass pill with a gold dot, on dark photography. */
export function HeroPill({ children, className }: LabelProps) {
  return (
    <span
      className={cn(
        'inline-flex h-34 items-center gap-10 rounded-full border border-overlay-glass-border bg-overlay-glass px-14',
        'effect-hero-glass type-label-tag text-text-on-dark',
        className,
      )}
    >
      <Dot className="size-7 bg-brand-gold" />
      {children}
    </span>
  );
}

/* Badge / Photo Glass — deep glass pill with an icon, on photos. */
export function PhotoGlassBadge({ icon, children, className }: LabelProps & { icon: IconName }) {
  return (
    <span
      className={cn(
        'inline-flex h-32 items-center gap-6 rounded-full border border-overlay-glass-border bg-overlay-deep-glass ps-8 pe-14',
        'effect-nav-glass type-label-badge text-text-on-dark',
        className,
      )}
    >
      <Icon name={icon} size={18} />
      {children}
    </span>
  );
}

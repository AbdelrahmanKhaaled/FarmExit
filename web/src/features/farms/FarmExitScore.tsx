import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';

/*
 * FarmExit Score — FarmExit's own evaluation of a farm, never a customer rating (Source of Truth; Farm Details
 * States & Behaviour: "every place it appears says so"). Restored from the Figma components hidden by the
 * 11 Oct cleanup, with two corrections from the product decision of 12 Oct:
 * - the "Verified on site · Aug 2026" line becomes the not-a-customer-rating line (no site-visit claim);
 * - no factors, weights, formula or "View evaluation" expansion: the methodology is still open
 *   (Business/content validation required).
 */

const format = (score: number) => score.toFixed(1);

/* Overline/Score is uppercase; Arabic script has no case, so in Arabic it would only turn the brand into "FARMEXIT". */
const LABEL = 'type-overline-score rtl:normal-case';

/* Score Segments: five 6px segments (r3, gap 4) on track/default; segment i fills min(max(score − i, 0), 1). */
function ScoreSegments({ score }: { score: number }) {
  return (
    <div aria-hidden="true" className="flex h-6 gap-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="flex-1 overflow-hidden rounded-[3px] bg-track-default">
          <span
            className="block h-full rounded-[3px] bg-brand-accent"
            style={{ inlineSize: `${Math.min(Math.max(score - i, 0), 1) * 100}%` }}
          />
        </span>
      ))}
    </div>
  );
}

/**
 * Figma: Group / FarmExit Score → FarmExit Score (State = Default). Ivory glow surface, hairline, r16, padding 16,
 * gap 12: gold seal 28 · "FarmExit Score" (Overline/Score, brand) over the evaluation line (Label/Caption, muted) ·
 * 4.8 (Heading/Score, brand) /5 (Label/Button, muted); then the segment meter.
 */
export function FarmExitScore({ score, className }: { score: number; className?: string }) {
  const t = useTranslations('farm.score');
  return (
    <div
      role="group"
      aria-label={t('a11y', { score: format(score) })}
      data-testid="farmexit-score"
      className={cn(
        'flex flex-col gap-12 rounded-2xl border border-border-hairline bg-linear-to-b from-bg-surface to-bg-ivory p-16',
        className,
      )}
    >
      <div className="flex items-center gap-10">
        <Icon name="verify-filled" size={28} className="text-brand-gold" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className={cn(LABEL, 'text-text-brand')}>{t('label')}</p>
          <p className="type-label-caption text-text-muted">{t('note')}</p>
        </div>
        <p aria-hidden="true" className="flex shrink-0 items-baseline gap-3">
          <span className="type-heading-score text-text-brand">{format(score)}</span>
          <span className="type-label-button text-text-muted">{t('outOf')}</span>
        </p>
      </div>
      <ScoreSegments score={score} />
    </div>
  );
}

/**
 * Figma: Group / Farm Details → Score Glass (Show Reviewed = off). Compact chip on hero photography: deep glass,
 * gold hairline, r16, Glass/Hero Panel; seal 24 · label (Overline/Score) · 4.8 (Heading/Score) /5 (Body/Caption).
 */
export function ScoreGlass({ score, className }: { score: number; className?: string }) {
  const t = useTranslations('farm.score');
  return (
    <p
      aria-label={t('a11y', { score: format(score) })}
      className={cn(
        'inline-flex items-center gap-10 rounded-2xl border border-overlay-gold-hairline bg-overlay-deep-glass py-10 ps-12 pe-16',
        'effect-hero-panel text-text-on-dark',
        className,
      )}
    >
      <Icon name="verify-filled" size={24} className="text-brand-gold" />
      <span aria-hidden="true" className={LABEL}>
        {t('label')}
      </span>
      <span aria-hidden="true" className="flex items-baseline gap-3">
        <span className="type-heading-score">{format(score)}</span>
        <span className="type-body-caption text-overlay-on-dark-muted">{t('outOf')}</span>
      </span>
    </p>
  );
}

/** Figma: Sticky Action Bar › Score Line — "FarmExit Score 4.8 /5" (Label/Caption Strong, text/gold). */
export function ScoreLine({ score, className }: { score: number; className?: string }) {
  const t = useTranslations('farm.score');
  return (
    <p
      aria-label={t('a11y', { score: format(score) })}
      className={cn('type-label-caption-strong text-text-gold', className)}
    >
      <span aria-hidden="true">{t('line', { score: format(score) })}</span>
    </p>
  );
}

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './Container';

/*
 * Page section on a Figma background. Rhythm comes from the Responsive collection:
 * - spacing="band": coloured bands padded layout/band-padding (128 · 96 · 72)
 * - spacing="none": plain sections; stack them in a column with `gap-r-section-gap` (144 · 112 · 80)
 */
const TONES = {
  page: '',
  surface: 'bg-bg-surface',
  ivory: 'bg-bg-ivory',
  subtle: 'bg-bg-subtle',
  deep: 'bg-brand-deep text-text-on-dark',
  brand: 'bg-brand-primary text-text-on-dark',
} as const;

export type SectionProps = {
  tone?: keyof typeof TONES;
  spacing?: 'band' | 'none';
  /** Wrap children in the page Container (default). Set false for full-bleed content. */
  contained?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'section'>, 'className' | 'children'>;

export function Section({
  tone = 'page',
  spacing = 'none',
  contained = true,
  children,
  className,
  ...rest
}: SectionProps) {
  return (
    <section className={cn(TONES[tone], spacing === 'band' && 'py-r-band-padding', className)} {...rest}>
      {contained ? <Container>{children}</Container> : children}
    </section>
  );
}

/*
 * Figma: Components → Group / Navigation & Layout → Section Header (Tone Light · Dark).
 * Eyebrow (Overline/Section) + H1 Section (736) on the start side, supporting copy (400, Body/Default)
 * bottom-aligned on the end side. Stacks below desktop (gap 14, subtitle 560, as in the Tablet 1024 frame),
 * where 736 + 64 + 400 no longer fits the column.
 * Arabic: the titles render about 6% wider in browsers than in Figma (Figma's -3% tracking on Arabic plus font
 * metric differences), so on desktop the RTL title measure is 780 and the subtitle may shrink, keeping the approved
 * Arabic line breaks (page 08).
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  tone = 'light',
  titleAs: TitleTag = 'h2',
  titleId,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: 'light' | 'dark';
  titleAs?: 'h1' | 'h2' | 'h3';
  /** Id for the title, so the section can reference it with aria-labelledby. */
  titleId?: string;
  className?: string;
}) {
  const dark = tone === 'dark';
  return (
    <header
      className={cn(
        'flex flex-col gap-14 desktop:flex-row desktop:items-end desktop:justify-between desktop:gap-64',
        className,
      )}
    >
      <div className="flex max-w-736 flex-col gap-14 rtl:max-w-780 desktop:rtl:shrink-0">
        {eyebrow && (
          <p className={cn('type-overline-section', dark ? 'text-brand-accent-soft' : 'text-text-accent')}>{eyebrow}</p>
        )}
        <TitleTag
          id={titleId}
          className={cn('type-heading-h1-section', dark ? 'text-text-on-dark' : 'text-text-brand')}
        >
          {title}
        </TitleTag>
      </div>
      {subtitle && (
        <p
          className={cn(
            'max-w-560 type-body-default desktop:w-400 desktop:max-w-none desktop:shrink-0 desktop:rtl:shrink',
            dark ? 'text-overlay-on-dark-muted' : 'text-text-body',
          )}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}

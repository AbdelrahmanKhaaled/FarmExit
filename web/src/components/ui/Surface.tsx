import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cn } from '@/lib/cn';

type Polymorphic<T extends ElementType, Own> = Own & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof Own | 'as'>;

const RADIUS = {
  none: '',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  image: 'rounded-image',
  '3xl': 'rounded-3xl',
  card: 'rounded-card',
  feature: 'rounded-feature',
} as const;

const PADDING = {
  none: '',
  sm: 'p-16',
  md: 'p-24',
  lg: 'p-28',
  xl: 'p-32',
} as const;

export type SurfaceRadius = keyof typeof RADIUS;
export type SurfacePadding = keyof typeof PADDING;

/*
 * Surface: a plain container on one of the Figma background tokens. Use it for bands, panels and wells.
 * Dark tones (deep, brand) set `text-on-dark` so nested Text with tone="inherit" stays legible.
 */
const TONES = {
  page: 'bg-bg-page',
  surface: 'bg-bg-surface',
  subtle: 'bg-bg-subtle',
  muted: 'bg-bg-muted',
  ivory: 'bg-bg-ivory',
  notice: 'bg-bg-notice',
  'success-soft': 'bg-bg-success-soft',
  deep: 'bg-brand-deep text-text-on-dark',
  brand: 'bg-brand-primary text-text-on-dark',
} as const;

export type SurfaceTone = keyof typeof TONES;

export function Surface<T extends ElementType = 'div'>({
  as,
  tone = 'surface',
  radius = 'none',
  padding = 'none',
  bordered = false,
  className,
  ...rest
}: Polymorphic<
  T,
  { tone?: SurfaceTone; radius?: SurfaceRadius; padding?: SurfacePadding; bordered?: boolean; className?: string }
>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component
      className={cn(
        TONES[tone],
        RADIUS[radius],
        PADDING[padding],
        bordered && 'border border-border-default',
        className,
      )}
      {...rest}
    />
  );
}

/*
 * Card (Source of Truth §5 "Cards in general"): white, hairline border, Elevation/Premium Rest;
 * hover = Elevation/Premium Lift (desktop only: `hover:` needs a hover-capable pointer). Dark cards are brand green.
 */
const LIGHT_SURFACES = { surface: 'bg-bg-surface', muted: 'bg-bg-muted', page: 'bg-bg-page' } as const;

export function Card<T extends ElementType = 'div'>({
  as,
  tone = 'light',
  surface = 'surface',
  interactive = false,
  radius = 'card',
  padding = 'md',
  className,
  ...rest
}: Polymorphic<
  T,
  {
    tone?: 'light' | 'dark';
    /** Light cards only: Figma Request Card uses bg/muted, Role Card bg/page. */
    surface?: 'surface' | 'muted' | 'page';
    /** Lift on hover and show the focus ring of a nested link/button on the card (`:focus-within`). */
    interactive?: boolean;
    radius?: SurfaceRadius;
    padding?: SurfacePadding;
    className?: string;
  }
>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component
      className={cn(
        'relative border',
        tone === 'light'
          ? cn('border-border-hairline text-text-primary', LIGHT_SURFACES[surface])
          : 'border-brand-primary bg-brand-primary text-text-on-dark',
        'shadow-premium-rest',
        interactive && 'transition-shadow duration-150 hover:shadow-premium-lift',
        RADIUS[radius],
        PADDING[padding],
        className,
      )}
      {...rest}
    />
  );
}

/*
 * Figma: Components → Group / Storytelling → Glass Info Card (Tone Dark · Light × Rest · Hover).
 * Dark = overlay/deep-glass on bright/warm photos; Light = overlay/glass-light on shaded ones.
 * Elevation/Floating Glass (shadow + 24px background blur); hover = gold hairline + Premium Lift.
 */
const GLASS = {
  dark: 'border-overlay-glass-border bg-overlay-deep-glass text-text-on-dark effect-floating-glass',
  light: 'border-overlay-glass-light-border bg-overlay-glass-light text-text-primary effect-floating-glass',
} as const;

export function GlassPanel<T extends ElementType = 'div'>({
  as,
  tone = 'dark',
  interactive = false,
  radius = '3xl',
  padding = 'lg',
  className,
  ...rest
}: Polymorphic<
  T,
  {
    tone?: keyof typeof GLASS;
    interactive?: boolean;
    radius?: SurfaceRadius;
    padding?: SurfacePadding;
    className?: string;
  }
>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component
      className={cn(
        'border',
        GLASS[tone],
        interactive &&
          'transition-[box-shadow,border-color] duration-150 hover:border-overlay-gold-hairline hover:shadow-premium-lift',
        RADIUS[radius],
        PADDING[padding],
        className,
      )}
      {...rest}
    />
  );
}

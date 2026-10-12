import type { ElementType, ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';
import type { tokenManifest } from '@/styles/token-manifest.generated';

/** Every Figma text style, as its generated `type-*` utility (e.g. `heading-h1-section`, `label-button`). */
export type TextVariant = (typeof tokenManifest)['text'][number]['className'] extends `type-${infer V}` ? V : never;

// Literal class names so Tailwind generates them. Only semantic text colours from the Figma Color collection.
const TONES = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  body: 'text-text-body',
  muted: 'text-text-muted',
  subtle: 'text-text-subtle',
  brand: 'text-text-brand',
  accent: 'text-text-accent',
  'accent-soft': 'text-brand-accent-soft',
  gold: 'text-text-gold',
  notice: 'text-text-notice',
  disabled: 'text-text-disabled',
  danger: 'text-status-favorite',
  'on-dark': 'text-text-on-dark',
  'on-dark-body': 'text-overlay-on-dark-body',
  'on-dark-muted': 'text-overlay-on-dark-muted',
  inherit: '',
} as const;

export type TextTone = keyof typeof TONES;

type TextOwnProps<T extends ElementType> = {
  as?: T;
  /** Figma text style. Responsive styles (Display/Hero, H1 Section, Lead…) scale with the breakpoint tokens. */
  variant: TextVariant;
  tone?: TextTone;
};

export type TextProps<T extends ElementType = 'p'> = TextOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps<T>>;

/** Text primitive: one Figma text style + one semantic colour. Font family and tracking follow the locale. */
export function Text<T extends ElementType = 'p'>({ as, variant, tone = 'inherit', className, ...rest }: TextProps<T>) {
  const Component: ElementType = as ?? 'p';
  return <Component className={cn(`type-${variant}`, TONES[tone], className)} {...rest} />;
}

import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Buttons → Icon Button.
 * Carousel 52 (r14) · Arrow Tile 40 (r12) · Favorite 38 (round glass, 44 hit area) · Menu 44 (r12) ·
 * Round 44 (bg/muted circle: dialog Back/Close, navbar notifications).
 */
export type IconButtonVariant =
  'carousel-outline' | 'carousel-accent' | 'tile-accent' | 'tile-inverse' | 'menu' | 'round' | 'favorite';

const VARIANTS: Record<IconButtonVariant, { box: string; icon: number }> = {
  'carousel-outline': {
    box: 'size-52 rounded-xl border-[1.5px] border-brand-primary bg-bg-surface text-text-brand hover:bg-bg-hover active:bg-bg-success-soft',
    icon: 18,
  },
  'carousel-accent': {
    box: 'size-52 rounded-xl bg-brand-accent text-text-on-dark hover:bg-brand-primary active:bg-brand-accent-pressed',
    icon: 18,
  },
  'tile-accent': {
    box: 'size-40 rounded-lg bg-brand-accent text-text-on-dark hover:bg-brand-primary active:bg-brand-accent-pressed',
    icon: 16,
  },
  'tile-inverse': {
    box: 'size-40 rounded-lg bg-bg-surface text-text-brand hover:bg-bg-hover active:bg-bg-success-soft',
    icon: 16,
  },
  menu: {
    box: 'size-44 rounded-lg border border-border-strong bg-bg-surface text-text-primary hover:border-brand-primary active:bg-bg-hover',
    icon: 22,
  },
  round: {
    box: 'size-44 rounded-full bg-bg-muted text-text-primary hover:bg-bg-hover active:bg-bg-success-soft',
    icon: 20,
  },
  favorite: {
    // 38px glass button inside a 44px transparent hit area (Figma mobile validation note).
    box:
      'size-44 rounded-full text-text-primary before:absolute before:inset-3 before:rounded-full ' +
      'before:border before:border-overlay-glass-light-border before:bg-overlay-glass-light before:effect-nav-glass ' +
      'aria-pressed:text-status-favorite',
    icon: 17,
  },
};

const BASE =
  'relative inline-flex shrink-0 items-center justify-center transition-colors duration-150 disabled:opacity-50';

export function iconButtonClasses(variant: IconButtonVariant) {
  return cn(BASE, VARIANTS[variant].box);
}

type OwnProps = {
  variant: IconButtonVariant;
  icon: IconName;
  /** Accessible name (from messages). Icon buttons have no visible text. */
  label: string;
};

export function IconButton({
  variant,
  icon,
  label,
  className,
  type = 'button',
  ...rest
}: OwnProps & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button type={type} aria-label={label} className={cn(iconButtonClasses(variant), className)} {...rest}>
      <Icon name={icon} size={VARIANTS[variant].icon} className="relative" />
    </button>
  );
}

export function IconButtonLink({
  variant,
  icon,
  label,
  className,
  ...rest
}: OwnProps & Omit<ComponentProps<typeof Link>, 'children'>) {
  return (
    <Link aria-label={label} className={cn(iconButtonClasses(variant), className)} {...rest}>
      <Icon name={icon} size={VARIANTS[variant].icon} className="relative" />
    </Link>
  );
}

/** Figma Icon Button / Favorite: Default (heart outline) · Saved (heart filled, status/favorite). */
export function FavoriteButton({
  saved,
  label,
  className,
  ...rest
}: { saved: boolean; label: string } & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <IconButton
      variant="favorite"
      icon={saved ? 'heart-filled' : 'heart'}
      label={label}
      aria-pressed={saved}
      className={className}
      {...rest}
    />
  );
}

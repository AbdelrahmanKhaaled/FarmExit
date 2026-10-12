import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Buttons → Button (Style × Size × State).
 * Primary = main brand action · Accent (lime) = search, details, browse · Outline = secondary and "applied" ·
 * Ghost = Sign in. Heights 42 · 46 · 52. Hover/Pressed/Disabled fills come from the Figma variants.
 * `hover:` only applies on hover-capable devices (Tailwind v4), matching "tablet: press states only".
 */
export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors duration-150 ' +
  'disabled:pointer-events-none aria-disabled:pointer-events-none';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-42 gap-8 px-18 rounded-lg type-label-button',
  md: 'h-46 gap-8 px-18 rounded-lg type-label-button',
  lg: 'h-52 gap-10 px-26 rounded-xl type-label-medium',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-primary text-text-on-dark hover:bg-brand-primary-hover active:bg-brand-primary-pressed ' +
    'disabled:bg-bg-disabled disabled:text-text-disabled aria-disabled:bg-bg-disabled aria-disabled:text-text-disabled',
  accent:
    'bg-brand-accent text-text-on-dark hover:bg-brand-primary active:bg-brand-accent-pressed ' +
    'disabled:bg-bg-disabled disabled:text-text-disabled aria-disabled:bg-bg-disabled aria-disabled:text-text-disabled',
  outline:
    'border-[1.5px] border-brand-primary bg-bg-surface text-text-brand hover:bg-brand-primary hover:text-text-on-dark ' +
    'active:bg-bg-hover active:text-text-brand disabled:border-border-default disabled:text-text-disabled ' +
    'aria-disabled:border-border-default aria-disabled:text-text-disabled',
  ghost:
    'text-text-brand hover:bg-bg-hover active:bg-bg-success-soft disabled:text-text-disabled aria-disabled:text-text-disabled',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 14, lg: 16 };

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {}) {
  return cn(BASE, SIZES[size], VARIANTS[variant], fullWidth && 'w-full');
}

type ContentProps = {
  /** Trailing arrow from the Figma variants. Hidden in Arabic, as on the approved Arabic screens. */
  arrow?: boolean;
  /** Leading icon from the approved set (e.g. `search` on the Search Button). */
  icon?: IconName;
  children: ReactNode;
};

function ButtonContent({ arrow, icon, size, children }: ContentProps & { size: ButtonSize }) {
  return (
    <>
      {icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      {children}
      {arrow && <Icon name="arrow-right" size={ICON_SIZE[size]} className="rtl:hidden" />}
    </>
  );
}

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean };

export type ButtonProps = StyleProps & ContentProps & Omit<ComponentProps<'button'>, 'children'>;

export function Button({
  variant,
  size = 'md',
  fullWidth,
  arrow,
  icon,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cn(buttonClasses({ variant, size, fullWidth }), className)} {...rest}>
      <ButtonContent arrow={arrow} icon={icon} size={size}>
        {children}
      </ButtonContent>
    </button>
  );
}

export type ButtonLinkProps = StyleProps & ContentProps & Omit<ComponentProps<typeof Link>, 'children'>;

/** A locale-aware link styled as a Button. */
export function ButtonLink({
  variant,
  size = 'md',
  fullWidth,
  arrow,
  icon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClasses({ variant, size, fullWidth }), className)} {...rest}>
      <ButtonContent arrow={arrow} icon={icon} size={size}>
        {children}
      </ButtonContent>
    </Link>
  );
}

/*
 * Figma: Button / Block — full-width label + arrow rows (Primary / Outline / Inverse × Large 52 / Medium 48).
 */
export type BlockVariant = 'primary' | 'outline' | 'inverse';

const BLOCK_SIZES = {
  lg: 'h-52 px-22 rounded-xl',
  md: 'h-48 px-20 rounded-lg',
} as const;

/* `multiline`: the label wraps instead of truncating; a one-line label keeps the same height. */
const BLOCK_SIZES_MULTILINE = {
  lg: 'min-h-52 py-12 px-22 rounded-xl',
  md: 'min-h-48 py-10 px-20 rounded-lg',
} as const;

const BLOCK_VARIANTS: Record<BlockVariant, string> = {
  primary: 'bg-brand-primary text-text-on-dark hover:bg-brand-primary-hover active:bg-brand-primary-pressed',
  outline: 'border-[1.5px] border-brand-primary text-text-brand hover:bg-bg-hover active:bg-bg-success-soft',
  inverse: 'bg-bg-surface text-text-brand hover:bg-bg-hover active:bg-bg-success-soft',
};

export function blockClasses({
  variant = 'primary',
  size = 'lg',
  multiline,
}: {
  variant?: BlockVariant;
  size?: 'lg' | 'md';
  multiline?: boolean;
}) {
  return cn(
    'flex w-full items-center justify-between gap-12 transition-colors duration-150 type-label-medium',
    multiline ? BLOCK_SIZES_MULTILINE[size] : BLOCK_SIZES[size],
    BLOCK_VARIANTS[variant],
  );
}

type BlockOwnProps = { variant?: BlockVariant; size?: 'lg' | 'md'; multiline?: boolean; children: ReactNode };

function BlockContent({ multiline, children }: { multiline?: boolean; children: ReactNode }) {
  return (
    <>
      <span className={multiline ? 'min-w-0 text-start' : 'truncate'}>{children}</span>
      <Icon name="arrow-right" size={16} className="shrink-0" />
    </>
  );
}

export function BlockButton({
  variant,
  size,
  multiline,
  className,
  type = 'button',
  children,
  ...rest
}: BlockOwnProps & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button type={type} className={cn(blockClasses({ variant, size, multiline }), className)} {...rest}>
      <BlockContent multiline={multiline}>{children}</BlockContent>
    </button>
  );
}

export function BlockButtonLink({
  variant,
  size,
  multiline,
  className,
  children,
  ...rest
}: BlockOwnProps & Omit<ComponentProps<typeof Link>, 'children'>) {
  return (
    <Link className={cn(blockClasses({ variant, size, multiline }), className)} {...rest}>
      <BlockContent multiline={multiline}>{children}</BlockContent>
    </Link>
  );
}

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

/*
 * The approved FarmExit logo (FarmExitLogo.svg). The files in /public/brand are the Figma Logo component
 * variants exported unchanged (Components → Group / Icons & Logo → Logo). Never redraw, recolour or mirror it.
 * Usage: Horizontal → navbar (48 desktop, 40 tablet) · Full (stacked) → footer, branding (≥ 40) ·
 * Icon only → compact/mobile headers (≥ 24). Light on white or bg/page, Dark on brand/deep and photos.
 */
const VARIANTS = {
  horizontal: { width: 150.51, height: 48 },
  full: { width: 92.41, height: 64 },
  icon: { width: 42.27, height: 48 },
} as const;

export type LogoVariant = keyof typeof VARIANTS;

export type LogoProps = {
  variant?: LogoVariant;
  tone?: 'light' | 'dark';
  /** Rendered height in px; width follows the artwork ratio. */
  height?: number;
  /** Responsive sizing classes (e.g. `h-40 desktop:h-48 w-auto`); overrides `height` visually. */
  className?: string;
  priority?: boolean;
};

export function Logo({ variant = 'horizontal', tone = 'light', height, className, priority }: LogoProps) {
  const t = useTranslations('common');
  const size = VARIANTS[variant];
  const h = height ?? size.height;
  const w = Math.round((size.width / size.height) * h * 100) / 100;

  return (
    <Image
      src={`/brand/logo-${variant}-${tone}.svg`}
      alt={t('brandName')}
      width={w}
      height={h}
      unoptimized
      priority={priority}
      className={cn('block max-w-none', className)}
    />
  );
}

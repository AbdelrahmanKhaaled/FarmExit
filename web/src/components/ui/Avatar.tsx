import { cn } from '@/lib/cn';

/* Figma: Components → Group / My FarmExit → Avatar (S 32 · M 44 · L 88). Initials on brand/primary, gold hairline. */
const SIZES = {
  sm: 'size-32 border-[1.5px] type-label-caption-strong',
  md: 'size-44 border-[1.5px] type-label-small-strong',
  lg: 'size-88 border-2 type-heading-h4',
} as const;

export type AvatarProps = {
  initials: string;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Decorative by default: pair it with the person's visible name. */
export function Avatar({ initials, size = 'sm', className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border-overlay-gold-hairline bg-brand-primary text-text-on-dark',
        SIZES[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}

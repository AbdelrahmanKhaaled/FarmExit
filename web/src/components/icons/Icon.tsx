import type { SVGProps } from 'react';
import { cn } from '@/lib/cn';
import { iconPaths, type IconName } from './icon-paths';

// Directional icons mirror in RTL (Source of Truth: "directional arrows are flipped").
const DIRECTIONAL = new Set<IconName>(['arrow-right', 'arrow-left', 'logout']);

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName;
  /** Rendered size in px (Figma uses 12–24). */
  size?: number;
  /** Accessible name. Without it the icon is decorative and hidden from assistive tech. */
  label?: string;
};

/** Icon from the approved Figma set. Colour follows `currentColor`, so set it with a `text-*` class. */
export function Icon({ name, size = 24, label, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      className={cn('shrink-0', DIRECTIONAL.has(name) && 'rtl:-scale-x-100', className)}
      {...rest}
    >
      {iconPaths[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export type { IconName };

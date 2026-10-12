import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cn } from '@/lib/cn';

/*
 * Page container from the Figma Responsive collection.
 * - content: 1200 content in a 1440 frame with 120 margins (desktop), 40 margins (tablet), 16 (mobile).
 *   Desktop is built as Spacing layout/content-max 1280 with layout/page-gutter 40, as the Navbar is, so the
 *   1200 column holds from 1280 up and margins grow beyond 1440.
 * - app: My FarmExit / workspace grid — layout/app-margin 64 · 40 · 16 around app-content-width 1312 · 944 · 358.
 */
const SIZES = {
  content: 'max-w-content-max px-r-page-margin desktop:px-page-gutter',
  app: 'max-w-[calc(var(--spacing-r-app-content-width)+var(--spacing-r-app-margin)*2)] px-r-app-margin',
} as const;

export type ContainerProps<T extends ElementType> = {
  as?: T;
  size?: keyof typeof SIZES;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

export function Container<T extends ElementType = 'div'>({
  as,
  size = 'content',
  className,
  ...rest
}: ContainerProps<T>) {
  const Component: ElementType = as ?? 'div';
  return <Component className={cn('mx-auto w-full', SIZES[size], className)} {...rest} />;
}

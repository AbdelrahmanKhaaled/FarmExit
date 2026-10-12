'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { OverlayHeader } from './OverlayHeader';
import { useModalDialog } from './use-modal-dialog';

/*
 * Modal dialog. Figma: Components → Group / Authentication → Auth Layout.
 * - Tablet and desktop: Layout=Dialog — 480 wide, r24, white, hairline border, Elevation/Floating Glass,
 *   padding 24/40/40, gap 28, over a brand/deep 50% scrim.
 * - Mobile: Layout=Sheet — full screen, padding 12/24/24, gap 24.
 * - size="wide": the same dialog at up to 960 on tablet and desktop, for media (Farm Details "View all photos").
 * Motion (Source of Truth 4m): dissolve 200 ms, no scaling. Styles live in src/styles/overlays.css.
 */
export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title, shown in the header. */
  title: ReactNode;
  description?: ReactNode;
  /** Shows the round Back button (multi-step flows). */
  onBack?: () => void;
  size?: 'default' | 'wide';
  children: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  onBack,
  size = 'default',
  children,
  className,
}: DialogProps) {
  const dialog = useModalDialog(open, onOpenChange);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      {...dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'fx-overlay fx-dialog m-auto size-full max-h-none max-w-none bg-transparent p-0',
        'tablet:h-fit tablet:max-h-[calc(100dvh-48px)]',
        size === 'wide' ? 'tablet:w-[min(960px,calc(100vw-80px))]' : 'tablet:w-480',
      )}
    >
      <div
        className={cn(
          'flex size-full flex-col gap-24 overflow-y-auto bg-bg-surface px-24 pt-12 pb-24',
          'tablet:gap-28 tablet:rounded-card tablet:border tablet:border-border-hairline tablet:px-40 tablet:pt-24 tablet:pb-40',
          'tablet:effect-floating-glass',
          className,
        )}
      >
        <OverlayHeader
          titleId={titleId}
          descriptionId={descriptionId}
          title={title}
          description={description}
          onBack={onBack}
          onClose={() => onOpenChange(false)}
        />
        {children}
      </div>
    </dialog>
  );
}

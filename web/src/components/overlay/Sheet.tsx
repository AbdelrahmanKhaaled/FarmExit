'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { OverlayHeader } from './OverlayHeader';
import { useModalDialog } from './use-modal-dialog';

/*
 * Sheet / drawer on a native <dialog>.
 * - side="bottom": Figma Filter Drawer — white, r24 top corners, Elevation/Floating Glass, grabber, header with
 *   Heading/H4 title + Label/Caption summary + 44px close, scrolling body, sticky footer (Clear all + Show N).
 * - side="end": side sheet (Opportunity Preview / Partnership details) — 560 wide on tablet and desktop,
 *   full screen on mobile. Slides from the inline end, so it mirrors in Arabic.
 * Motion: slide 300 ms ease-out, no bounce (Source of Truth 4m). Styles in src/styles/overlays.css.
 */
export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Summary under the title (e.g. "1 applied · 214 farms"). */
  description?: ReactNode;
  side?: 'bottom' | 'end';
  /** Sticky actions at the bottom (e.g. Clear all + Show N farms). */
  footer?: ReactNode;
  children: ReactNode;
};

export function Sheet({ open, onOpenChange, title, description, side = 'bottom', footer, children }: SheetProps) {
  const dialog = useModalDialog(open, onOpenChange);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      {...dialog}
      data-side={side}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'fx-overlay fx-sheet max-w-none bg-transparent p-0',
        side === 'bottom'
          ? 'inset-x-0 top-auto bottom-0 m-0 h-auto max-h-[calc(100dvh-56px)] w-full'
          : 'my-0 ms-auto me-0 h-dvh max-h-none w-full tablet:w-560',
      )}
    >
      <div
        className={cn(
          'flex size-full flex-col bg-bg-surface effect-floating-glass',
          side === 'bottom' ? 'max-h-[calc(100dvh-56px)] rounded-t-card' : 'h-dvh',
        )}
      >
        {side === 'bottom' && (
          <div aria-hidden="true" className="flex shrink-0 justify-center pt-10 pb-2">
            <span className="h-4 w-40 rounded-full bg-border-strong" />
          </div>
        )}
        <OverlayHeader
          titleId={titleId}
          descriptionId={descriptionId}
          title={title}
          description={description}
          onClose={() => onOpenChange(false)}
          className={cn(
            'shrink-0 border-b border-border-subtle pb-8 ps-16 pe-8',
            side === 'bottom' ? 'pt-4' : 'pt-12 tablet:ps-24 tablet:pe-16',
          )}
        />
        <div className={cn('min-h-0 grow overflow-y-auto px-16 pt-16', side === 'end' && 'pb-24 tablet:px-24')}>
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 gap-12 border-t border-border-subtle bg-bg-surface px-16 pt-12 pb-24">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

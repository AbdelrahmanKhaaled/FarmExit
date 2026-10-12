'use client';

import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from 'react';

/**
 * Drives a native <dialog> as a controlled modal: `showModal()` gives the top layer, focus trapping, inert
 * background and Escape for free. Closing goes through `onOpenChange(false)` so the parent stays the source of truth.
 */
export function useModalDialog(open: boolean, onOpenChange: (open: boolean) => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return {
    ref,
    // Escape key: let React state close it (keeps the exit transition and the parent in sync).
    onCancel: (event: SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onOpenChange(false);
    },
    // The panel fills the <dialog> box, so a click whose target is the <dialog> itself hit the scrim.
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) onOpenChange(false);
    },
    // Native close (e.g. a <form method="dialog">) must also update the parent.
    onClose: () => {
      if (open) onOpenChange(false);
    },
  };
}

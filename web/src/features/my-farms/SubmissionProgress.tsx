'use client';
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { useModalDialog } from '@/components/overlay/use-modal-dialog';
import { Icon } from '@/components/icons/Icon';
/** A pending request cannot be cancelled by dismissing a visual overlay. No cancel action is offered. */
export function SubmissionProgress({ open }: { open: boolean }) {
  const t = useTranslations('workspace.wizard');
  const id = useId();
  const dialog = useModalDialog(open, () => {});
  return (
    <dialog
      {...dialog}
      aria-labelledby={id}
      aria-busy="true"
      className="fx-overlay fx-dialog m-auto w-[calc(100vw-32px)] max-w-480 bg-transparent p-0"
    >
      <div className="flex flex-col items-center gap-24 rounded-card border border-border-hairline bg-bg-surface p-32 text-center effect-floating-glass">
        <Icon name="clock" size={40} className="text-text-brand" />
        <h2 id={id} className="type-heading-h4">
          {t('submitting')}
        </h2>
        <p role="status" className="type-body-caption text-text-muted">
          {t('private')}
        </p>
      </div>
    </dialog>
  );
}

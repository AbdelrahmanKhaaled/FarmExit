'use client';
import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { archiveFarmAction } from '@/features/admin/actions/farms';
import { ActionIcon } from '@/features/admin/workspace/ActionIcon';
export function FarmRowActions({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useTranslations('batch'),
    dialog = useRef<HTMLDialogElement>(null),
    router = useRouter(),
    [pending, start] = useTransition(),
    [error, setError] = useState<string | null>(null);
  return (
    <div className="farm-row-actions">
      <Link href={`/admin/farms/${id}`} title={t('view')} aria-label={t('view')}>
        <ActionIcon name="view" />
      </Link>
      {canManage && (
        <>
          <Link href={`/admin/farms/${id}/edit`} title={t('editFarm')} aria-label={t('editFarm')}>
            <ActionIcon name="edit" />
          </Link>
          <button
            type="button"
            title={t('archive')}
            aria-label={t('archive')}
            onClick={() => {
              setError(null);
              dialog.current?.showModal();
            }}
          >
            <ActionIcon name="archive" />
          </button>
          <dialog
            ref={dialog}
            className="archive-dialog"
            aria-labelledby={`archive-${id}`}
            onCancel={(e) => {
              if (pending) e.preventDefault();
            }}
          >
            <h2 id={`archive-${id}`}>{t('archiveTitle')}</h2>
            <p>{t('archiveHelp')}</p>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="operation-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={pending}
                onClick={() => dialog.current?.close()}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await archiveFarmAction(id);
                    if (!result.ok) {
                      setError(result.message === 'ARCHIVE_LINKED' ? t('archiveBlocked') : result.message);
                      return;
                    }
                    dialog.current?.close();
                    router.push('/admin/farms');
                    router.refresh();
                  })
                }
              >
                {pending ? t('saving') : t('confirmArchive')}
              </button>
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}

'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { updateUserStatusAction } from '@/features/admin/actions/accounts';

export function UserStatusAction({ id, status }: { id: string; status: string }) {
  const t = useTranslations('admin.accountActions');
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState('');
  const next = status === 'active' ? 'suspended' : 'active';
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMessage('');
          dialog.current?.showModal();
        }}
      >
        {t(next === 'suspended' ? 'suspend' : 'reactivate')}
      </Button>
      <dialog
        ref={dialog}
        aria-label={t('confirmTitle')}
        className="admin-detail-panel fixed inset-0 m-auto max-w-md space-y-3 backdrop:bg-black/30"
      >
        <p className="text-sm">{t(next === 'suspended' ? 'confirmSuspend' : 'confirmReactivate')}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  const result = await updateUserStatusAction(id, next);
                  setMessage(result.ok ? t('saved') : result.message);
                  if (result.ok) {
                    dialog.current?.close();
                    router.refresh();
                  }
                } catch {
                  setMessage(t('error'));
                }
              })
            }
          >
            {t('confirm')}
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => dialog.current?.close()}>
            {t('cancel')}
          </Button>
        </div>
      </dialog>
      {message ? (
        <p role="status" className="text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { publishListingAction } from '@/features/admin/actions/listings';

export function PublishListingButton({ listingId }: { listingId: string }) {
  const t = useTranslations('admin.pipelinePage');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      {message ? <span className="text-xs text-[var(--admin-text-muted)]">{message}</span> : null}
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          start(async () => {
            const res = await publishListingAction(listingId);
            setMessage(res.ok ? t('publishSuccess') : (res.message ?? t('publishError')));
          });
        }}
      >
        {t('publish')}
      </Button>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { createCoPurchaseGroupAction } from '@/features/admin/actions/co-purchase';
import type { StaffOption } from '@/features/admin/workspace/StaffAssignmentForm';

export function CreateCoPurchaseForm({ staffOptions }: { staffOptions: StaffOption[] }) {
  const t = useTranslations('admin.coPurchasePage');
  const [pending, start] = useTransition();
  const [listingId, setListingId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mb-6 rounded border border-[var(--admin-border-subtle)] p-4">
      <h2 className="mb-2 text-sm font-semibold">{t('createTitle')}</h2>
      <p className="mb-3 text-xs text-[var(--admin-text-muted)]">{t('createHint')}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          placeholder={t('listingId')}
          className="w-full max-w-xs rounded border px-2 py-1.5 text-sm"
        />
        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="rounded border px-2 py-1.5 text-sm">
          <option value="">{t('selectCoordinator')}</option>
          {staffOptions.map((o) => (
            <option key={o.userId} value={o.userId}>{o.label}</option>
          ))}
        </select>
        <Button
          type="button"
          disabled={pending || !listingId || !staffId}
          onClick={() => {
            setMessage(null);
            start(async () => {
              const res = await createCoPurchaseGroupAction({ listingId: listingId.trim(), assignedStaffId: staffId });
              setMessage(res.ok ? t('createSuccess') : (res.message ?? t('createError')));
            });
          }}
        >
          {t('createBtn')}
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs">{message}</p> : null}
    </div>
  );
}

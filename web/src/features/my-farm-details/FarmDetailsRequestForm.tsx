'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';

export function FarmDetailsRequestForm({ slug, farmName }: { slug: string; farmName?: string }) {
  const t = useTranslations('workspace.farmDetails');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const createRes = await fetch('/api/farm-details-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listingSlug: slug }),
    });
    if (createRes.status === 409) {
      setBusy(false);
      setError(t('duplicate'));
      return;
    }
    if (!createRes.ok) {
      setBusy(false);
      setError(t('createError'));
      return;
    }
    const created = (await createRes.json()) as { id: string };
    const submitRes = await fetch(`/api/farm-details-requests/${created.id}/submit`, { method: 'POST' });
    setBusy(false);
    if (!submitRes.ok) {
      router.push(`/my/farm-details-requests/${created.id}`);
      return;
    }
    router.push(`/my/farm-details-requests/${created.id}`);
  }

  return (
    <Surface
      className="flex max-w-640 flex-col gap-24 border border-border-hairline p-24 tablet:p-40"
      data-testid="farm-details-request-form"
    >
      <div className="flex items-center gap-12 rounded-xl border border-border-hairline bg-bg-muted p-16">
        <Icon name="tree" size={24} className="shrink-0 text-text-brand" />
        <div>
          <p className="type-label-small-strong">{farmName ?? slug}</p>
          <p className="mt-4 type-body-caption text-text-muted">
            {t('listingSlug')}: {slug}
          </p>
        </div>
      </div>
      <p className="rounded-xl border border-overlay-gold-hairline bg-bg-notice p-16 type-body-caption text-text-secondary">
        {t('mediationNote')}
      </p>
      <p className="type-body-caption text-text-muted">{t('noMessageField')}</p>
      <Button type="button" variant="primary" disabled={busy} onClick={() => void submit()}>
        {busy ? t('submitting') : t('confirmSubmit')}
      </Button>
      {error && <p className="type-body-caption text-status-error">{error}</p>}
    </Surface>
  );
}

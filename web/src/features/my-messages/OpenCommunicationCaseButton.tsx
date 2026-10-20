'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';

export function OpenCommunicationCaseButton({ requestId }: { requestId: string }) {
  const t = useTranslations('workspace.messages');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/communication/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (res.status === 400 && data?.message?.includes('case agent')) {
        setError(t('noAgent'));
        return;
      }
      setError(t('openError'));
      return;
    }
    const caseRow = (await res.json()) as { id: string };
    router.push(`/my/messages/${caseRow.id}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void open()}>
        {busy ? t('opening') : t('openCase')}
      </Button>
      {error && <p className="type-body-caption text-text-muted">{error}</p>}
    </div>
  );
}

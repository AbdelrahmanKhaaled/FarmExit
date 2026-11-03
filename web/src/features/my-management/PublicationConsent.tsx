'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { jsonRequest } from '@/features/my-farms/types';

/** The owner can explicitly authorize one historical request; this never publishes it. */
export function PublicationConsent({ requestId }: { requestId: string }) {
  const t = useTranslations('workspace.phase7');
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return <section className="rounded-lg border border-border-hairline bg-bg-surface p-16">
    <label className="flex gap-12"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{t('publicationConsent')}</span></label>
    <Button disabled={!consent || pending} onClick={async () => {
      setPending(true); setError(false);
      try { await jsonRequest(`/api/farm-management-requests/${requestId}/publication-consent`, 'POST', { consent: true }); router.refresh(); }
      catch { setError(true); } finally { setPending(false); }
    }}>{t('authorizePublication')}</Button>
    {error && <p role="alert">{t('publicationConsentError')}</p>}
  </section>;
}

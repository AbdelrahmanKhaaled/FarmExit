'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { openCommunicationCase, type OpenCommunicationCaseErrorCode } from './open-communication-case';

function errorMessage(
  t: ReturnType<typeof useTranslations<'workspace.messages'>>,
  code: OpenCommunicationCaseErrorCode,
): string {
  const key = {
    unauthorized: 'errors.unauthorized',
    forbidden: 'errors.forbidden',
    notFound: 'errors.notFound',
    noAgent: 'noAgent',
    conflict: 'errors.conflict',
    network: 'errors.network',
    unknown: 'openError',
  }[code] as Parameters<typeof t>[0];
  return t(key);
}

export function OpenCommunicationCaseButton({ requestId }: { requestId: string }) {
  const t = useTranslations('workspace.messages');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openingRef = useRef(false);
  async function open() {
    if (busy || openingRef.current) return;
    openingRef.current = true;
    setBusy(true);
    setError(null);
    const result = await openCommunicationCase(requestId);
    setBusy(false);
    openingRef.current = false;
    if (!result.ok) {
      setError(errorMessage(t, result.code));
      return;
    }
    router.push(`/my/messages/${result.caseId}`);
  }

  return (
    <div className="flex flex-col gap-8" data-testid="open-communication-case">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void open()}>
        {busy ? t('opening') : t('openCase')}
      </Button>
      {error && (
        <p className="type-body-caption text-status-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

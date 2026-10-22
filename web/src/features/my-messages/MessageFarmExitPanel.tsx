'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Surface';
import { OpenCommunicationCaseButton } from './OpenCommunicationCaseButton';
import { canOpenCommunicationForStatus } from './request-context';

type Props = {
  requestId: string;
  requestStatus?: string;
  /** When true, renders only the inner content (no Card wrapper). */
  embedded?: boolean;
};

export function MessageFarmExitPanel({ requestId, requestStatus, embedded = false }: Props) {
  const t = useTranslations('workspace.phase7');
  const tm = useTranslations('workspace.messages');
  const allowed = requestStatus === undefined || canOpenCommunicationForStatus(requestStatus);

  const body = (
    <>
      <h3 className="type-label-large">{t('communication')}</h3>
      <p className="mt-12 type-body-caption text-text-muted">{t('communicationNote')}</p>
      {allowed ? (
        <div className="mt-16">
          <OpenCommunicationCaseButton requestId={requestId} />
        </div>
      ) : (
        <p className="mt-16 type-body-caption text-text-muted">{tm('messagingUnavailable')}</p>
      )}
    </>
  );

  if (embedded) return <div data-testid="message-farmexit-panel">{body}</div>;
  return (
    <Card surface="muted" data-testid="message-farmexit-panel">
      {body}
    </Card>
  );
}

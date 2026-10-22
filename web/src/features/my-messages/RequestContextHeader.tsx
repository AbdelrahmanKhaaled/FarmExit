'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { StatusBadge } from '@/components/ui/Badge';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { requestDetailHref, type RequestContextSummary } from './request-context';

type Props = {
  caseId: string;
  request: RequestContextSummary | null;
  requestLoadFailed: boolean;
};

function requestTypeLabel(
  t: ReturnType<typeof useTranslations<'workspace.messages'>>,
  requestType: string,
): string {
  const snake = requestType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  const candidates = [`requestTypes.${requestType}`, `requestTypes.${snake}`];
  for (const key of candidates) {
    if (t.has(key as Parameters<typeof t.has>[0])) return t(key as Parameters<typeof t>[0]);
  }
  return requestType;
}

export function RequestContextHeader({ caseId, request, requestLoadFailed }: Props) {
  const t = useTranslations('workspace.messages');

  const contextLine = request
    ? requestTypeLabel(t, request.requestType)
    : requestLoadFailed
      ? t('requestContextFallback')
      : t('requestContextLoading');

  const title =
    request?.farm?.name ?? request?.requestNumber ?? (request ? t('requestRef', { id: request.id }) : t('conversationTitle'));
  const subtitle = request?.farm?.name ? request.requestNumber : null;

  return (
    <div className="min-w-0 flex-1">
      <p className="type-label-caption uppercase tracking-wide text-text-gold">{contextLine}</p>
      <h3 className="type-heading-h4 wrap-anywhere text-text-primary">{title}</h3>
      {subtitle && <p className="mt-4 type-body-caption text-text-muted">{subtitle}</p>}
      <p className="mt-4 type-body-caption text-text-muted">{t('caseLabel', { id: caseId })}</p>
      {request && (
        <div className="mt-12 flex flex-wrap items-center gap-12">
          <PortalStatus status={request.status} />
          <Link href={requestDetailHref(request)} className="type-label-small-strong text-text-brand">
            {t('viewRequest')}
          </Link>
        </div>
      )}
    </div>
  );
}

export function CaseStatusBadge({ caseStatus }: { caseStatus: string }) {
  const t = useTranslations('workspace.messages');
  const closed = caseStatus === 'closed';
  return (
    <StatusBadge tone={closed ? 'neutral' : 'review'} className="shrink-0">
      {(t as (k: string, o?: { defaultValue?: string }) => string)(`statuses.${caseStatus}`, {
        defaultValue: caseStatus,
      })}
    </StatusBadge>
  );
}

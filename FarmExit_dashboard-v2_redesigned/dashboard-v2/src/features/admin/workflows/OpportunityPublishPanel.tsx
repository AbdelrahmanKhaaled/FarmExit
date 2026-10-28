'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import {
  publishFarmManagementOpportunityAction,
  publishPartnershipOpportunityAction,
} from '@/features/admin/actions/workflows';

type Props = {
  requestId: string;
  status: string;
  visibility: string;
  publishedAt: string | null;
  submittedAt: string | null;
  kind: 'management' | 'partnership';
};

export function OpportunityPublishPanel({
  requestId,
  status,
  visibility,
  publishedAt,
  submittedAt,
  kind,
}: Props) {
  const t = useTranslations('admin.opportunityPublish');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const published = visibility === 'public' && publishedAt !== null;
  const eligible =
    status === 'approved' && !published && submittedAt !== null && visibility === 'private';

  const stateLabel = published
    ? t('statePublished')
    : status === 'approved' && visibility === 'private'
      ? t('stateApprovedPrivate')
      : t('stateNotEligible');

  const runPublish = () => {
    setMessage(null);
    start(async () => {
      const res =
        kind === 'management'
          ? await publishFarmManagementOpportunityAction(requestId)
          : await publishPartnershipOpportunityAction(requestId);
      setMessage(res.ok ? t('success') : (res.message ?? t('error')));
    });
  };

  return (
    <div className="admin-action-panel space-y-4 border-t border-[var(--admin-border-subtle)] pt-6">
      <h2 className="text-sm font-semibold">{t('title')}</h2>
      <p className="text-xs text-[var(--admin-text-muted)]">{stateLabel}</p>
      {eligible ? (
        <>
          <p className="text-xs leading-relaxed text-[var(--admin-text-secondary)]">{t('confirmHint')}</p>
          <Button type="button" disabled={pending} onClick={runPublish}>
            {t('publish')}
          </Button>
        </>
      ) : null}
      {message ? <p className="text-sm text-[var(--admin-text-secondary)]">{message}</p> : null}
    </div>
  );
}

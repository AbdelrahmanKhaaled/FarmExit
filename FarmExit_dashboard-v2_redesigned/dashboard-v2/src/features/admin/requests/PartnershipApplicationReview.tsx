'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { DecideWorkflowForm } from '@/features/admin/workspace/DecideWorkflowForm';
import { decidePartnershipApplicationAction } from '@/features/admin/actions/workflows';

export function PartnershipApplicationReview({
  requestId,
  parentId,
  status,
}: {
  requestId: string;
  parentId: string | null;
  status: string;
}) {
  const t = useTranslations('admin.requestWorkspace');
  const router = useRouter();
  return (
    <section className="operation-card">
      <header>
        <h2>{t('applicationReview')}</h2>
      </header>
      <p className="workflow-help">{t('applicationReviewHint')}</p>
      <DecideWorkflowForm
        enabled={status === 'underFarmExitReview'}
        onDecide={async (decision, comment) => {
          const result = await decidePartnershipApplicationAction(requestId, decision, comment, parentId ?? undefined);
          if (result.ok) router.refresh();
          return result;
        }}
      />
    </section>
  );
}

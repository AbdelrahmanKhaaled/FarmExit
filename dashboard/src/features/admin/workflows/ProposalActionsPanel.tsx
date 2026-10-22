'use client';

import { useTranslations } from 'next-intl';
import { assignProposalCaseAgentAction } from '@/features/admin/actions/proposals';
import { StaffAssignmentForm, type StaffOption } from '@/features/admin/workspace/StaffAssignmentForm';

export function ProposalActionsPanel({
  proposalId,
  caseAgentOptions,
}: {
  proposalId: string;
  caseAgentOptions: StaffOption[];
}) {
  const t = useTranslations('admin.proposalDetail');
  return (
    <div className="admin-action-panel space-y-3">
      <h2 className="text-sm font-semibold">{t('actionsTitle')}</h2>
      <p className="text-xs text-[var(--admin-text-muted)]">{t('nonBinding')}</p>
      <p className="text-xs text-[var(--admin-text-muted)]">{t('noStaffDecision')}</p>
      <StaffAssignmentForm
        staffOptions={caseAgentOptions}
        onAssign={(staffId) => assignProposalCaseAgentAction(proposalId, staffId)}
      />
    </div>
  );
}

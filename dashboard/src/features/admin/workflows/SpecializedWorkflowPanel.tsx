'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { assignRequestStaffAction } from '@/features/admin/actions/requests';
import { DecideWorkflowForm } from '@/features/admin/workspace/DecideWorkflowForm';
import { StaffAssignmentForm, type StaffOption } from '@/features/admin/workspace/StaffAssignmentForm';

type Decision = 'approved' | 'changesRequested' | 'rejected';

export function SpecializedWorkflowPanel({
  requestId,
  status,
  reviewerOptions,
  caseAgentOptions,
  onDecide,
  nonBindingNote,
}: {
  requestId: string;
  status: string;
  reviewerOptions: StaffOption[];
  caseAgentOptions: StaffOption[];
  onDecide: (requestId: string, decision: Decision, comment?: string) => Promise<{ ok: boolean; message?: string }>;
  nonBindingNote?: string;
}) {
  const t = useTranslations('admin.workflows');
  const [role, setRole] = useState<'reviewer' | 'caseAgent'>('reviewer');
  const staffOptions = useMemo(
    () => (role === 'reviewer' ? reviewerOptions : caseAgentOptions),
    [role, reviewerOptions, caseAgentOptions],
  );

  return (
    <div className="admin-action-panel space-y-4">
      <h2 className="text-sm font-semibold">{t('actionsTitle')}</h2>
      {nonBindingNote ? <p className="text-xs text-[var(--admin-text-muted)]">{nonBindingNote}</p> : null}
      <StaffAssignmentForm
        showRoleSelect
        role={role}
        onRoleChange={setRole}
        staffOptions={staffOptions}
        onAssign={(staffId) => assignRequestStaffAction(requestId, role, staffId)}
      />
      <DecideWorkflowForm
        enabled={status === 'underFarmExitReview'}
        hint={t('decisionHint')}
        onDecide={(decision, comment) => onDecide(requestId, decision, comment)}
      />
    </div>
  );
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/design-system';
import { assignRequestStaffAction, recordRequestReviewAction } from '@/features/admin/actions/requests';
import { StaffAssignmentForm, type StaffOption } from '@/features/admin/workspace/StaffAssignmentForm';

type Props = {
  requestId: string;
  requestType: string;
  status: string;
  specialized: boolean;
  canReview: boolean;
  reviewerOptions: StaffOption[];
  caseAgentOptions: StaffOption[];
};

export function RequestActions({
  requestId,
  requestType,
  status,
  specialized,
  canReview,
  reviewerOptions,
  caseAgentOptions,
}: Props) {
  const t = useTranslations('admin.requestDetail');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<'reviewer' | 'caseAgent'>('reviewer');
  const [comment, setComment] = useState('');
  const staffOptions = useMemo(
    () => (assignmentType === 'reviewer' ? reviewerOptions : caseAgentOptions),
    [assignmentType, reviewerOptions, caseAgentOptions],
  );

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setMessage(null);
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? t('success') : (res.message ?? t('error')));
    });
  };

  const reviewable = canReview && !specialized && status !== 'draft';

  return (
    <div className="space-y-6 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] p-4">
      <h2 className="text-sm font-semibold">{t('actionsTitle')}</h2>
      {specialized ? (
        <p className="text-sm text-[var(--admin-text-muted)]">{t('specializedWorkflow', { type: requestType })}</p>
      ) : null}
      {message ? <p className="text-sm text-[var(--admin-text-secondary)]">{message}</p> : null}

      <StaffAssignmentForm
        showRoleSelect
        role={assignmentType}
        onRoleChange={setAssignmentType}
        staffOptions={staffOptions}
        onAssign={(staffId) => assignRequestStaffAction(requestId, assignmentType, staffId)}
      />

      {reviewable ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const decision = (e.currentTarget.elements.namedItem('decision') as HTMLSelectElement).value as
              | 'approved'
              | 'changesRequested'
              | 'rejected';
            run(() => recordRequestReviewAction(requestId, decision, comment.trim() || undefined));
          }}
        >
          <label className="flex flex-col gap-1 text-xs">
            {t('decision')}
            <select name="decision" className="rounded border border-[var(--admin-border-subtle)] px-2 py-1.5 text-sm">
              <option value="approved">{t('decisionApproved')}</option>
              <option value="changesRequested">{t('decisionChanges')}</option>
              <option value="rejected">{t('decisionRejected')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('comment')}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="rounded border border-[var(--admin-border-subtle)] px-2 py-1.5 text-sm"
            />
          </label>
          <Button type="submit" disabled={pending}>{t('submitDecision')}</Button>
        </form>
      ) : null}
    </div>
  );
}

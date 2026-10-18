'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/design-system';
import {
  assignListingStaffAction,
  decideListingReviewAction,
  publishListingAction,
} from '@/features/admin/actions/listings';
import { StaffAssignmentForm, type StaffOption } from '@/features/admin/workspace/StaffAssignmentForm';

type Props = {
  listingId: string;
  status: string;
  canPublish: boolean;
  reviewerOptions: StaffOption[];
  caseAgentOptions: StaffOption[];
};

export function ListingActions({ listingId, status, canPublish, reviewerOptions, caseAgentOptions }: Props) {
  const t = useTranslations('admin.listingDetail');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<'reviewer' | 'caseAgent'>('reviewer');
  const [comment, setComment] = useState('');

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setMessage(null);
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? t('success') : (res.message ?? t('error')));
    });
  };

  const underReview = status === 'underFarmExitReview';
  const staffOptions = assignmentType === 'reviewer' ? reviewerOptions : caseAgentOptions;

  return (
    <div className="space-y-6 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] p-4">
      <h2 className="text-sm font-semibold">{t('actionsTitle')}</h2>
      {message ? <p className="text-sm text-[var(--admin-text-secondary)]">{message}</p> : null}

      <StaffAssignmentForm
        showRoleSelect
        role={assignmentType}
        onRoleChange={setAssignmentType}
        staffOptions={staffOptions}
        onAssign={(staffId) => assignListingStaffAction(listingId, assignmentType, staffId)}
      />

      {underReview ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const decision = (e.currentTarget.elements.namedItem('decision') as HTMLSelectElement).value as
              | 'approved'
              | 'changesRequested'
              | 'rejected';
            run(() => decideListingReviewAction(listingId, decision, comment.trim() || undefined));
          }}
        >
          <p className="text-xs text-[var(--admin-text-muted)]">{t('decisionHint')}</p>
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

      {canPublish && status === 'approved' ? (
        <Button type="button" disabled={pending} onClick={() => run(() => publishListingAction(listingId))}>
          {t('publish')}
        </Button>
      ) : null}
    </div>
  );
}

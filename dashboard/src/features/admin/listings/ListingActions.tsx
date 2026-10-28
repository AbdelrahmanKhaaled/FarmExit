'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui';
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
  canAssign: boolean;
  canReview: boolean;
  reviewerOptions: StaffOption[];
  caseAgentOptions: StaffOption[];
};

export function ListingActions({
  listingId,
  status,
  canPublish,
  canAssign,
  canReview,
  reviewerOptions,
  caseAgentOptions,
}: Props) {
  const t = useTranslations('admin.listingDetail');
  const b = useTranslations('batch');
  const router = useRouter();
  const [decision, setDecision] = useState('approved');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<'reviewer' | 'caseAgent'>('reviewer');
  const [comment, setComment] = useState('');

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setMessage(null);
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? t('success') : (res.message ?? t('error')));
      if (res.ok) router.refresh();
    });
  };

  const underReview = status === 'underFarmExitReview';
  const staffOptions = assignmentType === 'reviewer' ? reviewerOptions : caseAgentOptions;

  return (
    <div className="admin-action-panel space-y-6">
      <h2 className="text-sm font-semibold">{t('actionsTitle')}</h2>
      {message ? <p className="text-sm text-[var(--admin-text-secondary)]">{message}</p> : null}

      {canAssign && underReview ? (
        <section className="workflow-form">
          <h3 className="text-xs font-semibold">{b('assignment')}</h3>
          <StaffAssignmentForm
            showRoleSelect
            role={assignmentType}
            onRoleChange={setAssignmentType}
            staffOptions={staffOptions}
            onAssign={(staffId) => assignListingStaffAction(listingId, assignmentType, staffId)}
          />
        </section>
      ) : null}

      {canReview && underReview ? (
        <form
          className="workflow-form"
          onSubmit={(e) => {
            e.preventDefault();
            const decision = (e.currentTarget.elements.namedItem('decision') as HTMLSelectElement).value as
              'approved' | 'changesRequested' | 'rejected';
            run(() => decideListingReviewAction(listingId, decision, comment.trim() || undefined));
          }}
        >
          <p className="text-xs text-[var(--admin-text-muted)]">{t('decisionHint')}</p>
          <label className="flex flex-col gap-1 text-xs">
            {t('decision')}
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              name="decision"
              className="rounded border border-[var(--admin-border-subtle)] px-2 py-1.5 text-sm"
            >
              <option value="approved">{t('decisionApproved')}</option>
              <option value="changesRequested">{t('decisionChanges')}</option>
              <option value="rejected">{t('decisionRejected')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('comment')}
            <textarea
              required={decision !== 'approved'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="rounded border border-[var(--admin-border-subtle)] px-2 py-1.5 text-sm"
            />
          </label>
          <Button type="submit" disabled={pending}>
            {t('submitDecision')}
          </Button>
        </form>
      ) : null}

      <p className="workflow-help">{b('approvedNotPublished')}</p>
      {!underReview && status !== 'approved' && <p className="workflow-help">{b('notEligible')}</p>}
      {canPublish && status === 'approved' ? (
        <Button type="button" disabled={pending} onClick={() => run(() => publishListingAction(listingId))}>
          {t('publish')}
        </Button>
      ) : null}
    </div>
  );
}

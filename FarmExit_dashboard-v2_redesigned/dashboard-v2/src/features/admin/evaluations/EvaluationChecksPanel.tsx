'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui';
import { recordEvaluationCheckAction } from '@/features/admin/actions/platform';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { EVALUATION_CHECK_KEY_EXAMPLES, EVALUATION_CHECK_STATUSES } from './evaluation-domain';
type Props = {
  evaluation: {
    id: string;
    farmId: string;
    checks: {
      id: string;
      checkKey: string;
      checkStatus: string;
      reviewerNotes: string | null;
    }[];
  };
  locked: boolean;
};

export function EvaluationChecksPanel({ evaluation, locked }: Props) {
  const t = useTranslations('admin.evaluationDetail');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [checkKey, setCheckKey] = useState('');
  const [checkStatus, setCheckStatus] = useState('notReviewed');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [evidenceDocumentId, setEvidenceDocumentId] = useState('');

  const editCheck = (key: string, currentStatus: string, notes: string | null) => {
    setCheckKey(key);
    setCheckStatus(currentStatus);
    setReviewerNotes(notes ?? '');
    setEvidenceDocumentId('');
    setMessage(null);
  };

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm" role="alert">{message}</p> : null}
      <ul className="space-y-2 text-sm">
        {evaluation.checks.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
            <div>
              <span className="font-mono text-xs">{c.checkKey}</span>
              <StatusBadge status={c.checkStatus} />
              {c.reviewerNotes ? <p className="text-xs text-[var(--admin-text-muted)]">{c.reviewerNotes}</p> : null}
            </div>
            {!locked ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={() => editCheck(c.checkKey, c.checkStatus, c.reviewerNotes)}>
                {t('editCheck')}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {!locked ? (
        <form
          className="grid max-w-lg gap-2 rounded border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!checkKey.trim()) return;
            setMessage(null);
            start(async () => {
              const res = await recordEvaluationCheckAction(evaluation.farmId, evaluation.id, {
                checkKey: checkKey.trim(),
                checkStatus,
                reviewerNotes: reviewerNotes.trim() || undefined,
                evidenceDocumentId: evidenceDocumentId.trim() || undefined,
              });
              setMessage(res.ok ? t('checkSaved') : res.message ?? t('error'));
              if (res.ok) router.refresh();
            });
          }}
        >
          <p className="text-xs font-medium">{t('addOrUpdateCheck')}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">{t('checkKeyHint', { examples: EVALUATION_CHECK_KEY_EXAMPLES.join(', ') })}</p>
          <input className="rounded border px-2 py-1" value={checkKey} onChange={(e) => setCheckKey(e.target.value)} required maxLength={120} disabled={pending} />
          <select className="rounded border px-2 py-1" value={checkStatus} onChange={(e) => setCheckStatus(e.target.value)} disabled={pending}>
            {EVALUATION_CHECK_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            className="rounded border px-2 py-1"
            placeholder={t('evidenceDocumentId')}
            value={evidenceDocumentId}
            onChange={(e) => setEvidenceDocumentId(e.target.value)}
            disabled={pending}
          />
          <textarea className="rounded border px-2 py-1" rows={2} value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} disabled={pending} />
          <Button type="submit" disabled={pending}>{t('saveCheck')}</Button>
        </form>
      ) : null}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { updateEvaluationAction } from '@/features/admin/actions/platform';
import { EvaluationChecksPanel } from './EvaluationChecksPanel';
import { EVALUATION_STATUSES_EDITABLE, evaluationIsLocked } from './evaluation-domain';

export type EvaluationDetail = {
  id: string;
  farmId: string;
  status: string;
  scoreValue: number | null;
  scoreMax: number | null;
  methodologyName: string | null;
  methodologyVersion: string | null;
  internalNotes: string | null;
  reviewer: { id: string; fullName: string | null };
  checks: {
    id: string;
    checkKey: string;
    checkStatus: string;
    reviewerNotes: string | null;
  }[];
};

type Props = {
  evaluation: EvaluationDetail;
};

export function EvaluationEditPanel({ evaluation }: Props) {
  const t = useTranslations('admin.evaluationDetail');
  const router = useRouter();
  const locked = evaluationIsLocked(evaluation.status);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [scoreValue, setScoreValue] = useState(evaluation.scoreValue?.toString() ?? '');
  const [scoreMax, setScoreMax] = useState(evaluation.scoreMax?.toString() ?? '');
  const [methodologyVersion, setMethodologyVersion] = useState(evaluation.methodologyVersion ?? '');
  const [internalNotes, setInternalNotes] = useState(evaluation.internalNotes ?? '');
  const [status, setStatus] = useState(evaluation.status);

  return (
    <div className="space-y-6 text-sm">
      <p className="text-xs text-[var(--admin-text-muted)]">{t('internalOnly')}</p>
      <div className="flex flex-wrap gap-4">
        <div><span className="text-[var(--admin-text-muted)]">{t('status')}: </span><StatusBadge status={evaluation.status} /></div>
        <div><span className="text-[var(--admin-text-muted)]">{t('reviewer')}: </span>{evaluation.reviewer.fullName ?? evaluation.reviewer.id}</div>
      </div>
      {message ? <p role="alert">{message}</p> : null}

      <EvaluationChecksPanel evaluation={evaluation} locked={locked} />

      {locked ? (
        <p className="text-[var(--admin-text-muted)]">{t('immutable')}</p>
      ) : (
        <form
          className="admin-detail-panel grid max-w-lg gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const body: Record<string, unknown> = { status };
            if (scoreValue.trim()) body.scoreValue = Number(scoreValue);
            if (scoreMax.trim()) body.scoreMax = Number(scoreMax);
            if (methodologyVersion.trim()) body.methodologyVersion = methodologyVersion.trim();
            if (internalNotes.trim()) body.internalNotes = internalNotes.trim();
            start(async () => {
              const res = await updateEvaluationAction(evaluation.farmId, evaluation.id, body);
              setMessage(res.ok ? t('saved') : res.message ?? t('error'));
              if (res.ok) router.refresh();
            });
          }}
        >
          <p className="font-medium">{t('editTitle')}</p>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('scoreValue')}
            <input className="admin-form-control mt-1 w-full" value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} disabled={pending} />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('scoreMax')}
            <input className="admin-form-control mt-1 w-full" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} disabled={pending} />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('methodologyVersion')}
            <input className="admin-form-control mt-1 w-full" value={methodologyVersion} onChange={(e) => setMethodologyVersion(e.target.value)} disabled={pending} />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('internalNotes')}
            <textarea className="admin-form-control mt-1 w-full" rows={3} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} disabled={pending} />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('statusField')}
            <select className="admin-form-control mt-1 w-full" value={status} onChange={(e) => setStatus(e.target.value)} disabled={pending}>
              {EVALUATION_STATUSES_EDITABLE.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={pending}>{t('save')}</Button>
        </form>
      )}
    </div>
  );
}

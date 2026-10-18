'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { updateEvaluationAction } from '@/features/admin/actions/platform';

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

const LOCKED = new Set(['approved', 'published', 'superseded']);

type Props = {
  evaluation: EvaluationDetail;
};

export function EvaluationEditPanel({ evaluation }: Props) {
  const t = useTranslations('admin.evaluationDetail');
  const locked = LOCKED.has(evaluation.status);
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
      {message ? <p>{message}</p> : null}

      <DataTable>
        <thead>
          <tr>
            <Th>{t('col.check')}</Th>
            <Th>{t('col.checkStatus')}</Th>
            <Th>{t('col.notes')}</Th>
          </tr>
        </thead>
        <tbody>
          {evaluation.checks.map((c) => (
            <tr key={c.id}>
              <Td>{c.checkKey}</Td>
              <Td><StatusBadge status={c.checkStatus} /></Td>
              <Td>{c.reviewerNotes ?? '—'}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {locked ? (
        <p className="text-[var(--admin-text-muted)]">{t('immutable')}</p>
      ) : (
        <form
          className="grid max-w-lg gap-2 rounded border p-4"
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
            });
          }}
        >
          <p className="font-medium">{t('editTitle')}</p>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('scoreValue')}
            <input className="mt-1 w-full rounded border px-2 py-1" value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} disabled={pending} />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('scoreMax')}
            <input className="mt-1 w-full rounded border px-2 py-1" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} disabled={pending} />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('methodologyVersion')}
            <input className="mt-1 w-full rounded border px-2 py-1" value={methodologyVersion} onChange={(e) => setMethodologyVersion(e.target.value)} disabled={pending} />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('internalNotes')}
            <textarea className="mt-1 w-full rounded border px-2 py-1" rows={3} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} disabled={pending} />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('statusField')}
            <input className="mt-1 w-full rounded border px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)} disabled={pending} />
          </label>
          <Button type="submit" disabled={pending}>{t('save')}</Button>
        </form>
      )}
    </div>
  );
}

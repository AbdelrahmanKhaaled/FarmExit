'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/design-system';
import { createEvaluationAction } from '@/features/admin/actions/platform';
import { EVALUATION_STATUSES_CREATABLE } from './evaluation-domain';

type Props = {
  farmId: string;
  farmName?: string | null;
  listingRequestId?: string | null;
};

export function CreateEvaluationForm({ farmId, farmName, listingRequestId }: Props) {
  const t = useTranslations('admin.evaluationCreate');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('draft');
  const [listingId, setListingId] = useState(listingRequestId ?? '');
  const [scoreValue, setScoreValue] = useState('');
  const [scoreMax, setScoreMax] = useState('100');
  const [methodologyName, setMethodologyName] = useState('');
  const [methodologyVersion, setMethodologyVersion] = useState('');
  const [reviewScopeEn, setReviewScopeEn] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form
      className="grid max-w-xl gap-3 rounded border border-[var(--admin-border-subtle)] p-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmed) return;
        setMessage(null);
        const body: Record<string, unknown> = { status };
        if (listingId.trim()) body.listingRequestId = listingId.trim();
        if (scoreValue.trim()) body.scoreValue = Number(scoreValue);
        if (scoreMax.trim()) body.scoreMax = Number(scoreMax);
        if (methodologyName.trim()) body.methodologyName = methodologyName.trim();
        if (methodologyVersion.trim()) body.methodologyVersion = methodologyVersion.trim();
        if (reviewScopeEn.trim()) body.reviewScopeEn = reviewScopeEn.trim();
        if (internalNotes.trim()) body.internalNotes = internalNotes.trim();
        start(async () => {
          const res = await createEvaluationAction(farmId, body);
          if (!res.ok) {
            setMessage(res.message ?? t('error'));
            return;
          }
          router.push(`/admin/evaluations/${farmId}/${res.evaluationId}`);
          router.refresh();
        });
      }}
    >
      <p className="text-xs text-[var(--admin-text-muted)]">{t('internalOnly')}</p>
      {farmName ? <p className="font-medium">{farmName}</p> : null}
      <p className="font-mono text-xs">{t('farmId')}: {farmId}</p>
      {message ? <p role="alert">{message}</p> : null}
      <label className="text-xs text-[var(--admin-text-muted)]">
        {t('listingRequestId')}
        <input className="mt-1 w-full rounded border px-2 py-1" value={listingId} onChange={(e) => setListingId(e.target.value)} disabled={pending} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-[var(--admin-text-muted)]">
          {t('scoreValue')}
          <input className="mt-1 w-full rounded border px-2 py-1" inputMode="decimal" value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} disabled={pending} />
        </label>
        <label className="text-xs text-[var(--admin-text-muted)]">
          {t('scoreMax')}
          <input className="mt-1 w-full rounded border px-2 py-1" inputMode="decimal" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} disabled={pending} />
        </label>
      </div>
      <label className="text-xs text-[var(--admin-text-muted)]">
        {t('methodologyName')}
        <input className="mt-1 w-full rounded border px-2 py-1" value={methodologyName} onChange={(e) => setMethodologyName(e.target.value)} disabled={pending} />
      </label>
      <label className="text-xs text-[var(--admin-text-muted)]">
        {t('methodologyVersion')}
        <input className="mt-1 w-full rounded border px-2 py-1" value={methodologyVersion} onChange={(e) => setMethodologyVersion(e.target.value)} disabled={pending} />
      </label>
      <label className="text-xs text-[var(--admin-text-muted)]">
        {t('reviewScopeEn')}
        <textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={reviewScopeEn} onChange={(e) => setReviewScopeEn(e.target.value)} disabled={pending} />
      </label>
      <label className="text-xs text-[var(--admin-text-muted)]">
        {t('internalNotes')}
        <textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} disabled={pending} />
      </label>
      <label className="text-xs text-[var(--admin-text-muted)]">
        {t('status')}
        <select className="mt-1 w-full rounded border px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)} disabled={pending}>
          {EVALUATION_STATUSES_CREATABLE.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={pending} />
        <span>{t('confirm')}</span>
      </label>
      <Button type="submit" disabled={pending || !confirmed}>{pending ? t('submitting') : t('submit')}</Button>
    </form>
  );
}

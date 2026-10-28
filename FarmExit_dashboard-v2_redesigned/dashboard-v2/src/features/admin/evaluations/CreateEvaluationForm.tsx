'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui';
import { createEvaluationAction } from '@/features/admin/actions/platform';
import { EVALUATION_STATUSES_CREATABLE } from './evaluation-domain';

type Props = {
  farmId: string;
  farmName?: string | null;
  listingRequestId?: string | null;
};

export function CreateEvaluationForm({ farmId, farmName, listingRequestId }: Props) {
  const b = useTranslations('batch');
  const enums = useTranslations('admin.enums');
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
      className="workflow-form evaluation-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmed) return;
        setMessage(null);
        const value = scoreValue.trim() ? Number(scoreValue) : null,
          max = scoreMax.trim() ? Number(scoreMax) : null;
        if (
          (value !== null && (!/^\d+(\.\d{1,2})?$/.test(scoreValue) || value > 99999.99)) ||
          (max !== null && (!/^\d+(\.\d{1,2})?$/.test(scoreMax) || max > 99999.99)) ||
          (value !== null && (!Number.isFinite(value) || value < 0 || max === null || value > max)) ||
          (max !== null && (!Number.isFinite(max) || max <= 0))
        ) {
          setMessage(b('scoreError'));
          return;
        }
        if (listingId.trim() && !/^[1-9]\d{0,18}$/.test(listingId.trim())) {
          setMessage(b('numericId'));
          return;
        }
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
      <section className="operation-summary">
        <p>{b('farmContext')}</p>
        <h2>{farmName ?? farmId}</h2>
        <p>{t('internalOnly')}</p>
      </section>
      <section className="operation-card workflow-form">
        <header>
          <h2>{b('farmContext')}</h2>
        </header>
        <p className="font-mono text-xs">
          {t('farmId')}: {farmId}
        </p>
        {message ? <p role="alert">{message}</p> : null}
        <label className="text-xs text-[var(--admin-text-muted)]">
          {t('listingRequestId')}
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            disabled={pending}
          />
        </label>
      </section>
      <section className="operation-card workflow-form">
        <header>
          <h2>{b('scoring')}</h2>
        </header>
        <p className="workflow-help">{b('scoreHint')}</p>
        <div className="workflow-grid">
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('scoreValue')}
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              type="number"
              step="0.01"
              min="0"
              max="99999.99"
              inputMode="decimal"
              value={scoreValue}
              onChange={(e) => setScoreValue(e.target.value)}
              disabled={pending}
            />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('scoreMax')}
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              type="number"
              step="0.01"
              min="0"
              max="99999.99"
              inputMode="decimal"
              value={scoreMax}
              onChange={(e) => setScoreMax(e.target.value)}
              disabled={pending}
            />
          </label>
        </div>
        <div className="workflow-grid">
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('methodologyName')}
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={methodologyName}
              onChange={(e) => setMethodologyName(e.target.value)}
              disabled={pending}
            />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('methodologyVersion')}
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={methodologyVersion}
              onChange={(e) => setMethodologyVersion(e.target.value)}
              disabled={pending}
            />
          </label>
        </div>
      </section>
      <section className="operation-card workflow-form">
        <header>
          <h2>{b('scopeNotes')}</h2>
        </header>
        <label>
          {t('reviewScopeEn')}
          <textarea
            className="mt-1 w-full rounded border px-2 py-1"
            rows={4}
            value={reviewScopeEn}
            onChange={(e) => setReviewScopeEn(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="text-xs text-[var(--admin-text-muted)]">
          {t('internalNotes')}
          <textarea
            className="mt-1 w-full rounded border px-2 py-1"
            rows={4}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            disabled={pending}
          />
        </label>
      </section>
      <section className="operation-card workflow-form">
        <header>
          <h2>{b('confirmation')}</h2>
        </header>
        <label>
          {t('status')}
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={pending}
          >
            {EVALUATION_STATUSES_CREATABLE.map((s) => (
              <option key={s} value={s}>
                {enums.has('status.' + s) ? enums('status.' + s) : s}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={pending}
          />
          <span>{t('confirm')}</span>
        </label>
        <p className="workflow-help">{t('desc')}</p>
        <Button type="submit" disabled={pending || !confirmed}>
          {pending ? t('submitting') : t('submit')}
        </Button>
      </section>
    </form>
  );
}

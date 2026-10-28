'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

export function DecideWorkflowForm({
  enabled,
  hint,
  onDecide,
}: {
  enabled: boolean;
  hint?: string;
  onDecide: (
    decision: 'approved' | 'changesRequested' | 'rejected',
    comment?: string,
  ) => Promise<{ ok: boolean; message?: string }>;
}) {
  const t = useTranslations('admin.workflows');
  const [pending, start] = useTransition();
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  if (!enabled) return null;

  return (
    <form
      className="space-y-2 border-t border-[var(--admin-border-subtle)] pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const decision = (e.currentTarget.elements.namedItem('decision') as HTMLSelectElement).value as
          | 'approved'
          | 'changesRequested'
          | 'rejected';
        setMessage(null);
        start(async () => {
          const res = await onDecide(decision, comment.trim() || undefined);
          setMessage(res.ok ? t('success') : (res.message ?? t('error')));
        });
      }}
    >
      {hint ? <p className="text-xs text-[var(--admin-text-muted)]">{hint}</p> : null}
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
      {message ? <p className="text-xs text-[var(--admin-text-muted)]">{message}</p> : null}
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/design-system';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { reviewRequestDocumentAction } from '@/features/admin/actions/platform';
import type { StaffRequestDocument } from '@/lib/api/types/staff';

const REVIEW_STATUSES = ['uploaded', 'underReview', 'changesRequested', 'reviewed'] as const;

type Props = {
  requestId: string;
  documents: StaffRequestDocument[];
};

export function RequestDocumentsPanel({ requestId, documents }: Props) {
  const t = useTranslations('admin.requestDocuments');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (documents.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">{t('title')}</h2>
      {message ? <p className="text-sm text-[var(--admin-text-secondary)]">{message}</p> : null}
      <ul className="space-y-4">
        {documents.map((doc) => (
          <li key={doc.id} className="rounded border border-[var(--admin-border-subtle)] p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{doc.originalName ?? doc.slotKey}</p>
                <p className="text-xs text-[var(--admin-text-muted)]">{doc.slotKey}</p>
              </div>
              <StatusBadge status={doc.reviewStatus} />
            </div>
            <p className="mt-2">
              <a
                href={`/api/admin/staff/requests/${requestId}/documents/${doc.id}`}
                className="text-[var(--admin-brand-primary)] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {t('download')}
              </a>
            </p>
            <DocumentReviewForm
              initialStatus={doc.reviewStatus}
              initialNote={doc.reviewNote ?? ''}
              pending={pending}
              onSubmit={(status, note) => {
                setMessage(null);
                start(async () => {
                  const res = await reviewRequestDocumentAction(requestId, doc.id, status, note || undefined);
                  setMessage(res.ok ? t('success') : res.message ?? t('error'));
                });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DocumentReviewForm({
  initialStatus,
  initialNote,
  pending,
  onSubmit,
}: {
  initialStatus: string;
  initialNote: string;
  pending: boolean;
  onSubmit: (status: string, note: string) => void;
}) {
  const t = useTranslations('admin.requestDocuments');
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialNote);

  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(status, note);
      }}
    >
      <label className="text-xs text-[var(--admin-text-muted)]">
        {t('reviewStatus')}
        <select
          className="mt-1 w-full rounded border px-2 py-1"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={pending}
        >
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[var(--admin-text-muted)]">
        {t('reviewNote')}
        <textarea
          className="mt-1 w-full rounded border px-2 py-1"
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={pending}
        />
      </label>
      <Button type="submit" disabled={pending}>{t('saveReview')}</Button>
    </form>
  );
}

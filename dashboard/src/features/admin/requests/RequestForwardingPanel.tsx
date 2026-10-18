'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { forwardRequestAction } from '@/features/admin/actions/platform';

export type RequestForwardingRow = {
  id: string;
  recipientUserId: string;
  status: string;
  ownerDecision: string | null;
  decisionReason: string | null;
  createdAt: string | null;
  decidedAt: string | null;
};

type Props = {
  requestId: string;
  forwardings: RequestForwardingRow[];
  canForward: boolean;
};

export function RequestForwardingPanel({ requestId, forwardings, canForward }: Props) {
  const t = useTranslations('admin.requestForwarding');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [recipientUserId, setRecipientUserId] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">{t('title')}</h2>
      <p className="text-xs text-[var(--admin-text-muted)]">{t('nonbinding')}</p>
      {message ? <p className="text-sm text-[var(--admin-text-secondary)]">{message}</p> : null}
      <DataTable>
        <thead>
          <tr>
            <Th>{t('col.recipient')}</Th>
            <Th>{t('col.status')}</Th>
            <Th>{t('col.ownerDecision')}</Th>
            <Th>{t('col.created')}</Th>
          </tr>
        </thead>
        <tbody>
          {forwardings.length === 0 ? (
            <tr><Td colSpan={4}>{t('empty')}</Td></tr>
          ) : (
            forwardings.map((f) => (
              <tr key={f.id}>
                <Td>{f.recipientUserId}</Td>
                <Td><StatusBadge status={f.status} /></Td>
                <Td>{f.ownerDecision ?? '—'}</Td>
                <Td>{f.createdAt ? new Date(f.createdAt).toLocaleString() : '—'}</Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {canForward ? (
        <form
          className="grid max-w-md gap-2 rounded border border-[var(--admin-border-subtle)] p-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            start(async () => {
              const res = await forwardRequestAction(requestId, recipientUserId.trim(), internalNotes.trim() || undefined);
              setMessage(res.ok ? t('success') : res.message ?? t('error'));
              if (res.ok) {
                setRecipientUserId('');
                setInternalNotes('');
              }
            });
          }}
        >
          <p className="font-medium">{t('createTitle')}</p>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('recipientUserId')}
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              required
              pattern="\d+"
              disabled={pending}
            />
          </label>
          <label className="text-xs text-[var(--admin-text-muted)]">
            {t('internalNotes')}
            <textarea
              className="mt-1 w-full rounded border px-2 py-1"
              rows={2}
              maxLength={1000}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              disabled={pending}
            />
          </label>
          <Button type="submit" disabled={pending || !recipientUserId.trim()}>{t('submit')}</Button>
        </form>
      ) : null}
    </div>
  );
}

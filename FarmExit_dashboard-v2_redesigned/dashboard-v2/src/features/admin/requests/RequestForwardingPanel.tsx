'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Badge, Button } from '@/components/ui';
import { DataTable, Td, Th } from '@/components/ui/workspace/DataTable';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { forwardRequestAction, recordForwardingDecisionAction } from '@/features/admin/actions/platform';
import { isForwardingAwaitingOwnerDecision, RECORDABLE_OWNER_DECISIONS } from './forwarding-decision';

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
  canRecordDecision: boolean;
};

function OwnerDecisionBadge({ value }: { value: string | null }) {
  const t = useTranslations('admin.requestForwarding');
  if (!value || value === 'pending') return <span className="text-[var(--admin-text-muted)]">—</span>;
  const labelKey = value === 'accepted' ? 'ownerDecisionValues.accepted' : ('ownerDecisionValues.declined' as const);
  return <Badge variant={value === 'accepted' ? 'default' : 'muted'}>{t(labelKey)}</Badge>;
}

function RecordOwnerResponseForm({
  requestId,
  forwardingId,
  disabled,
}: {
  requestId: string;
  forwardingId: string;
  disabled: boolean;
}) {
  const t = useTranslations('admin.requestForwarding');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [decision, setDecision] = useState<string>('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form
      className="mt-3 grid max-w-lg gap-2 rounded border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] p-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmed || !decision) return;
        setMessage(null);
        start(async () => {
          const res = await recordForwardingDecisionAction(
            requestId,
            forwardingId,
            decision,
            reason.trim() || undefined,
          );
          if (!res.ok) {
            setMessage(res.message ?? t('decisionError'));
            return;
          }
          setMessage(t('decisionSuccess'));
          setDecision('');
          setReason('');
          setConfirmed(false);
          router.refresh();
        });
      }}
    >
      <p className="font-medium">{t('recordTitle')}</p>
      <p className="text-xs text-[var(--admin-text-muted)]">{t('recordMediatedNote')}</p>
      {message ? (
        <p
          className={`text-xs ${message === t('decisionSuccess') ? 'text-[var(--admin-brand-primary)]' : 'text-[var(--admin-status-danger)]'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-xs text-[var(--admin-text-muted)]">
        {t('decisionLabel')}
        <select
          className="rounded border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] px-2 py-1.5 text-sm text-[var(--admin-text-primary)]"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          required
          disabled={pending || disabled}
        >
          <option value="">{t('decisionPlaceholder')}</option>
          {RECORDABLE_OWNER_DECISIONS.map((value) => (
            <option key={value} value={value}>
              {t(value === 'accepted' ? 'ownerDecisionValues.accepted' : 'ownerDecisionValues.declined')}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--admin-text-muted)]">
        {t('decisionReason')}
        <textarea
          className="rounded border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] px-2 py-1.5 text-sm"
          rows={2}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={pending || disabled}
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-[var(--admin-text-secondary)]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={pending || disabled}
        />
        {t('confirmCheckbox')}
      </label>
      <Button type="submit" disabled={pending || disabled || !confirmed || !decision}>
        {pending ? t('decisionSubmitting') : t('decisionSubmit')}
      </Button>
    </form>
  );
}

export function RequestForwardingPanel({ requestId, forwardings, canForward, canRecordDecision }: Props) {
  const t = useTranslations('admin.requestForwarding');
  const b = useTranslations('batch');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [recipientUserId, setRecipientUserId] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const router = useRouter();

  return (
    <section id="forwarding" className="scroll-mt-4 space-y-4">
      <h2 className="text-sm font-semibold">{t('title')}</h2>
      <p className="text-xs text-[var(--admin-text-muted)]">{t('nonbinding')}</p>
      {message ? <p className="text-sm text-[var(--admin-text-secondary)]">{message}</p> : null}
      <DataTable>
        <thead>
          <tr>
            <Th>{t('col.id')}</Th>
            <Th>{t('col.recipient')}</Th>
            <Th>{t('col.status')}</Th>
            <Th>{t('col.ownerDecision')}</Th>
            <Th>{t('col.created')}</Th>
            <Th>{t('col.decided')}</Th>
          </tr>
        </thead>
        <tbody>
          {forwardings.length === 0 ? (
            <tr>
              <Td colSpan={6}>{t('empty')}</Td>
            </tr>
          ) : (
            forwardings.map((f) => (
              <tr key={f.id} className="align-top">
                <Td className="font-mono text-xs">{f.id}</Td>
                <Td>{f.recipientUserId}</Td>
                <Td>
                  <StatusBadge status={f.status} />
                </Td>
                <Td>
                  <OwnerDecisionBadge value={f.ownerDecision} />
                  {f.decisionReason ? (
                    <p className="mt-1 max-w-xs text-xs text-[var(--admin-text-muted)]">{f.decisionReason}</p>
                  ) : null}
                </Td>
                <Td>{f.createdAt ? new Date(f.createdAt).toLocaleString() : '—'}</Td>
                <Td>{f.decidedAt ? new Date(f.decidedAt).toLocaleString() : '—'}</Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {forwardings.map((f) =>
        canRecordDecision && isForwardingAwaitingOwnerDecision(f) ? (
          <RecordOwnerResponseForm
            key={`decide-${f.id}`}
            requestId={requestId}
            forwardingId={f.id}
            disabled={pending}
          />
        ) : null,
      )}
      {canForward ? (
        <form
          className="workflow-form"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            if (!/^[1-9]\d{0,18}$/.test(recipientUserId.trim())) {
              setMessage(b('requestIdError'));
              return;
            }
            start(async () => {
              const res = await forwardRequestAction(
                requestId,
                recipientUserId.trim(),
                internalNotes.trim() || undefined,
              );
              setMessage(res.ok ? t('success') : (res.message ?? t('error')));
              if (res.ok) {
                setRecipientUserId('');
                setInternalNotes('');
                router.refresh();
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
              pattern="[1-9][0-9]{0,18}"
              inputMode="numeric"
              autoComplete="off"
              placeholder={b('numericId')}
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
          <Button type="submit" disabled={pending || !/^[1-9]\d{0,18}$/.test(recipientUserId.trim())}>
            {t('submit')}
          </Button>
        </form>
      ) : null}
    </section>
  );
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/design-system';
import {
  relayMessageAction,
  sendStaffMessageAction,
  updateCaseStatusAction,
} from '@/features/admin/actions/platform';

export type ConversationSummary = {
  id: string;
  externalUserId: string;
  externalUserName: string | null;
};

export type CaseMessage = {
  id: string;
  senderId: string;
  body: string | null;
  sentAt: string | null;
  isRelayedCopy: boolean;
};

const CASE_STATUSES = ['open', 'waitingCustomer', 'waitingOwner', 'closed'] as const;

type Props = {
  caseId: string;
  requestId: string;
  status: string;
  conversations: ConversationSummary[];
  messages: CaseMessage[];
  activeConversationId: string | null;
};

export function CommunicationCaseWorkspace({
  caseId,
  requestId,
  status,
  conversations,
  messages,
  activeConversationId,
}: Props) {
  const t = useTranslations('admin.communicationsDetail');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [caseStatus, setCaseStatus] = useState(status);
  const [relaySourceId, setRelaySourceId] = useState('');
  const [relayTargetUserId, setRelayTargetUserId] = useState('');
  const [relayBody, setRelayBody] = useState('');
  const [relayNote, setRelayNote] = useState('');
  const [confirmRelay, setConfirmRelay] = useState(false);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const threadMessages = messages;

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--admin-text-muted)]">
        {t('requestContext')}: <span className="font-mono">{requestId}</span>
      </p>
      {message ? <p className="text-sm">{message}</p> : null}

      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label className="text-xs text-[var(--admin-text-muted)]">
          {t('caseStatus')}
          <select
            className="ms-2 rounded border px-2 py-1"
            value={caseStatus}
            onChange={(e) => setCaseStatus(e.target.value)}
            disabled={pending}
          >
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setMessage(null);
            start(async () => {
              const res = await updateCaseStatusAction(caseId, caseStatus);
              setMessage(res.ok ? t('statusSaved') : res.message ?? t('error'));
            });
          }}
        >
          {t('saveStatus')}
        </Button>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{t('participants')}</p>
        <div className="flex flex-wrap gap-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${c.id === activeConversationId ? 'bg-[var(--admin-brand-primary)] text-white' : 'bg-white'}`}
              onClick={() => router.push(`/admin/communications/${caseId}?conversationId=${c.id}`)}
            >
              {c.externalUserName ?? c.externalUserId}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--admin-text-muted)]">{t('isolationHint')}</p>
      </div>

      {activeConv ? (
        <>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded border p-3 text-sm">
            {threadMessages.length === 0 ? (
              <p className="text-[var(--admin-text-muted)]">{t('noMessages')}</p>
            ) : (
              threadMessages.map((m) => (
                <div key={m.id} className="rounded bg-[var(--admin-surface-muted)] p-2">
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    #{m.id} · {m.sentAt ? new Date(m.sentAt).toLocaleString() : '—'}
                    {m.isRelayedCopy ? ` · ${t('relayedCopy')}` : ''}
                  </p>
                  <p>{m.body ?? '—'}</p>
                </div>
              ))
            )}
          </div>

          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(null);
              start(async () => {
                const res = await sendStaffMessageAction(caseId, activeConv.externalUserId, draft.trim());
                setMessage(res.ok ? t('sent') : res.message ?? t('error'));
                if (res.ok) setDraft('');
              });
            }}
          >
            <label className="text-xs font-medium">{t('sendTo', { name: activeConv.externalUserName ?? activeConv.externalUserId })}</label>
            <textarea
              className="rounded border px-2 py-1"
              rows={3}
              maxLength={8000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              required
              disabled={pending}
            />
            <Button type="submit" disabled={pending || !draft.trim()}>{t('send')}</Button>
          </form>
        </>
      ) : (
        <p className="text-sm text-[var(--admin-text-muted)]">{t('selectConversation')}</p>
      )}

      <div className="rounded border border-dashed p-4 text-sm">
        <h3 className="font-semibold">{t('relayTitle')}</h3>
        <p className="text-xs text-[var(--admin-text-muted)]">{t('relayHint')}</p>
        <div className="mt-3 grid gap-2">
          <label className="text-xs">
            {t('relaySourceMessageId')}
            <input className="mt-1 w-full rounded border px-2 py-1" value={relaySourceId} onChange={(e) => setRelaySourceId(e.target.value)} />
          </label>
          <label className="text-xs">
            {t('relayTargetUser')}
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={relayTargetUserId}
              onChange={(e) => setRelayTargetUserId(e.target.value)}
            >
              <option value="">{t('selectRecipient')}</option>
              {conversations
                .filter((c) => c.id !== activeConversationId)
                .map((c) => (
                  <option key={c.externalUserId} value={c.externalUserId}>
                    {c.externalUserName ?? c.externalUserId}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs">
            {t('relayBody')}
            <textarea className="mt-1 w-full rounded border px-2 py-1" rows={3} value={relayBody} onChange={(e) => setRelayBody(e.target.value)} maxLength={8000} />
          </label>
          <label className="text-xs">
            {t('relayNoteInternal')}
            <textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={relayNote} onChange={(e) => setRelayNote(e.target.value)} maxLength={4000} />
          </label>
          {!confirmRelay ? (
            <Button
              type="button"
              disabled={!relaySourceId || !relayTargetUserId || !relayBody.trim()}
              onClick={() => setConfirmRelay(true)}
            >
              {t('relayPreview')}
            </Button>
          ) : (
            <div className="space-y-2 rounded bg-[var(--admin-surface-muted)] p-3">
              <p className="text-xs font-medium">{t('relayConfirm')}</p>
              <p className="text-xs">{t('relayConfirmBody', { target: relayTargetUserId })}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setMessage(null);
                    start(async () => {
                      const res = await relayMessageAction(
                        caseId,
                        relaySourceId.trim(),
                        relayTargetUserId,
                        relayBody.trim(),
                        relayNote.trim() || undefined,
                      );
                      setMessage(res.ok ? t('relayDone') : res.message ?? t('error'));
                      if (res.ok) {
                        setConfirmRelay(false);
                        setRelaySourceId('');
                        setRelayBody('');
                        setRelayNote('');
                      }
                    });
                  }}
                >
                  {t('relayConfirmButton')}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setConfirmRelay(false)}>{t('cancel')}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

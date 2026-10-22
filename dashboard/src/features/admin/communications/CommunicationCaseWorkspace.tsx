'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/design-system';
import {
  fetchStaffConversationMessagesAction,
  relayMessageAction,
  sendStaffMessageAction,
  updateCaseStatusAction,
} from '@/features/admin/actions/platform';
import type { CaseMessage, ConversationSummary } from './communications-types';
import { appendCaseMessageIfNew, mergeCaseMessages } from './message-merge';
import { useStaffCommunicationSocket } from './useStaffCommunicationSocket';

export type { CaseMessage, ConversationSummary } from './communications-types';

const CASE_STATUSES = ['open', 'waitingCustomer', 'waitingOwner', 'closed'] as const;

type Props = {
  caseId: string;
  requestId: string;
  status: string;
  conversations: ConversationSummary[];
  messages: CaseMessage[];
  messagePage: number;
  messageTotal: number;
  messagePageSize: number;
  activeConversationId: string | null;
  hideRequestBanner?: boolean;
};

export function CommunicationCaseWorkspace({
  caseId,
  requestId,
  status,
  conversations,
  messages,
  messagePage,
  messageTotal,
  messagePageSize,
  activeConversationId,
  hideRequestBanner = false,
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
  const [threadMessages, setThreadMessages] = useState<CaseMessage[]>(messages);
  const [loadedPage, setLoadedPage] = useState(messagePage);
  const [totalMessages, setTotalMessages] = useState(messageTotal);

  useEffect(() => {
    // RSC refresh updates `messages` props; merge with socket-driven local state.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop sync
    setThreadMessages(messages);
    setLoadedPage(messagePage);
    setTotalMessages(messageTotal);
  }, [messages, messagePage, messageTotal]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const resyncMessages = useCallback(async () => {
    if (!activeConversationId) return;
    const res = await fetchStaffConversationMessagesAction(caseId, activeConversationId);
    if (!res.ok) return;
    setThreadMessages((prev) => mergeCaseMessages(prev, res.items));
    setLoadedPage(res.page);
    setTotalMessages(res.total);
  }, [caseId, activeConversationId]);

  const canLoadOlder = loadedPage * messagePageSize < totalMessages;

  const onRealtimeMessage = useCallback(
    (event: { caseId: string; conversationId: string; message: CaseMessage }) => {
      if (event.caseId !== caseId) return;
      if (!activeConversationId || event.conversationId !== activeConversationId) return;
      setThreadMessages((prev) => appendCaseMessageIfNew(prev, event.message));
    },
    [caseId, activeConversationId],
  );

  const { status: realtimeStatus } = useStaffCommunicationSocket({
    caseId,
    enabled: true,
    onMessage: onRealtimeMessage,
    onResync: resyncMessages,
  });

  return (
    <div className="space-y-6">
      {!hideRequestBanner ? (
        <p className="text-sm text-[var(--admin-text-muted)]">
          {t('requestContext')}: <span className="font-mono">{requestId}</span>
        </p>
      ) : null}
      {message ? <p className="text-sm">{message}</p> : null}
      {(realtimeStatus === 'connecting' || realtimeStatus === 'reconnecting') && (
        <p className="text-xs text-[var(--admin-text-muted)]" data-testid="staff-realtime-status" role="status">
          {t('realtimeReconnecting')}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label className="text-xs text-[var(--admin-text-muted)]">
          {t('caseStatus')}
          <select
            className="admin-form-control ms-2"
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
          {canLoadOlder ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setMessage(null);
                start(async () => {
                  const nextPage = loadedPage + 1;
                  const res = await fetchStaffConversationMessagesAction(caseId, activeConversationId!, nextPage);
                  if (!res.ok) {
                    setMessage(res.message ?? t('error'));
                    return;
                  }
                  setThreadMessages((prev) => mergeCaseMessages(res.items, prev));
                  setLoadedPage(res.page);
                  setTotalMessages(res.total);
                });
              }}
            >
              {t('loadOlder')}
            </Button>
          ) : null}
          <div className="admin-comm-thread text-sm">
            {threadMessages.length === 0 ? (
              <p className="text-[var(--admin-text-muted)]">{t('noMessages')}</p>
            ) : (
              threadMessages.map((m) => {
                const fromStaff =
                  !m.isRelayedCopy && activeConv && m.senderId !== activeConv.externalUserId;
                const bubbleClass = m.isRelayedCopy
                  ? 'admin-comm-bubble admin-comm-bubble--relay'
                  : fromStaff
                    ? 'admin-comm-bubble admin-comm-bubble--staff'
                    : 'admin-comm-bubble admin-comm-bubble--external';
                return (
                  <div key={m.id} className={bubbleClass}>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      #{m.id} · {m.sentAt ? new Date(m.sentAt).toLocaleString() : '—'}
                      {m.isRelayedCopy ? ` · ${t('relayedCopy')}` : fromStaff ? ` · ${t('staffMessage')}` : ''}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[var(--admin-text-primary)]">{m.body ?? '—'}</p>
                  </div>
                );
              })
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
                if (res.ok) {
                  setDraft('');
                  await resyncMessages();
                }
              });
            }}
          >
            <label className="text-xs font-medium">{t('sendTo', { name: activeConv.externalUserName ?? activeConv.externalUserId })}</label>
            <textarea
              className="admin-form-control min-h-[5.5rem]"
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

      <div className="admin-action-panel border-dashed text-sm">
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
                        await resyncMessages();
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

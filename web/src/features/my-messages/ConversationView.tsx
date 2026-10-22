'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';
import type { CaseRow, MessageRow } from './messages-types';
import { MAX_MESSAGE_BODY } from './messages-types';
import type { RequestContextSummary } from './request-context';
import { CaseStatusBadge, RequestContextHeader } from './RequestContextHeader';
import { appendMessageIfNew, mergeMessageRows } from './message-merge';
import { fetchCaseMessages } from './messages-client';
import { isNearScrollBottom, shouldStickToLatest } from './message-scroll';
import { useCommunicationSocket } from './useCommunicationSocket';

type ConversationPreview = {
  caseRow?: CaseRow;
  messages?: MessageRow[];
  request?: RequestContextSummary;
};

type Props = {
  caseId: string;
  userId: string;
  layout?: 'embedded' | 'mobile' | 'responsive';
  showBack?: boolean;
  preview?: ConversationPreview;
};

export function ConversationView({
  caseId,
  userId,
  layout = 'embedded',
  showBack = false,
  preview,
}: Props) {
  const t = useTranslations('workspace.messages');
  const format = useFormatter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const forceLatest = useRef(true);
  const previousScroll = useRef<{ height: number; top: number; firstId?: string }>({ height: 0, top: 0 });
  const [unread, setUnread] = useState(false);
  const [caseRow, setCaseRow] = useState<CaseRow | null>(preview?.caseRow ?? null);
  const [messages, setMessages] = useState<MessageRow[] | null>(preview?.messages ?? null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestContext, setRequestContext] = useState<RequestContextSummary | null>(preview?.request ?? null);
  const [requestContextFailed, setRequestContextFailed] = useState(false);

  function formatSentAt(iso: string | null) {
    if (!iso) return '';
    return format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' });
  }

  const resyncMessages = useCallback(async () => {
    const items = await fetchCaseMessages(caseId);
    if (!items) return;
    setMessages((prev) => mergeMessageRows(prev ?? [], items));
  }, [caseId]);

  useEffect(() => {
    if (preview) return;
    let active = true;
    void (async () => {
      const [caseRes, items] = await Promise.all([
        fetch(`/api/communication/cases/${caseId}`),
        fetchCaseMessages(caseId),
      ]);
      if (!active) return;
      if (!caseRes.ok || !items) {
        setError(t('loadError'));
        return;
      }
      setCaseRow((await caseRes.json()) as CaseRow);
      setMessages(items);
    })();
    return () => {
      active = false;
    };
  }, [caseId, preview, t]);

  useEffect(() => {
    nearBottom.current = true;
    forceLatest.current = true;
    setUnread(false);
  }, [caseId]);

  const { status: realtimeStatus } = useCommunicationSocket({
    caseId,
    enabled: !preview,
    onMessage: (event) => {
      setMessages((prev) => appendMessageIfNew(prev, caseId, event.caseId, event.message));
    },
    onResync: resyncMessages,
  });

  useEffect(() => {
    if (preview) return;
    if (!caseRow?.requestId) return;
    let active = true;
    void (async () => {
      setRequestContextFailed(false);
      const res = await fetch(`/api/requests/${caseRow.requestId}`);
      if (!active) return;
      if (!res.ok) {
        setRequestContext(null);
        setRequestContextFailed(true);
        return;
      }
      setRequestContext((await res.json()) as RequestContextSummary);
    })();
    return () => {
      active = false;
    };
  }, [caseRow?.requestId, preview]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || messages === null) return;
    const previous = previousScroll.current;
    const prepended = previous.firstId && messages[0]?.id !== previous.firstId && messages.some((m) => m.id === previous.firstId);
    if (shouldStickToLatest(forceLatest.current, nearBottom.current)) {
      el.scrollTop = el.scrollHeight;
      nearBottom.current = true;
      forceLatest.current = false;
    } else if (prepended) {
      el.scrollTop = previous.top + el.scrollHeight - previous.height;
    } else if (el.scrollHeight > previous.height) {
      setUnread(true);
    }
    previousScroll.current = { height: el.scrollHeight, top: el.scrollTop, firstId: messages[0]?.id };
  }, [messages]);

  const closed = caseRow?.status === 'closed' || caseRow?.closedAt != null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (preview || closed || sending) return;
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_BODY) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/communication/cases/${caseId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: trimmed }),
    });
    setSending(false);
    if (!res.ok) {
      setError(t('sendError'));
      return;
    }
    const created = (await res.json()) as MessageRow;
    forceLatest.current = true;
    setUnread(false);
    setBody('');
    setMessages((prev) => mergeMessageRows(prev ?? [], [created]));
  }

  if (messages === null && !error) {
    return <p className="type-body-caption text-text-muted">{t('loading')}</p>;
  }
  if (error && !caseRow) {
    return <Surface className="p-32 text-center text-status-error">{error}</Surface>;
  }

  const isMobileShell = layout === 'mobile' || layout === 'responsive';
  const shellClass =
    layout === 'embedded' || layout === 'responsive'
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
      : 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border-hairline bg-bg-surface';

  return (
    <div className={shellClass} data-testid="conversation-view">
      {showBack && (
        <div className="mb-12 flex items-center gap-12 desktop:hidden">
          <Link
            href="/my/messages"
            className="inline-flex min-h-44 min-w-44 items-center justify-center rounded-full border border-border-hairline bg-bg-surface text-text-brand"
            aria-label={t('back')}
          >
            <Icon name="arrow-left" size={20} className="rtl:rotate-180" />
          </Link>
          {caseRow && (
            <RequestContextHeader
              caseId={caseRow.id}
              request={requestContext}
              requestLoadFailed={requestContextFailed}
            />
          )}
        </div>
      )}

      {caseRow && (
        <header
          className={`flex shrink-0 flex-col gap-12 border-border-hairline ${
            layout === 'embedded' || layout === 'responsive' ? 'border-b px-20 py-16' : 'border-b px-16 py-14'
          }`}
        >
          <div
            className={`flex-wrap items-start justify-between gap-12 ${
              showBack ? 'hidden desktop:flex' : 'flex'
            }`}
          >
            <RequestContextHeader
              caseId={caseRow.id}
              request={requestContext}
              requestLoadFailed={requestContextFailed}
            />
            <CaseStatusBadge caseStatus={caseRow.status} />
          </div>
          {showBack && (
            <div className="desktop:hidden">
              <CaseStatusBadge caseStatus={caseRow.status} />
            </div>
          )}
          <div className="flex gap-12 rounded-lg bg-bg-notice px-14 py-12 text-start">
            <Icon name="lock" size={18} className="mt-2 shrink-0 text-text-muted" />
            <p className="type-body-caption text-text-secondary">{t('privacyBanner')}</p>
          </div>
          {!preview &&
            (realtimeStatus === 'connecting' || realtimeStatus === 'reconnecting') && (
              <p
                className="type-body-caption text-text-muted"
                data-testid="messages-realtime-status"
                role="status"
              >
                {t('realtimeReconnecting')}
              </p>
            )}
        </header>
      )}

      <div
        ref={scrollRef}
        data-testid="message-history"
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          nearBottom.current = isNearScrollBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
          previousScroll.current.top = el.scrollTop;
          if (nearBottom.current) setUnread(false);
        }}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
          layout === 'embedded' || layout === 'responsive' ? 'px-20 py-16' : 'px-16 py-14'
        }`}
      >
        {messages && messages.length === 0 && (
          <p className="type-body-caption text-text-muted">{t('noMessages')}</p>
        )}
        <ul className="flex flex-col gap-16">
          {messages?.map((m) => {
            const mine = m.senderId === userId;
            const meta = mine
              ? t('messageMetaYou', { time: formatSentAt(m.sentAt) })
              : t('messageMetaFarmExit', { time: formatSentAt(m.sentAt) });
            return (
              <li
                key={m.id}
                className={`flex max-w-[92%] flex-col gap-6 ${mine ? 'ms-auto items-end' : 'me-auto items-start'}`}
                data-testid={mine ? 'message-mine' : 'message-staff'}
              >
                <p className={`type-label-caption text-text-muted ${mine ? 'text-end' : 'text-start'}`}>{meta}</p>
                <div
                  className={
                    mine
                      ? 'rounded-2xl rounded-ee-md bg-brand-primary px-16 py-12 text-start text-white shadow-sm'
                      : 'rounded-2xl rounded-es-md border border-border-subtle bg-bg-surface px-16 py-12 shadow-sm'
                  }
                >
                  <p
                    className={
                      mine
                        ? 'type-body-small whitespace-pre-wrap wrap-anywhere text-white'
                        : 'type-body-small whitespace-pre-wrap wrap-anywhere text-text-primary'
                    }
                    dir="auto"
                  >
                    {m.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {unread && (
        <button type="button" className="shrink-0 bg-bg-success-soft px-16 py-8 type-label-small-strong text-text-brand" data-testid="jump-to-latest" onClick={() => {
          const el = scrollRef.current;
          if (el) el.scrollTop = el.scrollHeight;
          nearBottom.current = true;
          setUnread(false);
        }}>{t('jumpToLatest')}</button>
      )}

      <footer
        className={`shrink-0 border-t border-border-hairline bg-bg-surface ${
          isMobileShell
            ? 'px-16 py-14 pb-[max(14px,env(safe-area-inset-bottom))] desktop:px-20 desktop:py-16'
            : 'px-20 py-16'
        }`}
      >
        {closed ? (
          <p className="type-body-caption text-text-muted">{t('caseClosed')}</p>
        ) : preview ? (
          <p className="type-body-caption text-text-muted">{t('composerDisabledPreview')}</p>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-10" data-portal-composer>
            <div className="flex items-end gap-10">
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t('composerLabel')}</span>
                <textarea
                  name="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={MAX_MESSAGE_BODY}
                  rows={isMobileShell ? 2 : 3}
                  placeholder={t('composerPlaceholder')}
                  className="w-full resize-none rounded-2xl border border-border-subtle bg-bg-surface px-16 py-12 type-body-small text-text-primary placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                  data-testid="message-composer"
                  dir="auto"
                />
              </label>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={sending || !body.trim()}
                className="!size-46 shrink-0 !rounded-full !p-0"
                aria-label={t('send')}
              >
                <Icon name="arrow-right" size={20} className="text-white rtl:rotate-180" />
              </Button>
            </div>
            {error && <p className="type-body-caption text-status-error" role="alert">{error}</p>}
          </form>
        )}
      </footer>
    </div>
  );
}

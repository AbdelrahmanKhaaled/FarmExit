'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';

type CaseRow = {
  id: string;
  requestId: string;
  status: string;
  closedAt: string | null;
};

type MessageRow = {
  id: string;
  senderId: string;
  body: string | null;
  sentAt: string | null;
  isRelayedCopy: boolean;
};

const MAX_BODY = 8000;

export function ConversationView({ caseId, userId }: { caseId: string; userId: string }) {
  const t = useTranslations('workspace.messages');
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const [caseRes, msgRes] = await Promise.all([
      fetch(`/api/communication/cases/${caseId}`),
      fetch(`/api/communication/cases/${caseId}/messages?page=1&pageSize=100`),
    ]);
    if (!caseRes.ok || !msgRes.ok) {
      setError(t('loadError'));
      return;
    }
    setCaseRow((await caseRes.json()) as CaseRow);
    const msgData = (await msgRes.json()) as { items: MessageRow[] };
    setMessages(msgData.items);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const [caseRes, msgRes] = await Promise.all([
        fetch(`/api/communication/cases/${caseId}`),
        fetch(`/api/communication/cases/${caseId}/messages?page=1&pageSize=100`),
      ]);
      if (!active) return;
      if (!caseRes.ok || !msgRes.ok) {
        setError(t('loadError'));
        return;
      }
      setCaseRow((await caseRes.json()) as CaseRow);
      const msgData = (await msgRes.json()) as { items: MessageRow[] };
      setMessages(msgData.items);
    })();
    return () => {
      active = false;
    };
  }, [caseId, t]);

  const closed = caseRow?.status === 'closed' || caseRow?.closedAt != null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (closed || sending) return;
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > MAX_BODY) return;
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
    setBody('');
    await reload();
  }

  if (messages === null && !error) {
    return <p className="type-body-caption text-text-muted">{t('loading')}</p>;
  }
  if (error && !caseRow) {
    return <Surface className="p-32 text-center text-status-error">{error}</Surface>;
  }

  return (
    <div className="flex flex-col gap-16" data-testid="conversation-view">
      {caseRow && (
        <Surface className="p-20">
          <p className="type-label-meta text-text-muted">{t('relatedRequest')}</p>
          <p className="type-label-medium">{caseRow.requestId}</p>
          <p className="mt-8 type-body-caption text-text-secondary">
            {(t as (k: string, o?: { defaultValue?: string }) => string)(`statuses.${caseRow.status}`, {
              defaultValue: caseRow.status,
            })}
          </p>
          <p className="mt-8 type-body-caption text-text-muted">{t('mediationNote')}</p>
        </Surface>
      )}
      <Surface className="flex flex-col gap-12 p-20">
        <h3 className="type-heading-h4">{t('history')}</h3>
        {messages && messages.length === 0 && <p className="type-body-caption text-text-muted">{t('noMessages')}</p>}
        <ul className="flex flex-col gap-12">
          {messages?.map((m) => {
            const mine = m.senderId === userId;
            return (
              <li
                key={m.id}
                className={mine ? 'ms-auto max-w-[85%] text-end' : 'me-auto max-w-[85%] text-start'}
                data-testid={mine ? 'message-mine' : 'message-staff'}
              >
                <div
                  className={
                    mine
                      ? 'rounded-card bg-brand-primary px-16 py-12 text-start text-white'
                      : 'rounded-card border border-border-subtle bg-bg-surface px-16 py-12'
                  }
                >
                  <p className={mine ? 'type-label-caption text-white/80' : 'type-label-caption text-text-muted'}>
                    {mine ? t('you') : t('farmExit')}
                  </p>
                  <p
                    className={
                      mine
                        ? 'type-body-small whitespace-pre-wrap wrap-anywhere'
                        : 'type-body-small text-text-primary whitespace-pre-wrap wrap-anywhere'
                    }
                  >
                    {m.body}
                  </p>
                  {m.sentAt && (
                    <p
                      className={
                        mine ? 'mt-4 type-label-caption text-white/80' : 'mt-4 type-label-caption text-text-muted'
                      }
                    >
                      {new Date(m.sentAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Surface>
      {closed ? (
        <p className="type-body-caption text-text-muted">{t('caseClosed')}</p>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-12">
          <label className="flex flex-col gap-8">
            <span className="type-label-form">{t('composerLabel')}</span>
            <textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_BODY}
              rows={4}
              required
              className="rounded-lg border border-border-subtle px-12 py-8"
              data-testid="message-composer"
            />
          </label>
          <Button type="submit" variant="primary" disabled={sending}>
            {sending ? t('sending') : t('send')}
          </Button>
          {error && <p className="type-body-caption text-status-error">{error}</p>}
        </form>
      )}
    </div>
  );
}

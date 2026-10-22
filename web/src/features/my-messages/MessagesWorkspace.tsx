'use client';

import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef } from 'react';
import { MessagesInbox } from './MessagesInbox';
import { ConversationView } from './ConversationView';
import type { CaseItem, CaseRow, MessageRow } from './messages-types';
import type { RequestContextSummary } from './request-context';
import { Icon } from '@/components/icons/Icon';

export type MessagesPreviewData = {
  cases?: CaseItem[];
  caseRow?: CaseRow;
  messages?: MessageRow[];
  request?: RequestContextSummary;
};

type Props = {
  caseId?: string;
  userId?: string;
  preview?: MessagesPreviewData;
};

function SelectConversationPlaceholder() {
  const t = useTranslations('workspace.messages');
  return (
    <div
      className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-12 px-24 py-48 text-center"
      data-testid="messages-select-conversation"
    >
      <span className="flex size-64 items-center justify-center rounded-full bg-bg-success-soft text-text-brand">
        <Icon name="messages" size={28} />
      </span>
      <p className="type-label-large text-text-primary">{t('selectConversation')}</p>
      <p className="max-w-360 type-body-caption text-text-muted">{t('selectConversationHint')}</p>
    </div>
  );
}

export function MessagesWorkspace({ caseId, userId, preview }: Props) {
  const t = useTranslations('workspace.messages');
  const showThread = Boolean(caseId && userId);
  const workspace = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const update = () => {
      const nav = document.querySelector<HTMLElement>('[data-mobile-nav]');
      const navHeight = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().height : 0;
      const viewport = window.visualViewport;
      const available = (viewport?.height ?? window.innerHeight) - element.getBoundingClientRect().top - navHeight - 16;
      element.style.height = `${Math.max(160, available)}px`;
    };
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    const nav = document.querySelector('[data-mobile-nav]');
    if (nav) observer.observe(nav);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={workspace}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-testid="messages-workspace"
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border-hairline bg-bg-surface shadow-sm desktop:grid desktop:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]"
      >
        <div
          className={`min-h-0 flex-col border-border-hairline desktop:border-e ${
            showThread ? 'hidden desktop:flex' : 'flex'
          }`}
        >
          <div className="border-b border-border-hairline px-20 py-16">
            <h3 className="type-label-large text-text-primary">{t('inboxTitle')}</h3>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-12">
            <MessagesInbox activeCaseId={caseId} previewCases={preview?.cases} />
          </div>
        </div>

        <div className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${showThread ? 'flex' : 'hidden desktop:flex'}`}>
          {showThread ? (
            <ConversationView
              key={caseId}
              caseId={caseId!}
              userId={userId!}
              layout="responsive"
              showBack
              preview={
                preview
                  ? { caseRow: preview.caseRow, messages: preview.messages, request: preview.request }
                  : undefined
              }
            />
          ) : (
            <SelectConversationPlaceholder />
          )}
        </div>
      </div>
    </div>
  );
}

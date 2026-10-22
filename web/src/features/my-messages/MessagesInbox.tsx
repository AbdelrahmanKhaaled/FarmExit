'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PortalEmpty } from '@/features/my-farmexit/PortalUI';
import { Surface } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';
import type { CaseItem } from './messages-types';

type Props = {
  activeCaseId?: string;
  previewCases?: CaseItem[];
};

function caseStatusLabel(
  t: ReturnType<typeof useTranslations<'workspace.messages'>>,
  status: string,
) {
  return (t as (k: string, o?: { defaultValue?: string }) => string)(`statuses.${status}`, {
    defaultValue: status,
  });
}

export function MessagesInbox({ activeCaseId, previewCases }: Props) {
  const t = useTranslations('workspace.messages');
  const format = useFormatter();
  const [items, setItems] = useState<CaseItem[] | null>(previewCases ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (previewCases) return;
    let active = true;
    void (async () => {
      const res = await fetch('/api/communication/cases?page=1&pageSize=50');
      if (!active) return;
      if (!res.ok) {
        setError(true);
        setItems([]);
        return;
      }
      const data = (await res.json()) as { items: CaseItem[] };
      setItems(data.items);
    })();
    return () => {
      active = false;
    };
  }, [previewCases]);

  if (items === null) {
    return <p className="type-body-caption text-text-muted">{t('loading')}</p>;
  }
  if (error) {
    return <Surface className="p-32 text-center text-status-error">{t('loadError')}</Surface>;
  }
  if (items.length === 0) {
    return (
      <PortalEmpty icon="messages" title={t('empty')} body={t('emptyNote')} testId="messages-empty" />
    );
  }

  return (
    <ul className="flex flex-col gap-8" data-testid="messages-inbox">
      {items.map((item) => {
        const selected = activeCaseId === item.id;
        const rawWhen = item.closedAt ?? item.createdAt;
        const when = rawWhen ? format.dateTime(new Date(rawWhen), { dateStyle: 'medium' }) : null;
        return (
          <li key={item.id}>
            <Link
              href={`/my/messages/${item.id}`}
              className={`flex gap-12 rounded-xl border p-14 transition-colors ${
                selected
                  ? 'border-brand-primary border-s-4 bg-bg-success-soft'
                  : 'border-border-hairline bg-bg-surface hover:border-border-subtle hover:bg-bg-muted/40'
              }`}
              aria-current={selected ? 'true' : undefined}
            >
              <span
                className={`flex size-40 shrink-0 items-center justify-center rounded-full ${
                  selected ? 'bg-brand-primary text-white' : 'bg-bg-success-soft text-text-brand'
                }`}
              >
                <Icon name="messages" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-8">
                  <p className="type-label-small-strong wrap-anywhere text-text-primary">
                    {t('caseLabel', { id: item.id })}
                  </p>
                  {when && (
                    <time dateTime={item.closedAt ?? item.createdAt ?? undefined} className="shrink-0 type-label-caption text-text-muted">
                      {when}
                    </time>
                  )}
                </div>
                <p className="mt-4 type-body-caption wrap-anywhere text-text-muted">
                  {t('requestRef', { id: item.requestId })}
                </p>
                <p className="mt-8 type-label-caption text-text-muted">{caseStatusLabel(t, item.status)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

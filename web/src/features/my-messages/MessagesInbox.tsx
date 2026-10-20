'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PortalEmpty, PortalRow } from '@/features/my-farmexit/PortalUI';
import { Surface } from '@/components/ui/Surface';

type CaseItem = {
  id: string;
  requestId: string;
  status: string;
  createdAt: string | null;
  closedAt: string | null;
};

export function MessagesInbox() {
  const t = useTranslations('workspace.messages');
  const [items, setItems] = useState<CaseItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
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
  }, []);

  if (items === null) {
    return <p className="type-body-caption text-text-muted">{t('loading')}</p>;
  }
  if (error) {
    return <Surface className="p-32 text-center text-status-error">{t('loadError')}</Surface>;
  }
  if (items.length === 0) {
    return <PortalEmpty icon="messages" title={t('empty')} body={t('emptyNote')} testId="messages-empty" />;
  }

  return (
    <ul className="flex flex-col gap-12" data-testid="messages-inbox">
      {items.map((item) => (
        <li key={item.id}>
          <PortalRow
            icon="messages"
            title={t('caseLabel', { id: item.id })}
            meta={`${t('relatedRequest')}: ${item.requestId}`}
            status={item.status}
            href={`/my/messages/${item.id}`}
          />
        </li>
      ))}
    </ul>
  );
}

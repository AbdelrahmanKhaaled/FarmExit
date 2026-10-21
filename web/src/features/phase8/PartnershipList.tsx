'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';
import { PortalHeading, PortalStatus } from '@/features/my-farmexit/PortalUI';

export function PartnershipList({
  items,
  application = false,
}: {
  items: {
    id: string;
    requestNumber: string;
    farmName?: string;
    status: string;
    parentPartnershipRequestId?: string;
  }[];
  application?: boolean;
}) {
  const t = useTranslations(application ? 'workspace.applications' : 'workspace.partnerships');
  const common = useTranslations('workspace.phase7');
  const [filter, setFilter] = useState('all');
  const shown = filter === 'all' ? items : items.filter((i) => i.status === filter);
  return (
    <div className="flex flex-col gap-24" data-testid="phase8-list">
      <PortalHeading
        title={t('listTitle')}
        action={
          !application && (
            <ButtonLink prefetch={false} href="/my/partnerships/new">
              {t('new')}
            </ButtonLink>
          )
        }
      />
      <p className="type-body-caption text-text-muted">{t('nonbindingNote')}</p>
      <div role="group" aria-label={t('status')} className="flex flex-wrap gap-8">
        <Button size="sm" variant={filter === 'all' ? 'primary' : 'outline'} onClick={() => setFilter('all')}>
          {common('all')}
        </Button>
        {[...new Set(items.map((i) => i.status))].map((status) => (
          <Button
            size="sm"
            key={status}
            aria-pressed={filter === status}
            variant={filter === status ? 'primary' : 'outline'}
            onClick={() => setFilter(status)}
          >
            <PortalStatus status={status} />
          </Button>
        ))}
      </div>
      {!shown.length ? (
        <Card className="min-h-240 p-32 text-center">
          <p className="type-body-default text-text-muted">{t('empty')}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-16">
          {shown.map((item) => (
            <li key={item.id}>
              <Card className="flex flex-col gap-16 tablet:flex-row tablet:items-center">
                <div className="min-w-0 flex-1">
                  <h2 className="type-label-large wrap-anywhere">{item.farmName ?? item.requestNumber}</h2>
                  <p className="mt-8 type-label-caption text-text-muted">
                    {item.farmName ? item.requestNumber : `${t('parent')}: ${item.parentPartnershipRequestId}`}
                  </p>
                </div>
                <PortalStatus status={item.status} />
                <ButtonLink
                  href={`/my/${application ? 'applications' : 'partnerships'}/${item.id}`}
                  variant="outline"
                  size="sm"
                >
                  {common(['draft', 'changesRequested'].includes(item.status) ? 'edit' : 'track')}
                </ButtonLink>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

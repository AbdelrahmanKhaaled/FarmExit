'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';
import { PortalHeading, PortalStatus } from '@/features/my-farmexit/PortalUI';
export type Phase7ListItem = {
  id: string;
  requestNumber: string;
  status: string;
  farmName?: string;
  professionalType?: string;
};
export function RequestList({ items, professional = false }: { items: Phase7ListItem[]; professional?: boolean }) {
  const w = useTranslations('workspace.phase7'),
    t = useTranslations(professional ? 'workspace.professionalVerification' : 'workspace.management');
  const [filter, setFilter] = useState('all');
  const statuses = ['draft', 'underFarmExitReview', 'changesRequested', 'approved', 'rejected', 'withdrawn'] as const;
  const shown = filter === 'all' ? items : items.filter((r) => r.status === filter);
  return (
    <div data-testid="phase7-request-list" className="flex flex-col gap-24">
      <PortalHeading
        title={t('listTitle')}
        action={
          <ButtonLink href={professional ? '/my/professional' : '/my/management/new'}>
            {professional ? t('backToProfile') : t('new')}
          </ButtonLink>
        }
      />
      <p className="type-body-caption text-text-muted">{professional ? w('professionalPrivate') : w('private')}</p>
      <div role="group" aria-label={t('status')} className="flex flex-wrap gap-8">
        <Button variant={filter === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          {w('all')}
        </Button>
        {statuses.map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'primary' : 'outline'}
            size="sm"
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
          >
            {t(`statuses.${s}`)}
          </Button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Card className="flex min-h-240 flex-col items-center justify-center gap-16 text-center">
          <Icon name="clipboard-tick" size={40} className="text-text-brand" />
          <p className="type-body-default text-text-muted">{t('empty')}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-16">
          {shown.map((req) => (
            <li key={req.id}>
              <Card padding="sm" className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-16 tablet:flex">
                <span className="flex size-44 shrink-0 items-center justify-center rounded-lg bg-bg-muted text-text-brand">
                  <Icon name={professional ? 'shield-tick' : 'tree'} size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="type-label-large wrap-anywhere">
                    {req.farmName ??
                      (req.professionalType
                        ? (t as (key: string) => string)(`types.${req.professionalType}`)
                        : req.requestNumber)}
                  </p>
                  <p className="mt-6 type-label-caption text-text-muted">{req.requestNumber}</p>
                </div>
                <div className="col-span-2">
                  <PortalStatus status={req.status} />
                </div>
                <ButtonLink
                  href={`${professional ? '/my/professional/verification' : '/my/management'}/${req.id}`}
                  variant="outline"
                  size="sm"
                  className="col-span-2 w-full tablet:w-auto"
                >
                  {['draft', 'changesRequested'].includes(req.status) ? w('edit') : w('track')}
                </ButtonLink>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/icons/Icon';
import { PortalEmpty, PortalHeading, PortalStatus } from './PortalUI';
import { PortalFilterChips } from './PortalFilterChips';

export type ApplicationItem = {
  id: string;
  requestNumber: string;
  farmName?: string;
  status: string;
  parentPartnershipRequestId?: string;
};

const TERMINAL = new Set(['rejected', 'withdrawn', 'notApproved']);

export function UnifiedApplicationsWorkspace({ items }: { items: ApplicationItem[] }) {
  const t = useTranslations('workspace.applications');
  const tu = useTranslations('workspace.unifiedApplications');
  const [filter, setFilter] = useState<'all' | 'partnership' | 'management'>('all');

  const shown = useMemo(
    () => (filter === 'partnership' || filter === 'all' ? items : []),
    [filter, items],
  );

  const { inProgress, decided } = useMemo(() => {
    const active: ApplicationItem[] = [];
    const closed: ApplicationItem[] = [];
    for (const item of shown) {
      (TERMINAL.has(item.status) ? closed : active).push(item);
    }
    return { inProgress: active, decided: closed };
  }, [shown]);

  const chips = [
    { id: 'all', label: tu('filters.all') },
    { id: 'partnership', label: tu('filters.partnership') },
    { id: 'management', label: tu('filters.management'), disabled: true },
  ];

  function renderCard(item: ApplicationItem) {
    const draft = item.status === 'draft' || item.status === 'changesRequested';
    return (
      <article
        key={item.id}
        className="flex flex-col gap-16 rounded-2xl border border-border-hairline bg-bg-surface p-20 tablet:flex-row tablet:items-center"
      >
        <span className="flex size-48 shrink-0 items-center justify-center rounded-xl bg-bg-success-soft text-text-brand">
          <Icon name="category" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="type-label-large wrap-anywhere">{item.farmName ?? item.requestNumber}</h3>
          <p className="mt-4 type-body-caption text-text-muted">
            {item.farmName ? item.requestNumber : `${t('parent')}: ${item.parentPartnershipRequestId}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-12">
          <PortalStatus status={item.status} />
          <ButtonLink href={`/my/applications/${item.id}`} variant="outline" size="sm">
            {draft ? tu('actions.continue') : tu('actions.track')}
          </ButtonLink>
        </div>
      </article>
    );
  }

  return (
    <div className="flex flex-col gap-24" data-testid="unified-applications">
      <PortalHeading title={tu('title')} description={tu('intro')} />
      <p className="type-body-caption text-text-muted">{t('nonbindingNote')}</p>
      <PortalFilterChips chips={chips} activeId={filter} onSelect={(id) => setFilter(id as typeof filter)} ariaLabel={tu('filtersLabel')} />
      {filter === 'management' && (
        <p className="rounded-lg border border-border-subtle bg-bg-muted px-16 py-12 type-body-caption text-text-muted" role="status">
          {tu('managementUnavailable')}
        </p>
      )}
      {shown.length === 0 ? (
        <PortalEmpty icon="document-text" title={t('empty')} body={tu('emptyBody')} href="/partnerships" action={tu('discoverCta')} />
      ) : (
        <div className="flex flex-col gap-32">
          {inProgress.length > 0 && (
            <section className="flex flex-col gap-16">
              <h3 className="type-heading-h4 text-text-primary">{tu('sections.inProgress')}</h3>
              <div className="flex flex-col gap-12">{inProgress.map(renderCard)}</div>
            </section>
          )}
          {decided.length > 0 && (
            <section className="flex flex-col gap-16">
              <h3 className="type-heading-h4 text-text-primary">{tu('sections.decided')}</h3>
              <div className="flex flex-col gap-12">{decided.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { PortalEmpty, PortalHeading, PortalStatus } from './PortalUI';
import { PortalFilterChips } from './PortalFilterChips';
import {
  REQUEST_FILTER_ORDER,
  filterByCategory,
  iconForRequestType,
  isRequestActive,
  resolveRequestAction,
  type RequestFilterCategory,
  type UnifiedRequestItem,
} from './unified-requests';

type Props = {
  items: UnifiedRequestItem[];
  page: number;
  pageSize: number;
  total: number;
  category: RequestFilterCategory;
};

export function UnifiedRequestsWorkspace({ items, page, pageSize, total, category }: Props) {
  const t = useTranslations('workspace');
  const tu = useTranslations('workspace.unifiedRequests');
  const tm = useTranslations('workspace.messages.requestTypes');
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();

  const filtered = useMemo(() => filterByCategory(items, category), [items, category]);
  const activeItems = filtered.filter(isRequestActive);
  const decidedItems = filtered.filter((item) => !isRequestActive(item));

  const chips = REQUEST_FILTER_ORDER.map((id) => ({
    id,
    label: tu(`filters.${id}`),
  }));

  function setCategory(next: string) {
    const params = new URLSearchParams();
    if (next !== 'all') params.set('category', next);
    if (page > 1) params.set('page', String(page));
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  function typeLabel(requestType: string) {
    if (tm.has(`requestTypes.${requestType}` as Parameters<typeof tm.has>[0])) {
      return tm(`requestTypes.${requestType}` as Parameters<typeof tm>[0]);
    }
    return requestType;
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return format.dateTime(new Date(iso), { dateStyle: 'medium' });
  }

  const actionLabel = (key: ReturnType<typeof resolveRequestAction>['actionKey']) => {
    const map = { continueDraft: tu('actions.continueDraft'), updateInfo: tu('actions.updateInfo'), track: tu('actions.track'), view: tu('actions.view') };
    return map[key];
  };

  function renderCard(item: UnifiedRequestItem) {
    const { href, actionKey } = resolveRequestAction(item);
    const title = item.farm?.name ?? item.requestNumber;
    const meta = [typeLabel(item.requestType), item.farm?.governorate].filter(Boolean).join(' · ');
    return (
      <article
        key={item.id}
        className="flex flex-col gap-16 rounded-2xl border border-border-hairline bg-bg-surface p-20 shadow-sm transition-shadow duration-150 hover:shadow-md tablet:flex-row tablet:items-center"
      >
        <span className="flex size-48 shrink-0 items-center justify-center rounded-xl bg-bg-success-soft text-text-brand">
          <Icon name={iconForRequestType(item.requestType)} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="type-label-meta text-text-muted">{item.requestNumber}</p>
          <h3 className="type-label-large wrap-anywhere text-text-primary">{title}</h3>
          <p className="mt-4 type-body-caption text-text-muted">{meta}</p>
          <p className="mt-8 type-label-caption text-text-muted">
            {tu('updated', { date: formatDate(item.submittedAt ?? item.updatedAt) })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-12 tablet:flex-col tablet:items-end">
          <PortalStatus status={item.status} />
          <ButtonLink href={href} variant="outline" size="sm" className="w-full tablet:w-auto">
            {actionLabel(actionKey)}
          </ButtonLink>
        </div>
      </article>
    );
  }

  return (
    <div className="flex flex-col gap-24" data-testid="unified-requests">
      <PortalHeading title={t('requests.title')} description={tu('intro')} />
      <PortalFilterChips chips={chips} activeId={category} onSelect={setCategory} ariaLabel={tu('filtersLabel')} />
      {filtered.length === 0 ? (
        <PortalEmpty
          icon="clipboard-tick"
          title={tu('emptyTitle')}
          body={t('requests.empty')}
          href="/farms"
          action={tu('browseCta')}
        />
      ) : (
        <div className="flex flex-col gap-32">
          {activeItems.length > 0 && (
            <section className="flex flex-col gap-16">
              <h3 className="type-heading-h4 text-text-primary">{tu('sections.active')}</h3>
              <div className="flex flex-col gap-12">{activeItems.map(renderCard)}</div>
            </section>
          )}
          {decidedItems.length > 0 && (
            <section className="flex flex-col gap-16">
              <h3 className="type-heading-h4 text-text-primary">{tu('sections.decided')}</h3>
              <div className="flex flex-col gap-12">{decidedItems.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
      {total > pageSize && (
        <nav className="flex flex-wrap gap-12" aria-label={tu('pagination')}>
          {page > 1 && (
            <Link
              href={{
                pathname: '/my/requests',
                query: { page: String(page - 1), ...(category !== 'all' ? { category } : {}) },
              }}
              className="inline-flex min-h-40 items-center rounded-full border border-border-strong px-16 type-label-caption text-text-brand"
            >
              {tu('prev')}
            </Link>
          )}
          {page * pageSize < total && (
            <Link
              href={{
                pathname: '/my/requests',
                query: { page: String(page + 1), ...(category !== 'all' ? { category } : {}) },
              }}
              className="inline-flex min-h-40 items-center rounded-full border border-border-strong px-16 type-label-caption text-text-brand"
            >
              {tu('next')}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

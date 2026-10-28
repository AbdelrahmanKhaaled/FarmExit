import { Suspense } from 'react';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { AdminFilterForm } from '@/features/admin/workspace/AdminFilterForm';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EntityLink } from '@/features/admin/workspace/EntityLink';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { StaffRequestList } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

const REQUEST_TYPES = [
  'farmListing',
  'farmManagement',
  'partnership',
  'partnershipApplication',
  'professionalVerification',
  'professionalApplication',
  'farmDetails',
  'farmPurchaseProposal',
] as const;

const REQUEST_STATUSES = [
  'draft',
  'submitted',
  'underFarmExitReview',
  'changesRequested',
  'approved',
  'rejected',
  'withdrawn',
  'closed',
  'published',
  'sentToOwner',
  'accepted',
  'declined',
] as const;

async function RequestsPageContent({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/requests'> & {
  searchParams: Promise<{
    page?: string;
    requestType?: string;
    status?: string;
    createdFrom?: string;
    createdTo?: string;
  }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'requests');
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const requestType = sp.requestType ?? '';
  const status = sp.status ?? '';
  const createdFrom = sp.createdFrom ?? '';
  const createdTo = sp.createdTo ?? '';
  const t = await getTranslations('admin.requestsPage');
  const tEnum = await getTranslations('admin.enums');
  const loc = await getLocale();

  const qs = new URLSearchParams({ page, pageSize: '10' });
  if (requestType) qs.set('requestType', requestType);
  if (status) qs.set('status', status);
  if (createdFrom) qs.set('createdFrom', new Date(createdFrom).toISOString());
  if (createdTo) qs.set('createdTo', new Date(`${createdTo}T23:59:59.999Z`).toISOString());

  const data = await apiFetchAdmin<StaffRequestList>(`/staff/requests?${qs}`, session.accessToken);
  const query = { requestType, status, createdFrom, createdTo };
  const pagination = {
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    query,
    pathname: '/admin/requests',
  };

  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('desc')}
        refreshLabel={t('refresh')}
      />
      <AdminFilterForm submitLabel={t('applyFilters')}>
        <select name="requestType" defaultValue={requestType} className="admin-form-control">
          <option value="">{t('filterAllTypes')}</option>
          {REQUEST_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {tEnum(`requestType.${rt}`)}
            </option>
          ))}
        </select>
        <select name="status" aria-label={t('filterStatus')} defaultValue={status} className="admin-form-control">
          <option value="">{t('allStatuses')}</option>
          {REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {tEnum(`status.${value}`)}
            </option>
          ))}
        </select>
        <input type="date" name="createdFrom" defaultValue={createdFrom} className="admin-form-control" />
        <input type="date" name="createdTo" defaultValue={createdTo} className="admin-form-control" />
      </AdminFilterForm>
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
          <thead>
            <tr>
              <Th>{t('col.requester')}</Th>
              <Th>{t('col.type')}</Th>
              <Th>{t('col.farm')}</Th>
              <Th>{t('col.status')}</Th>
              <Th>{t('col.created')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id}>
                <Td>
                  <EntityLink href={`/admin/requests/${row.id}`} label={row.creator.fullName ?? row.creator.id} />
                </Td>
                <Td>
                  <EnumLabel value={row.requestType} group="requestType" />
                </Td>
                <Td>{row.farm?.name ?? '—'}</Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td className="tabular-nums text-[var(--admin-text-muted)]">
                  {new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(
                    new Date(row.createdAt),
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

export default function RequestsPage(props: Parameters<typeof RequestsPageContent>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <RequestsPageContent {...props} />
    </Suspense>
  );
}

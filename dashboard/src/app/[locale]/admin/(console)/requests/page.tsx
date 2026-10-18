import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { TablePaginationLinks } from '@/features/admin/workspace/TablePaginationLinks';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, getAdminSession } from '@/lib/admin/session.server';
import type { StaffRequestList } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

const REQUEST_TYPES = [
  'farmListing',
  'farmManagement',
  'partnership',
  'partnershipApplication',
  'professionalVerification',
  'farmDetails',
  'farmPurchaseProposal',
] as const;

export default async function RequestsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/requests'> & {
  searchParams: Promise<{ page?: string; requestType?: string; status?: string; createdFrom?: string; createdTo?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const requestType = sp.requestType ?? '';
  const status = sp.status ?? '';
  const createdFrom = sp.createdFrom ?? '';
  const createdTo = sp.createdTo ?? '';
  const t = await getTranslations('admin.requestsPage');
  const loc = await getLocale();

  const qs = new URLSearchParams({ page, pageSize: '10' });
  if (requestType) qs.set('requestType', requestType);
  if (status) qs.set('status', status);
  if (createdFrom) qs.set('createdFrom', new Date(createdFrom).toISOString());
  if (createdTo) qs.set('createdTo', new Date(`${createdTo}T23:59:59`).toISOString());

  const data = await apiFetchAdmin<StaffRequestList>(`/staff/requests?${qs}`, session.accessToken);
  const query = { requestType, status, createdFrom, createdTo };

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--admin-brand-primary)]">{t('eyebrow')}</p>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">{t('desc')}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>
      <form method="get" className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <select name="requestType" defaultValue={requestType} className="rounded-md border border-[var(--admin-border-subtle)] px-3 py-2 text-sm">
          <option value="">{t('filterAllTypes')}</option>
          {REQUEST_TYPES.map((rt) => (
            <option key={rt} value={rt}>{rt}</option>
          ))}
        </select>
        <input name="status" defaultValue={status} placeholder={t('filterStatus')} className="rounded-md border border-[var(--admin-border-subtle)] px-3 py-2 text-sm" />
        <input type="date" name="createdFrom" defaultValue={createdFrom} className="rounded-md border border-[var(--admin-border-subtle)] px-3 py-2 text-sm" />
        <input type="date" name="createdTo" defaultValue={createdTo} className="rounded-md border border-[var(--admin-border-subtle)] px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md border border-[var(--admin-border-subtle)] px-4 py-2 text-sm font-medium hover:border-[var(--admin-brand-primary)]">
          {t('applyFilters')}
        </button>
      </form>
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <Th>{t('col.id')}</Th>
                <Th>{t('col.type')}</Th>
                <Th>{t('col.requester')}</Th>
                <Th>{t('col.farm')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.created')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <Link href={`/admin/requests/${row.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {row.requestNumber}
                    </Link>
                  </Td>
                  <Td>{row.requestType}</Td>
                  <Td>{row.creator.fullName ?? row.creator.id}</Td>
                  <Td>{row.farm?.name ?? '—'}</Td>
                  <Td><StatusBadge status={row.status} /></Td>
                  <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.createdAt))}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePaginationLinks
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            labels={{
              showing: t('pagination.showing'),
              prev: t('pagination.prev'),
              next: t('pagination.next'),
              page: t('pagination.page'),
            }}
            query={query}
            pathname="/admin/requests"
          />
        </>
      )}
    </PageContainer>
  );
}

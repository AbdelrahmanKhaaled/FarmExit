import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { TablePaginationLinks } from '@/features/admin/workspace/TablePaginationLinks';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, getAdminSession } from '@/lib/admin/session.server';
import type { StaffListingList } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function ListingsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/listings'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.listingsPage');
  const data = await apiFetchAdmin<StaffListingList>(
    `/staff/listing-requests?page=${page}&pageSize=10`,
    session.accessToken,
  );

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--admin-brand-primary)]">{t('eyebrow')}</p>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">{t('desc')}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/listing-pipeline" className="rounded-md border border-[var(--admin-border-subtle)] px-3 py-2 text-xs font-semibold hover:border-[var(--admin-brand-primary)]">
            {t('pipelineLink')}
          </Link>
          <RefreshButton label={t('refresh')} />
        </div>
      </div>
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <Th>{t('col.id')}</Th>
                <Th>{t('col.farm')}</Th>
                <Th>{t('col.type')}</Th>
                <Th>{t('col.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <Link href={`/admin/listings/${row.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {row.requestNumber}
                    </Link>
                  </Td>
                  <Td>{row.farmName}</Td>
                  <Td>{row.listingType}</Td>
                  <Td><StatusBadge status={row.status} /></Td>
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
            query={{}}
            pathname="/admin/listings"
          />
        </>
      )}
    </PageContainer>
  );
}

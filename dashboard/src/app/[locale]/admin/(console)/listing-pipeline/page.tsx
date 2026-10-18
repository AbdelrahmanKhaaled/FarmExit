import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { PublishListingButton } from '@/features/admin/listings/PublishListingButton';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { TablePaginationLinks } from '@/features/admin/workspace/TablePaginationLinks';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, getAdminSession } from '@/lib/admin/session.server';
import type { PublicationQueue } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function ListingPipelinePage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/listing-pipeline'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.pipelinePage');
  const data = await apiFetchAdmin<PublicationQueue>(
    `/staff/listing-requests/publication-queue?page=${page}&pageSize=10`,
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
        <RefreshButton label={t('refresh')} />
      </div>
      {data.items.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyDesc')} />
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <Th>{t('col.request')}</Th>
                <Th>{t('col.farm')}</Th>
                <Th>{t('col.type')}</Th>
                <Th>{t('col.location')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.action')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <Link href={`/admin/listings/${row.id}`} className="text-[var(--admin-brand-primary)] hover:underline">
                      {row.requestNumber}
                    </Link>
                  </Td>
                  <Td>{row.farmName}</Td>
                  <Td>{row.listingType}</Td>
                  <Td>{row.governorate}{row.areaName ? ` · ${row.areaName}` : ''}</Td>
                  <Td><StatusBadge status={row.status} /></Td>
                  <Td><PublishListingButton listingId={row.id} /></Td>
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
            pathname="/admin/listing-pipeline"
          />
        </>
      )}
    </PageContainer>
  );
}

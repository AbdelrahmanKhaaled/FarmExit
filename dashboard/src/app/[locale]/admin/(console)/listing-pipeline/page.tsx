import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { PublishListingButton } from '@/features/admin/listings/PublishListingButton';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { PublicationQueue } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function ListingPipelinePage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/listing-pipeline'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'listingPipeline');
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.pipelinePage');
  const data = await apiFetchAdmin<PublicationQueue>(
    `/staff/listing-requests/publication-queue?page=${page}&pageSize=10`,
    session.accessToken,
  );
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query: {}, pathname: '/admin/listing-pipeline' };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      {data.items.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
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
                  <Link href={`/admin/listings/${row.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                    {row.requestNumber}
                  </Link>
                </Td>
                <Td>{row.farmName}</Td>
                <Td><EnumLabel value={row.listingType} group="listingType" /></Td>
                <Td>{row.governorate}{row.areaName ? ` · ${row.areaName}` : ''}</Td>
                <Td><StatusBadge status={row.status} /></Td>
                <Td><PublishListingButton listingId={row.id} /></Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

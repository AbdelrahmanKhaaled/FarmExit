import { Suspense } from 'react';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { PublishListingButton } from '@/features/admin/listings/PublishListingButton';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { PublicationQueue } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

async function ListingPipelinePageContent({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/listing-pipeline'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'listingPipeline');
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.pipelinePage');
  const b = await getTranslations('batch');
  const result = await apiFetchAdminResult<PublicationQueue>(
    `/staff/listing-requests/publication-queue?page=${page}&pageSize=10`,
    session.accessToken,
  );
  if (!result.ok) {
    if (result.status === 403) {
      const denied = await getTranslations('admin.forbidden');
      return (
        <PageContainer>
          <EmptyState title={denied('title')} description={denied('body')} />
        </PageContainer>
      );
    }
    throw new Error(`Publication queue failed: ${result.status}`);
  }
  const data = result.data;
  const pagination = {
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    query: {},
    pathname: '/admin/listing-pipeline',
  };

  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('desc')}
        refreshLabel={t('refresh')}
      />
      <div className="operation-summary">
        <p>{b('publicationNote')}</p>
        <Link className="text-sm font-semibold text-[var(--admin-brand-primary)]" href="/admin/farms">
          {b('farmRegistry')}
        </Link>
      </div>
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
                  <Link
                    href={`/admin/listings/${row.id}`}
                    className="font-medium text-[var(--admin-brand-primary)] hover:underline"
                  >
                    {row.requestNumber}
                  </Link>
                </Td>
                <Td>{row.farmName}</Td>
                <Td>
                  <EnumLabel value={row.listingType} group="listingType" />
                </Td>
                <Td>
                  {row.governorate}
                  {row.areaName ? ` · ${row.areaName}` : ''}
                </Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td>
                  <PublishListingButton listingId={row.id} />
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

export default function ListingPipelinePage(props: Parameters<typeof ListingPipelinePageContent>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <ListingPipelinePageContent {...props} />
    </Suspense>
  );
}

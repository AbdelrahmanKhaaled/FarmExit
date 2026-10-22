import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EntityLink } from '@/features/admin/workspace/EntityLink';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { StaffListingList } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function ListingsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/listings'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'listings');
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.listingsPage');
  const data = await apiFetchAdmin<StaffListingList>(`/staff/listing-requests?page=${page}&pageSize=10`, session.accessToken);
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query: {}, pathname: '/admin/listings' };

  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('desc')}
        refreshLabel={t('refresh')}
        actions={
          <Link href="/admin/listing-pipeline" className="admin-btn-secondary">
            {t('pipelineLink')}
          </Link>
        }
      />
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
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
                <Td><EntityLink href={`/admin/listings/${row.id}`} label={row.requestNumber} /></Td>
                <Td>{row.farmName}</Td>
                <Td><EnumLabel value={row.listingType} group="listingType" /></Td>
                <Td><StatusBadge status={row.status} /></Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type List = {
  items: { id: string; requestNumber: string; status: string; listing: { listingSlug: string; listingType: string } }[];
  page: number;
  pageSize: number;
  total: number;
};

export default async function FarmDetailsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/farm-details'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'farmDetails');
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.farmDetailsPage');
  const data = await apiFetchAdmin<List>(`/staff/farm-details-requests?page=${page}&pageSize=10`, session.accessToken);
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query: {}, pathname: '/admin/farm-details' };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
          <thead>
            <tr>
              <Th>{t('col.request')}</Th>
              <Th>{t('col.listing')}</Th>
              <Th>{t('col.status')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/admin/farm-details/${r.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                    {r.requestNumber}
                  </Link>
                </Td>
                <Td>
                  {r.listing.listingSlug}
                  {' '}
                  (<EnumLabel value={r.listing.listingType} group="listingType" />)
                </Td>
                <Td><StatusBadge status={r.status} /></Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

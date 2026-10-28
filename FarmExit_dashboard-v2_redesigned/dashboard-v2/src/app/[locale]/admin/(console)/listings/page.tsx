import { Suspense } from 'react';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { StaffListingList } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

async function ListingsPageContent({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/listings'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'listings');
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.listingsPage');
  const b = await getTranslations('batch');
  const localeForDate = await getLocale();
  const data = await apiFetchAdmin<StaffListingList>(
    `/staff/listing-requests?page=${page}&pageSize=10`,
    session.accessToken,
  );
  const pagination = {
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    query: {},
    pathname: '/admin/listings',
  };

  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('desc')}
        refreshLabel={t('refresh')}
        actions={
          session.isAdmin ? (
            <Link href="/admin/listing-pipeline" className="admin-btn-secondary">
              {t('pipelineLink')}
            </Link>
          ) : undefined
        }
      />
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
          <thead>
            <tr>
              <Th>{t('col.farm')}</Th>
              <Th>{t('col.type')}</Th>
              <Th>{t('col.status')}</Th>
              <Th>{b('createdAt')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id}>
                <Td>
                  <Link
                    href={`/admin/listings/${row.id}`}
                    className="font-semibold text-[var(--admin-brand-primary)] hover:underline"
                  >
                    {row.farmName}
                  </Link>
                  <div className="mt-1 text-xs text-[var(--admin-text-muted)]">{row.requestNumber}</div>
                </Td>
                <Td>
                  <EnumLabel value={row.listingType} group="listingType" />
                </Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td>
                  {row.createdAt
                    ? new Intl.DateTimeFormat(localeForDate, { dateStyle: 'medium' }).format(new Date(row.createdAt))
                    : '?'}
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

export default function Page(props: Parameters<typeof ListingsPageContent>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <ListingsPageContent {...props} />
    </Suspense>
  );
}

import { Suspense } from 'react';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { FarmFilters } from '@/features/admin/farms/FarmFilters';
import { FarmRowActions } from '@/features/admin/farms/FarmRowActions';
import { ActionIcon } from '@/features/admin/workspace/ActionIcon';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { AdminFarmList } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';

async function FarmsPageContent({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/farms'> & {
  searchParams: Promise<{
    page?: string;
    search?: string;
    farmStatus?: string;
    governorate?: string;
    listingPublication?: string;
  }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'farms');
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const search = sp.search ?? '';
  const farmStatus = sp.farmStatus ?? '';
  const governorate = sp.governorate ?? '';
  const listingPublication = sp.listingPublication ?? '';
  const b = await getTranslations('batch');
  const options = await apiFetchAdmin<{ governorates: string[]; statuses: string[] }>(
    '/staff/admin/farm-filter-options',
    session.accessToken,
  );
  const canManage = session.staff.roles.includes('superAdmin');
  const t = await getTranslations('admin.farms');
  const loc = await getLocale();

  const qs = new URLSearchParams({ page, pageSize: '10' });
  if (search) qs.set('search', search);
  if (farmStatus) qs.set('farmStatus', farmStatus);
  if (governorate) qs.set('governorate', governorate);
  if (listingPublication) qs.set('listingPublication', listingPublication);
  const data = await apiFetchAdmin<AdminFarmList>(`/staff/admin/farms?${qs}`, session.accessToken);

  const query = { search, farmStatus, governorate, listingPublication };
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query, pathname: '/admin/farms' };

  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        actions={
          canManage ? (
            <Link href="/admin/farms/new" className="admin-btn-primary inline-flex items-center gap-2">
              <ActionIcon name="plus" />
              {b('addFarm')}
            </Link>
          ) : undefined
        }
        description={t('desc')}
        refreshLabel={t('refresh')}
      />
      <FarmFilters
        key={JSON.stringify(query)}
        search={search}
        governorate={governorate}
        farmStatus={farmStatus}
        listingPublication={listingPublication}
        options={options}
      />
      <p className="workflow-help mb-4">{b('registryNote')}</p>
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
          <thead>
            <tr>
              <Th>{t('col.name')}</Th>
              <Th>{t('col.governorate')}</Th>
              <Th>{t('col.area')}</Th>
              <Th>{t('col.feddan')}</Th>
              <Th>{b('farmStatusLabel')}</Th>
              <Th>{b('publication')}</Th>
              <Th>{t('col.created')}</Th>
              <Th>{b('actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id}>
                <Td>
                  <Link
                    href={`/admin/farms/${row.id}`}
                    className="font-medium text-[var(--admin-brand-primary)] hover:underline"
                  >
                    {row.name}
                  </Link>
                </Td>
                <Td>{row.governorate}</Td>
                <Td>{row.areaName ?? '—'}</Td>
                <Td className="tabular-nums">{row.areaFeddan}</Td>
                <Td>
                  <StatusBadge status={row.farmStatus} />
                </Td>
                <Td>
                  {row.publishedListings?.length ? (
                    row.publishedListings.map((l) => (
                      <Link
                        key={l.id}
                        className="block text-xs text-[var(--admin-brand-primary)] hover:underline"
                        href={`/admin/listings/${l.id}`}
                      >
                        {b(l.listingType === 'sale' ? 'publishedSale' : 'publishedRent')}
                      </Link>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--admin-text-muted)]">{b('noPublished')}</span>
                  )}
                </Td>
                <Td className="tabular-nums text-[var(--admin-text-muted)]">
                  {new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt))}
                </Td>
                <Td>
                  <FarmRowActions id={row.id} canManage={canManage} />
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

export default function FarmsPage(props: Parameters<typeof FarmsPageContent>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <FarmsPageContent {...props} />
    </Suspense>
  );
}

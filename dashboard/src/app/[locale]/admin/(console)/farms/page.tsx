import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { EmptyState } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { TablePaginationLinks } from '@/features/admin/workspace/TablePaginationLinks';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, getAdminSession } from '@/lib/admin/session.server';
import type { AdminFarmList } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';

export default async function FarmsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/farms'> & {
  searchParams: Promise<{ page?: string; search?: string; farmStatus?: string; governorate?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const search = sp.search ?? '';
  const farmStatus = sp.farmStatus ?? '';
  const governorate = sp.governorate ?? '';
  const t = await getTranslations('admin.farms');
  const loc = await getLocale();

  const qs = new URLSearchParams({ page, pageSize: '10' });
  if (search) qs.set('search', search);
  if (farmStatus) qs.set('farmStatus', farmStatus);
  if (governorate) qs.set('governorate', governorate);
  const data = await apiFetchAdmin<AdminFarmList>(`/staff/admin/farms?${qs}`, session.accessToken);

  const query = { search, farmStatus, governorate };

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
        <input
          name="search"
          defaultValue={search}
          placeholder={t('search')}
          className="w-full max-w-md rounded-md border border-[var(--admin-border-subtle)] px-3 py-2 text-sm"
        />
        <input
          name="governorate"
          defaultValue={governorate}
          placeholder={t('filterGovernorate')}
          className="w-full max-w-xs rounded-md border border-[var(--admin-border-subtle)] px-3 py-2 text-sm"
        />
        <input
          name="farmStatus"
          defaultValue={farmStatus}
          placeholder={t('filterStatus')}
          className="w-full max-w-xs rounded-md border border-[var(--admin-border-subtle)] px-3 py-2 text-sm"
        />
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
                <Th>{t('col.name')}</Th>
                <Th>{t('col.governorate')}</Th>
                <Th>{t('col.area')}</Th>
                <Th>{t('col.feddan')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.created')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <Link href={`/admin/farms/${row.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {row.name}
                    </Link>
                  </Td>
                  <Td>{row.governorate}</Td>
                  <Td>{row.areaName ?? '—'}</Td>
                  <Td>{row.areaFeddan}</Td>
                  <Td><StatusBadge status={row.farmStatus} /></Td>
                  <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt))}</Td>
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
            pathname="/admin/farms"
          />
        </>
      )}
    </PageContainer>
  );
}

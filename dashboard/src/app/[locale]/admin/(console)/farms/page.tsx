import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminFilterForm } from '@/features/admin/workspace/AdminFilterForm';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
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
  const session = await requireConsolePage(locale, 'farms');
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
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query, pathname: '/admin/farms' };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      <AdminFilterForm submitLabel={t('applyFilters')}>
        <input name="search" defaultValue={search} placeholder={t('search')} className="admin-form-control max-w-md" />
        <input name="governorate" defaultValue={governorate} placeholder={t('filterGovernorate')} className="admin-form-control" />
        <input name="farmStatus" defaultValue={farmStatus} placeholder={t('filterStatus')} className="admin-form-control" />
      </AdminFilterForm>
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
                <Td className="tabular-nums">{row.areaFeddan}</Td>
                <Td><StatusBadge status={row.farmStatus} /></Td>
                <Td className="tabular-nums text-[var(--admin-text-muted)]">
                  {new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt))}
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

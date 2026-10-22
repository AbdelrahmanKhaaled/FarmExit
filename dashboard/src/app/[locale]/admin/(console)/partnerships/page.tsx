import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';

export default async function PartnershipsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/partnerships'> & { searchParams: Promise<{ page?: string; tab?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'partnerships');
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const tab = sp.tab === 'applications' ? 'applications' : 'requests';
  const t = await getTranslations('admin.partnershipsPage');
  const path = tab === 'applications' ? '/staff/partnership-applications' : '/staff/partnership-requests';
  const data = await apiFetchAdmin<{
    items: { id: string; requestNumber: string; status: string; farmName?: string; parentPartnershipRequestId?: string }[];
    page: number;
    pageSize: number;
    total: number;
  }>(`${path}?page=${page}&pageSize=10`, session.accessToken);
  const detailPrefix = tab === 'applications' ? '/admin/partnerships/applications' : '/admin/partnerships';
  const pagination = {
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    query: { tab: tab === 'applications' ? 'applications' : undefined },
    pathname: '/admin/partnerships',
  };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      <div className="admin-segment-tabs mb-4">
        <Link href="/admin/partnerships?tab=requests" className={cn('admin-segment-tab', tab === 'requests' && 'is-active')}>{t('tabRequests')}</Link>
        <Link href="/admin/partnerships?tab=applications" className={cn('admin-segment-tab', tab === 'applications' && 'is-active')}>{t('tabApplications')}</Link>
      </div>
      <p className="mb-6 text-xs text-[var(--admin-text-muted)]">{t('nonBinding')}</p>
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
          <thead>
            <tr>
              <Th>{t('col.request')}</Th>
              <Th>{tab === 'applications' ? t('col.parent') : t('col.farm')}</Th>
              <Th>{t('col.status')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`${detailPrefix}/${r.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                    {r.requestNumber}
                  </Link>
                </Td>
                <Td>{tab === 'applications' ? (r.parentPartnershipRequestId ?? '—') : (r.farmName ?? '—')}</Td>
                <Td><StatusBadge status={r.status} /></Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

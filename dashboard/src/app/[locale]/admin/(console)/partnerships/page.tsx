import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { TablePaginationLinks } from '@/features/admin/workspace/TablePaginationLinks';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

export default async function PartnershipsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/partnerships'> & { searchParams: Promise<{ page?: string; tab?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const tab = sp.tab === 'applications' ? 'applications' : 'requests';
  const t = await getTranslations('admin.partnershipsPage');
  const path = tab === 'applications' ? '/staff/partnership-applications' : '/staff/partnership-requests';
  const data = await apiFetchAdmin<{ items: { id: string; requestNumber: string; status: string; farmName?: string; parentPartnershipRequestId?: string }[]; page: number; pageSize: number; total: number }>(
    `${path}?page=${page}&pageSize=10`,
    session.accessToken,
  );
  const pag = { showing: t('pagination.showing'), prev: t('pagination.prev'), next: t('pagination.next'), page: t('pagination.page') };
  const detailPrefix = tab === 'applications' ? '/admin/partnerships/applications' : '/admin/partnerships';

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between"><div><p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--admin-brand-primary)]">{t('eyebrow')}</p><h1 className="text-2xl font-semibold">{t('title')}</h1><p className="text-sm text-[var(--admin-text-muted)]">{t('desc')}</p></div><RefreshButton label={t('refresh')} /></div>
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/admin/partnerships?tab=requests" className={tab === 'requests' ? 'font-semibold text-[var(--admin-brand-primary)]' : ''}>{t('tabRequests')}</Link>
        <Link href="/admin/partnerships?tab=applications" className={tab === 'applications' ? 'font-semibold text-[var(--admin-brand-primary)]' : ''}>{t('tabApplications')}</Link>
      </div>
      <p className="mb-4 text-xs text-[var(--admin-text-muted)]">{t('nonBinding')}</p>
      {data.items.length === 0 ? <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} /> : (
        <><DataTable><thead><tr><Th>{t('col.request')}</Th><Th>{tab === 'applications' ? t('col.parent') : t('col.farm')}</Th><Th>{t('col.status')}</Th></tr></thead><tbody>{data.items.map((r) => (<tr key={r.id}><Td><Link href={`${detailPrefix}/${r.id}`} className="text-[var(--admin-brand-primary)] hover:underline">{r.requestNumber}</Link></Td><Td>{tab === 'applications' ? (r.parentPartnershipRequestId ?? '—') : (r.farmName ?? '—')}</Td><Td><StatusBadge status={r.status} /></Td></tr>))}</tbody></DataTable><TablePaginationLinks page={data.page} pageSize={data.pageSize} total={data.total} labels={pag} query={{ tab: tab === 'applications' ? 'applications' : undefined }} pathname="/admin/partnerships" /></>
      )}
    </PageContainer>
  );
}

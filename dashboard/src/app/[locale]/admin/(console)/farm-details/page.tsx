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

type List = { items: { id: string; requestNumber: string; status: string; listing: { listingSlug: string; listingType: string } }[]; page: number; pageSize: number; total: number };

export default async function FarmDetailsPage({ params, searchParams }: PageProps<'/[locale]/admin/farm-details'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.farmDetailsPage');
  const data = await apiFetchAdmin<List>(`/staff/farm-details-requests?page=${page}&pageSize=10`, session.accessToken);
  const pag = { showing: t('pagination.showing'), prev: t('pagination.prev'), next: t('pagination.next'), page: t('pagination.page') };

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between"><div><p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--admin-brand-primary)]">{t('eyebrow')}</p><h1 className="text-2xl font-semibold">{t('title')}</h1><p className="text-sm text-[var(--admin-text-muted)]">{t('desc')}</p></div><RefreshButton label={t('refresh')} /></div>
      {data.items.length === 0 ? <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} /> : (
        <><DataTable><thead><tr><Th>{t('col.request')}</Th><Th>{t('col.listing')}</Th><Th>{t('col.status')}</Th></tr></thead><tbody>{data.items.map((r) => (<tr key={r.id}><Td><Link href={`/admin/farm-details/${r.id}`} className="text-[var(--admin-brand-primary)] hover:underline">{r.requestNumber}</Link></Td><Td>{r.listing.listingSlug} ({r.listing.listingType})</Td><Td><StatusBadge status={r.status} /></Td></tr>))}</tbody></DataTable><TablePaginationLinks page={data.page} pageSize={data.pageSize} total={data.total} labels={pag} query={{}} pathname="/admin/farm-details" /></>
      )}
    </PageContainer>
  );
}

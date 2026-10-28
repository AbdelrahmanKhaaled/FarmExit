import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { CreateCoPurchaseForm } from '@/features/admin/workflows/CreateCoPurchaseForm';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type GroupList = {
  items: { id: string; listingId: string; groupStatus: string; targetSharePercent: string }[];
  page: number;
  pageSize: number;
  total: number;
};

export default async function CoPurchasePage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/co-purchase'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'coPurchase');
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.coPurchasePage');
  const data = await apiFetchAdmin<GroupList>(`/staff/co-purchase-groups?page=${page}&pageSize=10`, session.accessToken);
  const { caseAgentOptions } = await loadStaffOptionSets(session.accessToken);
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query: {}, pathname: '/admin/co-purchase' };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      <CreateCoPurchaseForm staffOptions={caseAgentOptions} />
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
          <thead>
            <tr><Th>{t('col.group')}</Th><Th>{t('col.listing')}</Th><Th>{t('col.target')}</Th><Th>{t('col.status')}</Th></tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id}>
                <Td>
                  <Link href={`/admin/co-purchase/${row.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">{row.id}</Link>
                </Td>
                <Td><Link href={`/admin/listings/${row.listingId}`} className="text-[var(--admin-brand-primary)] hover:underline">{row.listingId}</Link></Td>
                <Td className="tabular-nums">{row.targetSharePercent}%</Td>
                <Td><StatusBadge status={row.groupStatus} /></Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

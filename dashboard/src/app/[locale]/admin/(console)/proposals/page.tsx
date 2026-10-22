import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type ProposalList = {
  items: { id: string; requestNumber: string; proposalKind: string; status: string; listingId: string }[];
  page: number;
  pageSize: number;
  total: number;
};

export default async function ProposalsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/proposals'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'proposals');
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.proposalsPage');
  const data = await apiFetchAdmin<ProposalList>(`/staff/purchase-proposals?page=${page}&pageSize=10`, session.accessToken);

  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query: {}, pathname: '/admin/proposals' };

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
              <Th>{t('col.type')}</Th>
              <Th>{t('col.listing')}</Th>
              <Th>{t('col.status')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id}>
                <Td>
                  <Link href={`/admin/proposals/${row.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                    {row.requestNumber}
                  </Link>
                </Td>
                <Td><EnumLabel value={row.proposalKind} group="proposalKind" /></Td>
                <Td>
                  <Link href={`/admin/listings/${row.listingId}`} className="text-[var(--admin-brand-primary)] hover:underline">{row.listingId}</Link>
                </Td>
                <Td><StatusBadge status={row.status} /></Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

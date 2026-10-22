import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminFilterForm } from '@/features/admin/workspace/AdminFilterForm';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EntityLink } from '@/features/admin/workspace/EntityLink';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type CaseList = {
  items: { id: string; requestId: string; status: string; assignedStaffId: string; createdAt: string | null }[];
  page: number;
  pageSize: number;
  total: number;
};

export default async function CommunicationsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/communications'> & {
  searchParams: Promise<{ page?: string; status?: string; requestId?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'communications');
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const t = await getTranslations('admin.communicationsPage');
  const qs = new URLSearchParams({ page, pageSize: '10' });
  if (sp.status) qs.set('status', sp.status);
  if (sp.requestId) qs.set('requestId', sp.requestId);
  const data = await apiFetchAdmin<CaseList>(`/staff/communication/cases?${qs}`, session.accessToken);
  const pagination = {
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    query: { status: sp.status, requestId: sp.requestId },
    pathname: '/admin/communications',
  };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      <AdminFilterForm submitLabel={t('filter')}>
        <input name="requestId" placeholder={t('requestIdFilter')} defaultValue={sp.requestId ?? ''} className="admin-form-control" />
        <input name="status" placeholder={t('statusFilter')} defaultValue={sp.status ?? ''} className="admin-form-control" />
      </AdminFilterForm>
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
          <thead>
            <tr>
              <Th>{t('col.case')}</Th>
              <Th>{t('col.request')}</Th>
              <Th>{t('col.status')}</Th>
              <Th>{t('col.agent')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id}>
                <Td>
                  <Link href={`/admin/communications/${row.id}`} className="font-semibold text-[var(--admin-brand-primary)] hover:underline">
                    {t('caseLabel', { id: row.id })}
                  </Link>
                </Td>
                <Td>
                  <EntityLink href={`/admin/requests/${row.requestId}`} label={row.requestId} />
                </Td>
                <Td><StatusBadge status={row.status} group="caseStatus" /></Td>
                <Td className="font-mono text-xs text-[var(--admin-text-muted)]">
                  <span title={row.assignedStaffId}>{row.assignedStaffId}</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { TablePaginationLinks } from '@/features/admin/workspace/TablePaginationLinks';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, getAdminSession } from '@/lib/admin/session.server';
import type { AdminEvaluationList } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';

export default async function EvaluationsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/evaluations'> & {
  searchParams: Promise<{ page?: string; status?: string; farmId?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const t = await getTranslations('admin.evaluationsPage');
  const loc = await getLocale();
  const qs = new URLSearchParams({ page, pageSize: '20' });
  if (sp.status) qs.set('status', sp.status);
  if (sp.farmId) qs.set('farmId', sp.farmId);
  const data = await apiFetchAdmin<AdminEvaluationList>(`/staff/admin/evaluations?${qs}`, session.accessToken);

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--admin-brand-primary)]">{t('eyebrow')}</p>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">{t('desc')}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2 text-sm">
        <input name="farmId" placeholder={t('farmIdFilter')} defaultValue={sp.farmId ?? ''} className="rounded border px-2 py-1" />
        <input name="status" placeholder={t('statusFilter')} defaultValue={sp.status ?? ''} className="rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-[var(--admin-brand-primary)] px-3 py-1 text-xs font-semibold text-white">{t('filter')}</button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <Th>{t('col.farm')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.score')}</Th>
                <Th>{t('col.reviewer')}</Th>
                <Th>{t('col.created')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <Link
                      href={`/admin/evaluations/${row.farmId}/${row.id}`}
                      className="text-[var(--admin-brand-primary)] hover:underline"
                    >
                      {row.farmName}
                    </Link>
                  </Td>
                  <Td><StatusBadge status={row.status} /></Td>
                  <Td>
                    {row.scoreValue != null && row.scoreMax != null ? `${row.scoreValue} / ${row.scoreMax}` : '—'}
                  </Td>
                  <Td>{row.reviewerName ?? '—'}</Td>
                  <Td>{row.createdAt ? new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt)) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePaginationLinks
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            pathname="/admin/evaluations"
            query={{ status: sp.status, farmId: sp.farmId }}
            labels={{
              showing: t('pagination.showing'),
              prev: t('pagination.prev'),
              next: t('pagination.next'),
              page: t('pagination.page'),
            }}
          />
        </>
      )}
    </PageContainer>
  );
}

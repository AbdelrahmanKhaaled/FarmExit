import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { AdminFilterForm } from '@/features/admin/workspace/AdminFilterForm';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
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
  const session = await requireConsolePage(locale, 'evaluations');
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const t = await getTranslations('admin.evaluationsPage');
  const loc = await getLocale();
  const qs = new URLSearchParams({ page, pageSize: '20' });
  if (sp.status) qs.set('status', sp.status);
  if (sp.farmId) qs.set('farmId', sp.farmId);
  const data = await apiFetchAdmin<AdminEvaluationList>(`/staff/admin/evaluations?${qs}`, session.accessToken);

  const query = { status: sp.status, farmId: sp.farmId };
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query, pathname: '/admin/evaluations' };

  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('desc')}
        refreshLabel={t('refresh')}
        actions={
          <Link href={sp.farmId ? `/admin/evaluations/new?farmId=${sp.farmId}` : '/admin/farms'} className="admin-btn-secondary">
            {t('create')}
          </Link>
        }
      />
      <AdminFilterForm submitLabel={t('filter')}>
        <input name="farmId" placeholder={t('farmIdFilter')} defaultValue={sp.farmId ?? ''} className="admin-form-control" />
        <input name="status" placeholder={t('statusFilter')} defaultValue={sp.status ?? ''} className="admin-form-control" />
      </AdminFilterForm>

      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
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
                  <Link href={`/admin/evaluations/${row.farmId}/${row.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                    {row.farmName}
                  </Link>
                </Td>
                <Td><StatusBadge status={row.status} /></Td>
                <Td className="tabular-nums">{row.scoreValue != null && row.scoreMax != null ? `${row.scoreValue} / ${row.scoreMax}` : '—'}</Td>
                <Td>{row.reviewerName ?? '—'}</Td>
                <Td className="tabular-nums text-[var(--admin-text-muted)]">
                  {row.createdAt ? new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt)) : '—'}
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

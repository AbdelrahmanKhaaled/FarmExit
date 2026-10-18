import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { TablePaginationLinks } from '@/features/admin/workspace/TablePaginationLinks';
import { apiFetchAdmin, getAdminSession } from '@/lib/admin/session.server';
import type { AdminAuditList } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';

export default async function AuditLogsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/audit-logs'> & {
  searchParams: Promise<{ page?: string; search?: string; module?: string; action?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const t = await getTranslations('admin.auditPage');
  const loc = await getLocale();
  const qs = new URLSearchParams({ page, pageSize: '20' });
  if (sp.search) qs.set('search', sp.search);
  if (sp.module) qs.set('module', sp.module);
  if (sp.action) qs.set('action', sp.action);
  if (sp.from) qs.set('from', sp.from);
  if (sp.to) qs.set('to', sp.to);
  const data = await apiFetchAdmin<AdminAuditList>(`/staff/admin/audit-logs?${qs}`, session.accessToken);

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

      <form method="get" className="mb-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <input name="search" placeholder={t('searchPlaceholder')} defaultValue={sp.search ?? ''} className="rounded border px-2 py-1" />
        <input name="module" placeholder={t('moduleFilter')} defaultValue={sp.module ?? ''} className="rounded border px-2 py-1" />
        <input name="action" placeholder={t('actionFilter')} defaultValue={sp.action ?? ''} className="rounded border px-2 py-1" />
        <input name="from" type="date" defaultValue={sp.from ?? ''} className="rounded border px-2 py-1" />
        <input name="to" type="date" defaultValue={sp.to ?? ''} className="rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-[var(--admin-brand-primary)] px-3 py-1 text-xs font-semibold text-white sm:col-span-2 lg:col-span-1">
          {t('filter')}
        </button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <Th>{t('col.when')}</Th>
                <Th>{t('col.actor')}</Th>
                <Th>{t('col.action')}</Th>
                <Th>{t('col.module')}</Th>
                <Th>{t('col.entity')}</Th>
                <Th>{t('col.details')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.createdAt))}</Td>
                  <Td>{row.actorName ?? row.actorUserId ?? '—'}</Td>
                  <Td>{row.action}</Td>
                  <Td>{row.entityType}</Td>
                  <Td>{row.entityId}</Td>
                  <Td>{row.summary ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePaginationLinks
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            pathname="/admin/audit-logs"
            query={{ search: sp.search, module: sp.module, action: sp.action, from: sp.from, to: sp.to }}
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

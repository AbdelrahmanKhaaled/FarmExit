import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
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
  const session = await requireConsolePage(locale, 'auditLogs');
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
  const query = { search: sp.search, module: sp.module, action: sp.action, from: sp.from, to: sp.to };
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query, pathname: '/admin/audit-logs' };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      <form method="get" className="mb-6 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input name="search" placeholder={t('searchPlaceholder')} defaultValue={sp.search ?? ''} className="admin-form-control" />
          <input name="module" placeholder={t('moduleFilter')} defaultValue={sp.module ?? ''} className="admin-form-control" />
          <input name="action" placeholder={t('actionFilter')} defaultValue={sp.action ?? ''} className="admin-form-control" />
          <input name="from" type="date" defaultValue={sp.from ?? ''} className="admin-form-control" />
          <input name="to" type="date" defaultValue={sp.to ?? ''} className="admin-form-control" />
        </div>
        <button type="submit" className="admin-btn-primary">{t('filter')}</button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
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
                <Td className="whitespace-nowrap tabular-nums text-[var(--admin-text-muted)]">
                  {new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.createdAt))}
                </Td>
                <Td>{row.actorName ?? row.actorUserId ?? '—'}</Td>
                <Td>{row.action}</Td>
                <Td>{row.entityType}</Td>
                <Td className="font-mono text-xs">{row.entityId}</Td>
                <Td className="max-w-xs truncate">{row.summary ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

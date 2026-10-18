import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { TablePaginationLinks } from '@/features/admin/workspace/TablePaginationLinks';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, getAdminSession } from '@/lib/admin/session.server';
import type { AdminUsersList } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';

export default async function AdministratorsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/administrators'> & { searchParams: Promise<{ search?: string; page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const t = await getTranslations('admin.administratorsPage');
  const loc = await getLocale();
  const qs = new URLSearchParams({ tab: 'admins', pageSize: '10', page });
  if (sp.search) qs.set('search', sp.search);
  const data = await apiFetchAdmin<AdminUsersList>(`/staff/admin/users?${qs}`, session.accessToken);

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

      <p className="mb-4 text-xs text-[var(--admin-text-muted)]">{t('noProvisionUi')}</p>

      <form method="get" className="mb-4 flex flex-wrap gap-2 text-sm">
        <input name="search" placeholder={t('searchPlaceholder')} defaultValue={sp.search ?? ''} className="rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-[var(--admin-brand-primary)] px-3 py-1 text-xs font-semibold text-white">{t('filter')}</button>
      </form>

      {data.adminItems.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <Th>{t('col.name')}</Th>
                <Th>{t('col.email')}</Th>
                <Th>{t('col.mobile')}</Th>
                <Th>{t('col.role')}</Th>
                <Th>{t('col.credential')}</Th>
                <Th>{t('col.created')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.adminItems.map((row) => (
                <tr key={row.userId}>
                  <Td>{row.fullName ?? '—'}</Td>
                  <Td>{row.email ?? '—'}</Td>
                  <Td>{row.mobile ?? '—'}</Td>
                  <Td>{row.roles.join(', ')}</Td>
                  <Td>{row.hasCredential ? t('credentialActive') : t('credentialMissing')}</Td>
                  <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt))}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePaginationLinks
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            pathname="/admin/administrators"
            query={{ search: sp.search }}
            labels={{
              showing: t('pagination.showing'),
              prev: t('pagination.prev'),
              next: t('pagination.next'),
              page: t('pagination.page'),
            }}
          />
        </>
      )}
      <p className="mt-4 text-sm">
        <Link href="/admin/users" className="text-[var(--admin-brand-primary)] hover:underline">{t('linkUsers')}</Link>
      </p>
    </PageContainer>
  );
}

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

function buildUsersQuery(sp: { search?: string; accountStatus?: string; page?: string }) {
  const qs = new URLSearchParams();
  qs.set('tab', 'users');
  qs.set('pageSize', '10');
  if (sp.search) qs.set('search', sp.search);
  if (sp.accountStatus) qs.set('accountStatus', sp.accountStatus);
  if (sp.page) qs.set('page', sp.page);
  return qs.toString();
}

export default async function UsersPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/users'> & {
  searchParams: Promise<{ search?: string; accountStatus?: string; page?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const t = await getTranslations('admin.usersPage');
  const loc = await getLocale();
  const data = await apiFetchAdmin<AdminUsersList>(
    `/staff/admin/users?${buildUsersQuery({ ...sp, page })}`,
    session.accessToken,
  );

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
        <input
          name="search"
          placeholder={t('searchPlaceholder')}
          defaultValue={sp.search ?? ''}
          className="rounded border px-2 py-1"
        />
        <select name="accountStatus" defaultValue={sp.accountStatus ?? ''} className="rounded border px-2 py-1">
          <option value="">{t('allStatuses')}</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
        <button type="submit" className="rounded bg-[var(--admin-brand-primary)] px-3 py-1 text-xs font-semibold text-white">
          {t('filter')}
        </button>
        <Link href="/admin/administrators" className="self-center text-xs text-[var(--admin-brand-primary)] hover:underline">
          {t('linkAdministrators')}
        </Link>
      </form>

      {data.userItems.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <DataTable>
            <thead>
              <tr>
                <Th>{t('col.name')}</Th>
                <Th>{t('col.email')}</Th>
                <Th>{t('col.mobile')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.created')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.userItems.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <Link href={`/admin/users/${row.id}`} className="text-[var(--admin-brand-primary)] hover:underline">
                      {row.fullName ?? row.id}
                    </Link>
                  </Td>
                  <Td>{row.email ?? '—'}</Td>
                  <Td>{row.mobile ?? '—'}</Td>
                  <Td>{row.accountStatus}</Td>
                  <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt))}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePaginationLinks
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            pathname="/admin/users"
            query={{ search: sp.search, accountStatus: sp.accountStatus }}
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

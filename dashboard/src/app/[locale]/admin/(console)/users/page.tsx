import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminFilterForm } from '@/features/admin/workspace/AdminFilterForm';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
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
  const session = await requireConsolePage(locale, 'users');
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const t = await getTranslations('admin.usersPage');
  const tEnum = await getTranslations('admin.enums');
  const loc = await getLocale();
  const data = await apiFetchAdmin<AdminUsersList>(
    `/staff/admin/users?${buildUsersQuery({ ...sp, page })}`,
    session.accessToken,
  );

  const query = { search: sp.search, accountStatus: sp.accountStatus };
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query, pathname: '/admin/users' };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      <AdminFilterForm submitLabel={t('filter')}>
        <input name="search" placeholder={t('searchPlaceholder')} defaultValue={sp.search ?? ''} className="admin-form-control max-w-md" />
        <select name="accountStatus" defaultValue={sp.accountStatus ?? ''} className="admin-form-control">
          <option value="">{t('allStatuses')}</option>
          <option value="active">{tEnum('accountStatus.active')}</option>
          <option value="suspended">{tEnum('accountStatus.suspended')}</option>
        </select>
        <Link href="/admin/administrators" className="self-center text-xs font-semibold text-[var(--admin-brand-primary)] hover:underline">
          {t('linkAdministrators')}
        </Link>
      </AdminFilterForm>

      {data.userItems.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
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
                  <Link href={`/admin/users/${row.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                    {row.fullName ?? row.id}
                  </Link>
                </Td>
                <Td>{row.email ?? '—'}</Td>
                <Td>{row.mobile ?? '—'}</Td>
                <Td><EnumLabel value={row.accountStatus} group="accountStatus" /></Td>
                <Td className="tabular-nums text-[var(--admin-text-muted)]">
                  {new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt))}
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}

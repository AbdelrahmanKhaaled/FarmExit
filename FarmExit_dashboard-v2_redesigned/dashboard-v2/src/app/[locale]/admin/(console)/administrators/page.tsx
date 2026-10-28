import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { AdminFilterForm } from '@/features/admin/workspace/AdminFilterForm';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { AdminUsersList } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';
import { CreateAdministratorForm, type RoleOption } from '@/features/admin/accounts/CreateAdministratorForm';

export default async function AdministratorsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/administrators'> & { searchParams: Promise<{ search?: string; page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'administrators');
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const t = await getTranslations('admin.administratorsPage');
  const loc = await getLocale();
  const qs = new URLSearchParams({ tab: 'admins', pageSize: '10', page });
  if (sp.search) qs.set('search', sp.search);
  const [data, roleOptions] = await Promise.all([
    apiFetchAdmin<AdminUsersList>(`/staff/admin/users?${qs}`, session.accessToken),
    apiFetchAdmin<RoleOption[]>('/staff/admin/administrators/role-options', session.accessToken),
  ]);
  const pagination = {
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    query: { search: sp.search },
    pathname: '/admin/administrators',
  };

  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('desc')}
        refreshLabel={t('refresh')}
      />
      <CreateAdministratorForm options={roleOptions} />
      <AdminFilterForm submitLabel={t('filter')}>
        <input
          name="search"
          placeholder={t('searchPlaceholder')}
          defaultValue={sp.search ?? ''}
          className="admin-form-control max-w-md"
        />
      </AdminFilterForm>

      {data.adminItems.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
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
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {row.roles.map((role) => (
                      <EnumLabel key={role} value={role} group="adminRole" className="text-xs font-medium" />
                    ))}
                  </div>
                </Td>
                <Td>{row.hasCredential ? t('credentialActive') : t('credentialMissing')}</Td>
                <Td className="tabular-nums text-[var(--admin-text-muted)]">
                  {new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt))}
                </Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
      <p className="mt-6 text-sm">
        <Link href="/admin/users" className="font-semibold text-[var(--admin-brand-primary)] hover:underline">
          {t('linkUsers')}
        </Link>
      </p>
    </PageContainer>
  );
}

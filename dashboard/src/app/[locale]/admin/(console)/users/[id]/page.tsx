import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import type { AdminUserDetail } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';

export default async function UserDetailPage({ params }: PageProps<'/[locale]/admin/users/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const t = await getTranslations('admin.userDetail');
  const loc = await getLocale();

  const res = await apiFetchAdminResult<AdminUserDetail>(`/staff/admin/users/${id}`, session.accessToken);
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) notFound();
    throw new Error(res.message ?? `User ${id}`);
  }
  const user = res.data;

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between">
        <div>
          <Link href="/admin/users" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
          <h1 className="mt-1 text-2xl font-semibold">{user.fullName ?? user.id}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">{t('farmRolesHint')}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      <dl className="mb-8 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-[var(--admin-text-muted)]">{t('mobile')}</dt><dd>{user.mobile}</dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('email')}</dt><dd>{user.email ?? '—'}</dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('status')}</dt><dd>{user.accountStatus}</dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('requestsCreated')}</dt><dd>{user.requestsCreatedCount}</dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('registered')}</dt><dd>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(user.createdAt))}</dd></div>
      </dl>

      <h2 className="mb-2 text-sm font-semibold">{t('farmRelationships')}</h2>
      <DataTable>
        <thead>
          <tr>
            <Th>{t('col.farm')}</Th>
            <Th>{t('col.role')}</Th>
          </tr>
        </thead>
        <tbody>
          {user.farmRelationships.length === 0 ? (
            <tr><Td colSpan={2}>{t('none')}</Td></tr>
          ) : (
            user.farmRelationships.map((r) => (
              <tr key={`${r.farmId}-${r.relationshipRole}`}>
                <Td>
                  <Link href={`/admin/farms/${r.farmId}`} className="text-[var(--admin-brand-primary)] hover:underline">{r.farmName}</Link>
                </Td>
                <Td>{r.relationshipRole}</Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </PageContainer>
  );
}

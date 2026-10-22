import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { AdminDetailSection } from '@/features/admin/workspace/AdminDetailSection';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { AdminUserDetail } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';

export default async function UserDetailPage({ params }: PageProps<'/[locale]/admin/users/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'userDetail');
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
      <AdminDetailHeader
        backHref="/admin/users"
        backLabel={t('back')}
        title={user.fullName ?? user.id}
        subtitle={t('farmRolesHint')}
        status={user.accountStatus}
        statusGroup="accountStatus"
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <div className="space-y-6">
            <AdminDetailSection title={t('profile')}>
              <dl className="admin-detail-dl sm:grid-cols-2">
                <div>
                  <dt>{t('mobile')}</dt>
                  <dd className="tabular-nums">{user.mobile}</dd>
                </div>
                <div>
                  <dt>{t('email')}</dt>
                  <dd>{user.email ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('status')}</dt>
                  <dd><EnumLabel value={user.accountStatus} group="accountStatus" /></dd>
                </div>
                <div>
                  <dt>{t('requestsCreated')}</dt>
                  <dd className="tabular-nums">{user.requestsCreatedCount}</dd>
                </div>
                <div>
                  <dt>{t('registered')}</dt>
                  <dd className="tabular-nums text-[var(--admin-text-muted)]">
                    {new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(user.createdAt))}
                  </dd>
                </div>
              </dl>
            </AdminDetailSection>
            <AdminDetailSection title={t('farmRelationships')}>
              <DataTable embedded>
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
                          <Link href={`/admin/farms/${r.farmId}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                            {r.farmName}
                          </Link>
                        </Td>
                        <Td>{r.relationshipRole}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </AdminDetailSection>
          </div>
        }
      />
    </PageContainer>
  );
}

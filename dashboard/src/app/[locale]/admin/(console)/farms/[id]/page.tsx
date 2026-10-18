import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import type { AdminFarmDetail } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function FarmDetailPage({ params }: PageProps<'/[locale]/admin/farms/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const t = await getTranslations('admin.farmDetail');
  const loc = await getLocale();

  const res = await apiFetchAdminResult<AdminFarmDetail>(`/staff/admin/farms/${id}`, session.accessToken);
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error(res.message ?? `Farm ${id}`);
  }
  const farm = res.data;

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between gap-4">
        <div>
          <Link href="/admin/farms" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
          <h1 className="mt-1 text-2xl font-semibold">{farm.name}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">{farm.governorate}{farm.areaName ? ` · ${farm.areaName}` : ''}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      <dl className="mb-8 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-[var(--admin-text-muted)]">{t('status')}</dt><dd><StatusBadge status={farm.farmStatus} /></dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('type')}</dt><dd>{farm.farmType}</dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('feddan')}</dt><dd>{farm.areaFeddan}</dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('activity')}</dt><dd>{farm.mainActivity ?? '—'}</dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('facilities')}</dt><dd>{farm.facilityCount}</dd></div>
        <div><dt className="text-[var(--admin-text-muted)]">{t('created')}</dt><dd>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(farm.createdAt))}</dd></div>
      </dl>

      <h2 className="mb-2 text-sm font-semibold">{t('relationships')}</h2>
      <DataTable className="mb-8">
        <thead>
          <tr>
            <Th>{t('col.role')}</Th>
            <Th>{t('col.user')}</Th>
          </tr>
        </thead>
        <tbody>
          {farm.relationships.length === 0 ? (
            <tr><Td colSpan={2}>{t('none')}</Td></tr>
          ) : (
            farm.relationships.map((r, i) => (
              <tr key={`${r.userId}-${r.relationshipRole}-${i}`}>
                <Td>{r.relationshipRole}</Td>
                <Td>{r.fullName ?? r.userId}</Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      <h2 className="mb-2 text-sm font-semibold">{t('recentRequests')}</h2>
      <DataTable>
        <thead>
          <tr>
            <Th>{t('col.request')}</Th>
            <Th>{t('col.type')}</Th>
            <Th>{t('col.status')}</Th>
            <Th>{t('col.created')}</Th>
          </tr>
        </thead>
        <tbody>
          {farm.recentRequests.length === 0 ? (
            <tr><Td colSpan={4}>{t('none')}</Td></tr>
          ) : (
            farm.recentRequests.map((req) => (
              <tr key={req.id}>
                <Td>
                  <Link href={`/admin/requests/${req.id}`} className="text-[var(--admin-brand-primary)] hover:underline">
                    {req.id}
                  </Link>
                </Td>
                <Td>{req.requestType}</Td>
                <Td><StatusBadge status={req.status} /></Td>
                <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(req.createdAt))}</Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </PageContainer>
  );
}

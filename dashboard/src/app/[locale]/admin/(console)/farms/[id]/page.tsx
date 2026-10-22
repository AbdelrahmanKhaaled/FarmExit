import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { PrivateFarmLocationPanel, type PrivateFarmLocation } from '@/features/admin/farms/PrivateFarmLocationPanel';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { StaffPermission, staffHasPermission } from '@/lib/admin/staff-permissions';
import type { AdminFarmDetail } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function FarmDetailPage({ params }: PageProps<'/[locale]/admin/farms/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'farmDetail');
  const t = await getTranslations('admin.farmDetail');
  const loc = await getLocale();

  const res = await apiFetchAdminResult<AdminFarmDetail>(`/staff/admin/farms/${id}`, session.accessToken);
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error(res.message ?? `Farm ${id}`);
  }
  const farm = res.data;
  const canReadPrivateLocation = staffHasPermission(session.staff, StaffPermission.PrivateLocationRead);
  let privateLocation: PrivateFarmLocation | null = null;
  let privateLocationDenied = false;
  if (canReadPrivateLocation) {
    const locRes = await apiFetchAdminResult<PrivateFarmLocation>(`/farms/${id}/private-location`, session.accessToken);
    if (locRes.ok) privateLocation = locRes.data;
    else if (locRes.status === 403 || locRes.status === 404) privateLocationDenied = true;
  }

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/farms"
        backLabel={t('back')}
        title={farm.name}
        subtitle={`${farm.governorate}${farm.areaName ? ` · ${farm.areaName}` : ''}`}
        status={farm.farmStatus}
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <>
      <div className="admin-detail-panel mb-6">
      <dl className="admin-detail-dl sm:grid-cols-2 lg:grid-cols-3">
        <div><dt>{t('type')}</dt><dd>{farm.farmType}</dd></div>
        <div><dt>{t('feddan')}</dt><dd className="tabular-nums">{farm.areaFeddan}</dd></div>
        <div><dt>{t('activity')}</dt><dd>{farm.mainActivity ?? '—'}</dd></div>
        <div><dt>{t('facilities')}</dt><dd className="tabular-nums">{farm.facilityCount}</dd></div>
        <div><dt>{t('created')}</dt><dd>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(farm.createdAt))}</dd></div>
      </dl>
      </div>

      <div className="admin-detail-panel mb-6">
      <h2 className="mb-3 text-sm font-semibold">{t('relationships')}</h2>
      <DataTable embedded>
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
      </div>

      <div className="admin-detail-panel">
      <h2 className="mb-3 text-sm font-semibold">{t('recentRequests')}</h2>
      <DataTable embedded>
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
                <Td><EnumLabel value={req.requestType} group="requestType" /></Td>
                <Td><StatusBadge status={req.status} /></Td>
                <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(req.createdAt))}</Td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      </div>
          </>
        }
        aside={
          <>
            <Link href={`/admin/evaluations/new?farmId=${farm.id}`} className="admin-btn-secondary w-full text-center">
              {t('createEvaluation')}
            </Link>
            <div className="admin-detail-panel">
              <h2 className="mb-3 text-sm font-semibold">{t('privateLocation')}</h2>
              <PrivateFarmLocationPanel
                location={privateLocation}
                denied={!canReadPrivateLocation || privateLocationDenied}
                readOnly
              />
            </div>
          </>
        }
      />
    </PageContainer>
  );
}

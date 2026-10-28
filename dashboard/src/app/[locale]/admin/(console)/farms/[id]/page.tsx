import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/components/ui';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { DetailWorkspace } from '@/components/ui/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/components/ui/workspace/DataTable';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { PrivateFarmLocationPanel, type PrivateFarmLocation } from '@/features/admin/farms/PrivateFarmLocationPanel';
import { FarmRowActions } from '@/features/admin/farms/FarmRowActions';
import { ActionIcon } from '@/features/admin/workspace/ActionIcon';
import type { EditableFarm } from '@/features/admin/farms/FarmWizard';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { StaffPermission, staffHasPermission } from '@/lib/admin/staff-permissions';
import type { AdminFarmDetail } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';
async function Content({ params }: PageProps<'/[locale]/admin/farms/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'farmDetail'),
    t = await getTranslations('admin.farmDetail'),
    b = await getTranslations('batch');
  const [res, basic] = await Promise.all([
    apiFetchAdminResult<AdminFarmDetail>('/staff/admin/farms/' + id, session.accessToken),
    apiFetchAdminResult<EditableFarm>('/farms/' + id, session.accessToken),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error('Farm unavailable');
  }
  const farm = res.data,
    details = basic.ok ? basic.data : null;
  const canManage = session.staff.roles.includes('superAdmin'),
    canRead = staffHasPermission(session.staff, StaffPermission.PrivateLocationRead);
  const location = canRead
    ? await apiFetchAdminResult<PrivateFarmLocation>('/farms/' + id + '/private-location', session.accessToken)
    : null;
  const date = (value: string) =>
    value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : '—';
  const published = farm.publishedListings;
  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/farms"
        backLabel={t('back')}
        title={farm.name}
        subtitle={farm.governorate + (farm.areaName ? ' · ' + farm.areaName : '')}
        status={farm.farmStatus}
        refreshLabel={t('refresh')}
      />
      <div className="operation-actions mb-5">
        {canManage && (
          <Link href={'/admin/farms/' + id + '/edit'} className="admin-btn-primary">
            <ActionIcon name="edit" />
            {b('editFarm')}
          </Link>
        )}
        <FarmRowActions id={id} canManage={canManage} />
      </div>
      <dl className="operation-kpis">
        {[
          [b('area'), farm.areaFeddan],
          [b('farmType'), b.has(farm.farmType) ? b(farm.farmType) : farm.farmType],
          [b('activity'), farm.mainActivity ?? '—'],
          [b('facilities'), farm.facilityCount],
        ].map(([label, value]) => (
          <div className="operation-stat" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <DetailWorkspace
        main={
          <>
            <section className="operation-card">
              <header>
                <ActionIcon name="view" />
                <h2>{b('basics')}</h2>
              </header>
              <p className="text-sm leading-7">{details?.description ?? b('notStated')}</p>
              <dl className="admin-detail-dl mt-5 sm:grid-cols-2">
                <div>
                  <dt>{b('createdAt')}</dt>
                  <dd>{date(farm.createdAt)}</dd>
                </div>
                <div>
                  <dt>{b('governorate')}</dt>
                  <dd>{farm.governorate}</dd>
                </div>
                <div>
                  <dt>{b('areaName')}</dt>
                  <dd>{farm.areaName ?? '—'}</dd>
                </div>
              </dl>
            </section>
            <section className="operation-card">
              <header>
                <ActionIcon name="chart" />
                <h2>{b('agriculture')}</h2>
              </header>
              <dl className="admin-detail-dl sm:grid-cols-2">
                {[
                  ['water', details?.waterSource],
                  ['irrigation', details?.irrigationMethod],
                  ['energy', details?.energySource],
                  ['soil', details?.soilType],
                ].map(([key, value]) => (
                  <div key={key}>
                    <dt>{b(key!)}</dt>
                    <dd>{value ? (b.has(value) ? b(value) : value) : b('notStated')}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="operation-card">
              <header>
                <ActionIcon name="view" />
                <h2>{t('relationships')}</h2>
              </header>
              <DataTable embedded>
                <thead>
                  <tr>
                    <Th>{t('col.role')}</Th>
                    <Th>{t('col.user')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {farm.relationships.map((r, i) => (
                    <tr key={i}>
                      <Td>{b.has(r.relationshipRole) ? b(r.relationshipRole) : r.relationshipRole}</Td>
                      <Td>{r.fullName ?? r.userId}</Td>
                    </tr>
                  ))}
                  {!farm.relationships.length && (
                    <tr>
                      <Td colSpan={2}>{t('none')}</Td>
                    </tr>
                  )}
                </tbody>
              </DataTable>
            </section>
            <section className="operation-card">
              <header>
                <ActionIcon name="chart" />
                <h2>{t('recentRequests')}</h2>
              </header>
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
                  {farm.recentRequests.map((r) => (
                    <tr key={r.id}>
                      <Td>
                        <Link
                          href={'/admin/requests/' + r.id}
                          className="text-[var(--admin-brand-primary)] hover:underline"
                        >
                          {r.id}
                        </Link>
                      </Td>
                      <Td>
                        <EnumLabel group="requestType" value={r.requestType} />
                      </Td>
                      <Td>
                        <StatusBadge status={r.status} />
                      </Td>
                      <Td>{date(r.createdAt)}</Td>
                    </tr>
                  ))}
                  {!farm.recentRequests.length && (
                    <tr>
                      <Td colSpan={4}>{t('none')}</Td>
                    </tr>
                  )}
                </tbody>
              </DataTable>
            </section>
          </>
        }
        aside={
          <>
            {staffHasPermission(session.staff, StaffPermission.EvaluationsManage) && (
              <Link
                href={'/admin/evaluations/new?farmId=' + id}
                className="admin-btn-primary inline-flex w-full items-center justify-center gap-2"
              >
                <ActionIcon name="plus" />
                {t('createEvaluation')}
              </Link>
            )}
            <section className="operation-card">
              <header>
                <h2>{b('publication')}</h2>
              </header>
              {published.length ? (
                published.map((r) => (
                  <Link
                    key={r.id}
                    className="block text-sm text-[var(--admin-brand-primary)]"
                    href={'/admin/listings/' + r.id}
                  >
                    {r.id} · <StatusBadge status="published" />
                  </Link>
                ))
              ) : (
                <p className="workflow-help">{b('noPublished')}</p>
              )}
              <p className="workflow-help mt-3">{b('registryNote')}</p>
            </section>
            <section className="operation-card">
              <header>
                <h2>{b('facilities')}</h2>
              </header>
              <strong className="text-2xl">{farm.facilityCount}</strong>
              <p className="workflow-help mt-2">{b('attachmentsRestricted')}</p>
            </section>
            <section className="operation-card">
              <header>
                <h2>{b('media')}</h2>
              </header>
              <p className="workflow-help">{b('privateMedia')}</p>
            </section>
            {canRead && (
              <PrivateFarmLocationPanel
                readOnly
                location={location?.ok ? location.data : null}
                denied={location !== null && !location.ok}
              />
            )}
          </>
        }
      />
    </PageContainer>
  );
}
export default function Page(props: Parameters<typeof Content>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Content {...props} />
    </Suspense>
  );
}

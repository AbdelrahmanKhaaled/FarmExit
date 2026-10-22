import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { RequestActions } from '@/features/admin/requests/RequestActions';
import { RequestDocumentsPanel } from '@/features/admin/requests/RequestDocumentsPanel';
import { RequestForwardingPanel, type RequestForwardingRow } from '@/features/admin/requests/RequestForwardingPanel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { specializedAdminPath } from '@/lib/admin/specialized-request-path';
import { SPECIALIZED_REQUEST_TYPES, type StaffRequestDetail } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function RequestDetailPage({ params }: PageProps<'/[locale]/admin/requests/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'requestDetail');
  const t = await getTranslations('admin.requestDetail');
  const loc = await getLocale();

  const res = await apiFetchAdminResult<StaffRequestDetail>(`/staff/requests/${id}`, session.accessToken);
  if (!res.ok) {
    if (res.status === 403) notFound();
    if (res.status === 404) notFound();
    throw new Error(res.message ?? `Request ${id}`);
  }
  const request = res.data;
  const specialized = SPECIALIZED_REQUEST_TYPES.has(request.requestType);
  const canReview = session.staff.permissions.includes('requests.review');
  const canForward = session.staff.permissions.includes('requests.forward');
  const canRecordDecision = canForward;
  const forwardings = (request.forwardings as RequestForwardingRow[]) ?? [];
  const staff = await loadStaffOptionSets(session.accessToken);
  const modulePath = specializedAdminPath(request.requestType, request.id);

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between gap-4">
        <div>
          <Link href="/admin/requests" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
          <h1 className="mt-1 text-2xl font-semibold">{request.requestNumber}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">{request.requestType}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      {modulePath ? (
        <p className="mb-4 text-sm">
          <Link href={modulePath} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
            {t('openSpecializedModule')}
          </Link>
        </p>
      ) : null}
      <p className="mb-4 text-sm">
        <Link href={`/admin/communications?requestId=${request.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
          {t('openCommunications')}
        </Link>
      </p>

      <DetailWorkspace
        main={
        <div className="space-y-6 text-sm">
          <div className="flex flex-wrap gap-4">
            <div><span className="text-[var(--admin-text-muted)]">{t('status')}: </span><StatusBadge status={request.status} /></div>
            <div><span className="text-[var(--admin-text-muted)]">{t('visibility')}: </span>{request.visibility}</div>
            {request.farm ? (
              <div>
                <span className="text-[var(--admin-text-muted)]">{t('farm')}: </span>
                <Link href={`/admin/farms/${request.farm.id}`} className="text-[var(--admin-brand-primary)] hover:underline">{request.farm.name}</Link>
              </div>
            ) : null}
          </div>

          <h2 className="text-sm font-semibold">{t('assignments')}</h2>
          <DataTable>
            <thead><tr><Th>{t('col.role')}</Th><Th>{t('col.staff')}</Th><Th>{t('col.assigned')}</Th></tr></thead>
            <tbody>
              {request.assignments.length === 0 ? (
                <tr><Td colSpan={3}>{t('none')}</Td></tr>
              ) : (
                request.assignments.map((a) => (
                  <tr key={a.id}>
                    <Td>{a.assignmentType}</Td>
                    <Td>{a.staffName ?? a.assignedStaffId}</Td>
                    <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(a.assignedAt))}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>

          <h2 className="text-sm font-semibold">{t('statusHistory')}</h2>
          <DataTable>
            <thead><tr><Th>{t('col.from')}</Th><Th>{t('col.to')}</Th><Th>{t('col.when')}</Th><Th>{t('col.by')}</Th></tr></thead>
            <tbody>
              {request.statusHistory.map((h) => (
                <tr key={h.id}>
                  <Td>{h.fromStatus ?? '—'}</Td>
                  <Td><StatusBadge status={h.toStatus} /></Td>
                  <Td>{h.createdAt ? new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(h.createdAt)) : '—'}</Td>
                  <Td>{h.changerName ?? h.changedBy}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <h2 className="text-sm font-semibold">{t('reviews')}</h2>
          <DataTable>
            <thead><tr><Th>{t('col.decision')}</Th><Th>{t('col.reviewer')}</Th><Th>{t('col.comment')}</Th></tr></thead>
            <tbody>
              {request.reviews.length === 0 ? (
                <tr><Td colSpan={3}>{t('none')}</Td></tr>
              ) : (
                request.reviews.map((r) => (
                  <tr key={r.id}>
                    <Td><StatusBadge status={r.decision} /></Td>
                    <Td>{r.reviewerName ?? r.reviewerId}</Td>
                    <Td>{r.comment ?? '—'}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>

          <RequestDocumentsPanel requestId={request.id} documents={request.documents} />
          <RequestForwardingPanel
            requestId={request.id}
            forwardings={forwardings}
            canForward={canForward}
            canRecordDecision={canRecordDecision}
          />
        </div>
        }
        aside={
        <RequestActions
          requestId={request.id}
          requestType={request.requestType}
          status={request.status}
          specialized={specialized}
          canReview={canReview}
          isAdmin={session.isAdmin}
          reviewerOptions={staff.reviewerOptions}
          caseAgentOptions={staff.caseAgentOptions}
        />
        }
      />
    </PageContainer>
  );
}

import { getTranslations } from 'next-intl/server';
import { PageContainer } from '@/components/ui';
import { DetailWorkspace } from '@/components/ui/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/components/ui/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { RequestActions } from './RequestActions';
import { RequestDocumentsPanel } from './RequestDocumentsPanel';
import { RequestForwardingPanel, type RequestForwardingRow } from './RequestForwardingPanel';
import { LinkedApplicationsPanel } from './LinkedApplicationsPanel';
import { PartnershipApplicationReview } from './PartnershipApplicationReview';
import { applicationQuery, type ApplicationFilters, type LinkedApplications } from './linked-applications';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { ActionIcon } from '@/features/admin/workspace/ActionIcon';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult, type AdminSession } from '@/lib/admin/session.server';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { specializedAdminPath } from '@/lib/admin/specialized-request-path';
import { SPECIALIZED_REQUEST_TYPES, type StaffRequestDetail } from '@/lib/api/types/staff';

type ApplicationAnswers = {
  applicationMessage: string | null;
  whyGoodFit: string | null;
  relevantExperience: string | null;
  approach: string | null;
  companyName: string | null;
  companySector: string | null;
  applicantKind: string | null;
};
type CommunicationList = { total: number; items: { id: string; status: string; createdAt: string | null }[] };

export async function RequestWorkspace({
  request,
  session,
  locale,
  filters,
}: {
  request: StaffRequestDetail;
  session: AdminSession;
  locale: string;
  filters: ApplicationFilters;
}) {
  const t = await getTranslations('admin.requestWorkspace');
  const detail = await getTranslations('admin.requestDetail');
  const common = await getTranslations('batch');
  const enums = await getTranslations('admin.enums');
  const canReview = session.staff.permissions.includes('requests.review');
  const canForward = session.staff.permissions.includes('requests.forward');
  const canCommunicate = session.staff.permissions.includes('communication.relay');
  const receivesApplications = request.requestType === 'partnership';
  const isApplication = request.requestType === 'partnershipApplication';
  const [staff, cases, applications, answers] = await Promise.all([
    session.isAdmin
      ? loadStaffOptionSets(session.accessToken)
      : Promise.resolve({ reviewerOptions: [], caseAgentOptions: [] }),
    canCommunicate
      ? apiFetchAdminResult<CommunicationList>(
          `/staff/communication/cases?requestId=${request.id}&page=1&pageSize=5`,
          session.accessToken,
        )
      : null,
    receivesApplications
      ? apiFetchAdminResult<LinkedApplications>(
          `/staff/requests/${request.id}/applications?${applicationQuery(filters)}`,
          session.accessToken,
        )
      : null,
    isApplication
      ? apiFetchAdminResult<ApplicationAnswers>(`/staff/partnership-applications/${request.id}`, session.accessToken)
      : null,
  ]);
  const modulePath = specializedAdminPath(request.requestType, request.id);
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(
      new Date(value),
    );
  const publicationApplies = ['farmListing', 'partnership', 'farmManagement'].includes(request.requestType);
  const published = request.status === 'published' && request.visibility === 'public' && Boolean(request.publishedAt);
  const navigation = [
    { id: 'overview', label: t('overview') },
    ...(receivesApplications ? [{ id: 'applications', label: t('applications') }] : []),
    { id: 'history', label: t('history') },
    ...(canCommunicate ? [{ id: 'communications', label: t('communications') }] : []),
    { id: 'documents', label: t('documents') },
  ];
  return (
    <PageContainer>
      <div className="request-workspace">
        <nav aria-label={t('breadcrumbs')} className="request-breadcrumbs">
          <Link href="/admin/requests">{t('requests')}</Link>
          <span aria-hidden="true">/</span>
          {isApplication && request.parentRequestId ? (
            <>
              <Link href={`/admin/requests/${request.parentRequestId}#applications`}>{t('parentOpportunity')}</Link>
              <span aria-hidden="true">/</span>
            </>
          ) : null}
          <span aria-current="page">{request.requestNumber}</span>
        </nav>
        <header className="request-hero">
          <div className="request-hero-main">
            <div className="request-hero-icon">
              <ActionIcon name="view" />
            </div>
            <div className="min-w-0">
              <p className="request-eyebrow">{t('workspace')}</p>
              <h1>{request.requestNumber}</h1>
              <div className="request-hero-meta">
                <EnumLabel group="requestType" value={request.requestType} />
                <span aria-hidden="true">·</span>
                <StatusBadge status={request.status} />
              </div>
            </div>
          </div>
          <div className="request-hero-actions">
            {modulePath ? (
              <Link href={modulePath} className="admin-btn-secondary">
                {detail('openSpecializedModule')}
                <ActionIcon name="next" />
              </Link>
            ) : null}
            <RefreshButton label={detail('refresh')} />
          </div>
          <div className="request-hero-facts">
            <div>
              <span>{t('relatedFarm')}</span>
              {request.farm ? (
                <Link href={`/admin/farms/${request.farm.id}`}>{request.farm.name}</Link>
              ) : (
                <strong>{t('notStated')}</strong>
              )}
            </div>
            <div>
              <span>{t('created')}</span>
              <time dateTime={request.createdAt}>{date(request.createdAt)}</time>
            </div>
            <div>
              <span>{t('submitted')}</span>
              {request.submittedAt ? (
                <time dateTime={request.submittedAt}>{date(request.submittedAt)}</time>
              ) : (
                <strong>{t('notSubmitted')}</strong>
              )}
            </div>
            {publicationApplies ? (
              <div>
                <span>{t('publication')}</span>
                <strong>{t(published ? 'published' : 'notPublished')}</strong>
              </div>
            ) : null}
          </div>
        </header>
        <nav className="request-section-nav" aria-label={t('sections')}>
          {navigation.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.label}
              {section.id === 'applications' && applications?.ok ? (
                <span>{new Intl.NumberFormat(locale).format(applications.data.summary.total)}</span>
              ) : null}
            </a>
          ))}
        </nav>
        <DetailWorkspace
          main={
            <>
              <section
                id="overview"
                className="operation-card request-section"
                aria-labelledby="request-overview-title"
              >
                <header>
                  <h2 id="request-overview-title">{t('overview')}</h2>
                </header>
                <dl className="request-overview-facts">
                  <div>
                    <dt>{t('requester')}</dt>
                    <dd>{request.creator.fullName ?? t('unnamedApplicant')}</dd>
                  </div>
                  <div>
                    <dt>{t('type')}</dt>
                    <dd>
                      <EnumLabel group="requestType" value={request.requestType} />
                    </dd>
                  </div>
                  <div>
                    <dt>{detail('visibility')}</dt>
                    <dd>{t(request.visibility === 'public' ? 'publicVisibility' : 'privateVisibility')}</dd>
                  </div>
                  {request.parentRequestId ? (
                    <div>
                      <dt>{t('parentOpportunity')}</dt>
                      <dd>
                        <Link
                          href={`/admin/requests/${request.parentRequestId}#applications`}
                          className="request-text-link"
                        >
                          {t('openParent')}
                        </Link>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {isApplication && answers?.ok ? (
                  <div className="request-answers">
                    <h3>{t('submittedAnswers')}</h3>
                    <div className="request-answer-grid">
                      {(
                        [
                          'applicationMessage',
                          'whyGoodFit',
                          'relevantExperience',
                          'approach',
                          'companyName',
                          'companySector',
                        ] as const
                      ).map((key) => (
                        <div key={key}>
                          <h4>{t(key)}</h4>
                          <p>{answers.data[key] || t('notStated')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {isApplication && answers && !answers.ok ? (
                  <p className="workflow-help mt-4">{t('answersRestricted')}</p>
                ) : null}
              </section>
              {applications ? (
                <LinkedApplicationsPanel
                  requestId={request.id}
                  result={applications}
                  filters={filters}
                  locale={locale}
                />
              ) : null}
              <section id="history" className="operation-card request-section" aria-labelledby="request-history-title">
                <header>
                  <h2 id="request-history-title">{t('history')}</h2>
                </header>
                {request.statusHistory.length ? (
                  <ol className="workflow-timeline">
                    {request.statusHistory.map((event) => (
                      <li key={event.id}>
                        <StatusBadge status={event.toStatus} />
                        {event.createdAt ? <time dateTime={event.createdAt}>{date(event.createdAt)}</time> : null}
                        <p>
                          {event.changerName ?? event.changedBy}
                          {event.reason ? ` · ${event.reason}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="workflow-help">{t('noHistory')}</p>
                )}
                <h3 className="request-subheading">{detail('reviews')}</h3>
                <DataTable>
                  <thead>
                    <tr>
                      <Th>{detail('col.decision')}</Th>
                      <Th>{detail('col.reviewer')}</Th>
                      <Th>{detail('col.comment')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.reviews.length ? (
                      request.reviews.map((review) => (
                        <tr key={review.id}>
                          <Td>
                            <StatusBadge status={review.decision} />
                          </Td>
                          <Td>{review.reviewerName ?? review.reviewerId}</Td>
                          <Td>{review.comment ?? '—'}</Td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <Td colSpan={3}>{detail('none')}</Td>
                      </tr>
                    )}
                  </tbody>
                </DataTable>
              </section>
              {canCommunicate ? (
                <section
                  id="communications"
                  className="operation-card request-section"
                  aria-labelledby="request-communications-title"
                >
                  <header>
                    <h2 id="request-communications-title">{t('communications')}</h2>
                  </header>
                  {cases?.ok ? (
                    cases.data.total ? (
                      <div className="request-case-list">
                        {cases.data.items.map((item) => (
                          <Link key={item.id} href={`/admin/communications/${item.id}`}>
                            <span>{t('caseReference', { id: item.id })}</span>
                            <StatusBadge status={item.status} group="caseStatus" />
                            <ActionIcon name="next" />
                          </Link>
                        ))}
                        <Link className="request-text-link" href={`/admin/communications?requestId=${request.id}`}>
                          {common('viewCases', { count: cases.data.total })}
                        </Link>
                      </div>
                    ) : (
                      <div className="request-empty">
                        <h3>{common('noCases')}</h3>
                        <p>{common('casePrerequisites')}</p>
                      </div>
                    )
                  ) : (
                    <p className="workflow-help">{common('casesUnavailable')}</p>
                  )}
                </section>
              ) : null}
              <section
                id="documents"
                className="operation-card request-section"
                aria-labelledby="request-documents-title"
              >
                <header>
                  <h2 id="request-documents-title">{t('documents')}</h2>
                </header>
                {request.documents.length ? (
                  <RequestDocumentsPanel requestId={request.id} documents={request.documents} canReview={canReview} />
                ) : (
                  <p className="workflow-help">{t('noDocuments')}</p>
                )}
              </section>
            </>
          }
          aside={
            <>
              <section className="operation-card request-assignment-panel">
                <header>
                  <h2>{detail('assignments')}</h2>
                </header>
                {(['reviewer', 'caseAgent'] as const).map((role) => {
                  const slot = request.assignments.find((assignment) => assignment.assignmentType === role);
                  return (
                    <div key={role} className="request-staff-slot">
                      <span className="request-staff-avatar" aria-hidden="true">
                        {slot?.staffName?.slice(0, 1) || '—'}
                      </span>
                      <div>
                        <p>{enums(`adminRole.${role}`)}</p>
                        <strong>{slot?.staffName ?? slot?.assignedStaffId ?? t('unassigned')}</strong>
                        {slot ? <time dateTime={slot.assignedAt}>{date(slot.assignedAt)}</time> : null}
                      </div>
                    </div>
                  );
                })}
              </section>
              <RequestActions
                requestId={request.id}
                requestType={request.requestType}
                status={request.status}
                specialized={SPECIALIZED_REQUEST_TYPES.has(request.requestType)}
                showSpecializedHint={!isApplication || !answers?.ok}
                canReview={canReview}
                isAdmin={session.isAdmin}
                reviewerOptions={staff.reviewerOptions}
                caseAgentOptions={staff.caseAgentOptions}
              />
              {isApplication &&
              answers?.ok &&
              canReview &&
              (session.isAdmin || session.staff.roles.includes('caseAgent')) ? (
                <PartnershipApplicationReview
                  requestId={request.id}
                  parentId={request.parentRequestId}
                  status={request.status}
                />
              ) : null}
              <section className="operation-card">
                <RequestForwardingPanel
                  requestId={request.id}
                  forwardings={(request.forwardings as RequestForwardingRow[]) ?? []}
                  canForward={
                    canForward &&
                    Boolean(request.farm) &&
                    !['draft', 'rejected', 'declined', 'withdrawn', 'closed', 'published'].includes(request.status)
                  }
                  canRecordDecision={canForward}
                />
              </section>
            </>
          }
        />
      </div>
    </PageContainer>
  );
}

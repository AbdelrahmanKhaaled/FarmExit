import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import { decideFarmManagementAction } from '@/features/admin/actions/workflows';
import { OpportunityPublishPanel } from '@/features/admin/workflows/OpportunityPublishPanel';
import { SpecializedWorkflowPanel } from '@/features/admin/workflows/SpecializedWorkflowPanel';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { AdminDetailSection } from '@/features/admin/workspace/AdminDetailSection';
import { UnifiedRequestLink } from '@/features/admin/workspace/UnifiedRequestLink';
import { WorkflowReviewsTable } from '@/features/admin/workspace/WorkflowReviewsTable';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type Item = {
  id: string;
  requestNumber: string;
  farmId: string;
  farmName: string;
  professionalNeed: string;
  status: string;
  visibility: string;
  publishedAt: string | null;
  submittedAt: string | null;
  managementTypes: string[] | null;
  currentSituation: string | null;
  goals: string[] | null;
  reviews: { decision: string; comment: string | null }[];
};

export default async function FarmManagementDetailPage({ params }: PageProps<'/[locale]/admin/farm-management/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'farmManagementDetail');
  const t = await getTranslations('admin.farmManagementDetail');
  const tc = await getTranslations('admin.workflowCommon');
  const res = await apiFetchAdminResult<Item>(`/staff/farm-management-requests/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const item = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/farm-management"
        backLabel={t('back')}
        title={item.requestNumber}
        status={item.status}
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <div className="space-y-6">
            <AdminDetailSection title={tc('summary')}>
              <p className="mb-4 text-xs leading-relaxed text-[var(--admin-text-muted)]">{t('noAutoManager')}</p>
              <dl className="admin-detail-dl sm:grid-cols-2">
                <div>
                  <dt>{t('need')}</dt>
                  <dd>{item.professionalNeed}</dd>
                </div>
                <div>
                  <dt>{t('farm')}</dt>
                  <dd>
                    <Link href={`/admin/farms/${item.farmId}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {item.farmName}
                    </Link>
                  </dd>
                </div>
              </dl>
              {item.managementTypes && item.managementTypes.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">{t('managementTypes')}</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {item.managementTypes.map((type) => (
                      <li key={type}>{type}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {item.goals && item.goals.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">{t('goals')}</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {item.goals.map((goal) => (
                      <li key={goal}>{goal}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {item.currentSituation ? (
                <div className="mt-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">{t('situation')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{item.currentSituation}</p>
                </div>
              ) : null}
              <p className="mt-4">
                <UnifiedRequestLink requestId={item.id} label={t('unifiedRequest')} />
              </p>
            </AdminDetailSection>
            <AdminDetailSection title={tc('reviewHistory')}>
              <WorkflowReviewsTable
                reviews={item.reviews}
                decisionLabel={t('col.decision')}
                commentLabel={t('col.comment')}
                emptyLabel={tc('noReviews')}
              />
            </AdminDetailSection>
          </div>
        }
        aside={
          <div className="space-y-6">
            <SpecializedWorkflowPanel
              requestId={item.id}
              status={item.status}
              reviewerOptions={staff.reviewerOptions}
              caseAgentOptions={staff.caseAgentOptions}
              onDecide={decideFarmManagementAction}
            />
            <OpportunityPublishPanel
              requestId={item.id}
              status={item.status}
              visibility={item.visibility}
              publishedAt={item.publishedAt}
              submittedAt={item.submittedAt}
              kind="management"
            />
          </div>
        }
      />
    </PageContainer>
  );
}

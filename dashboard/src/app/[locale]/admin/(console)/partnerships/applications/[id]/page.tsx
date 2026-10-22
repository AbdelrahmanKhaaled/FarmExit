import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import { decidePartnershipApplicationAction } from '@/features/admin/actions/workflows';
import { SpecializedWorkflowPanel } from '@/features/admin/workflows/SpecializedWorkflowPanel';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { AdminDetailSection } from '@/features/admin/workspace/AdminDetailSection';
import { EntityLink } from '@/features/admin/workspace/EntityLink';
import { UnifiedRequestLink } from '@/features/admin/workspace/UnifiedRequestLink';
import { WorkflowReviewsTable } from '@/features/admin/workspace/WorkflowReviewsTable';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type Item = {
  id: string;
  requestNumber: string;
  status: string;
  parentPartnershipRequestId: string;
  applicantKind: string | null;
  applicationMessage: string | null;
  whyGoodFit: string | null;
  companyName: string | null;
  reviews: { decision: string; comment: string | null }[];
};

export default async function PartnershipApplicationDetailPage({
  params,
}: PageProps<'/[locale]/admin/partnerships/applications/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'partnershipApplicationDetail');
  const t = await getTranslations('admin.partnershipApplicationDetail');
  const tc = await getTranslations('admin.workflowCommon');
  const res = await apiFetchAdminResult<Item>(`/staff/partnership-applications/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const item = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/partnerships?tab=applications"
        backLabel={t('back')}
        title={item.requestNumber}
        status={item.status}
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <div className="space-y-6">
            <AdminDetailSection title={tc('summary')}>
              <dl className="admin-detail-dl sm:grid-cols-2">
                <div>
                  <dt>{t('parent')}</dt>
                  <dd>
                    <EntityLink href={`/admin/partnerships/${item.parentPartnershipRequestId}`} label={item.parentPartnershipRequestId} />
                  </dd>
                </div>
                {item.applicantKind ? (
                  <div>
                    <dt>{t('kind')}</dt>
                    <dd>{item.applicantKind}</dd>
                  </div>
                ) : null}
                {item.companyName ? (
                  <div>
                    <dt>{t('company')}</dt>
                    <dd>{item.companyName}</dd>
                  </div>
                ) : null}
              </dl>
              {item.applicationMessage ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{item.applicationMessage}</p>
              ) : null}
              {item.whyGoodFit ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--admin-text-secondary)]">{item.whyGoodFit}</p>
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
          <SpecializedWorkflowPanel
            requestId={item.id}
            status={item.status}
            reviewerOptions={staff.reviewerOptions}
            caseAgentOptions={staff.caseAgentOptions}
            onDecide={decidePartnershipApplicationAction}
            nonBindingNote={t('nonBinding')}
          />
        }
      />
    </PageContainer>
  );
}

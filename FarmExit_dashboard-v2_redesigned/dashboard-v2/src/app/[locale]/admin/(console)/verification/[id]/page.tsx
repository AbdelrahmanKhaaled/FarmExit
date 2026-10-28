import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/components/ui';
import { DetailWorkspace } from '@/components/ui/workspace/DetailWorkspace';
import { decideProfessionalVerificationAction } from '@/features/admin/actions/workflows';
import { SpecializedWorkflowPanel } from '@/features/admin/workflows/SpecializedWorkflowPanel';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { AdminDetailSection } from '@/features/admin/workspace/AdminDetailSection';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
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
  professionalType: string;
  professionalCapabilityId: string;
  verificationSummary: string | null;
  reviews: { decision: string; comment: string | null }[];
};

export default async function VerificationDetailPage({ params }: PageProps<'/[locale]/admin/verification/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'verificationDetail');
  const t = await getTranslations('admin.verificationDetail');
  const tc = await getTranslations('admin.workflowCommon');
  const res = await apiFetchAdminResult<Item>(`/staff/professional-verification-requests/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const item = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/verification"
        backLabel={t('back')}
        title={item.requestNumber}
        status={item.status}
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <div className="space-y-6">
            <AdminDetailSection title={tc('summary')}>
              <p className="mb-4 text-xs leading-relaxed text-[var(--admin-text-muted)]">{t('docNotVerified')}</p>
              <dl className="admin-detail-dl sm:grid-cols-2">
                <div>
                  <dt>{t('type')}</dt>
                  <dd><EnumLabel value={item.professionalType} group="professionalType" /></dd>
                </div>
                <div>
                  <dt>{t('capability')}</dt>
                  <dd className="font-mono text-xs break-all" title={item.professionalCapabilityId}>{item.professionalCapabilityId}</dd>
                </div>
              </dl>
              {item.verificationSummary ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{item.verificationSummary}</p>
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
            onDecide={decideProfessionalVerificationAction}
          />
        }
      />
    </PageContainer>
  );
}

import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/components/ui';
import { DetailWorkspace } from '@/components/ui/workspace/DetailWorkspace';
import { decideFarmDetailsAction } from '@/features/admin/actions/workflows';
import { EmbeddedRequestForwardingSection } from '@/features/admin/requests/EmbeddedRequestForwardingSection';
import { SpecializedWorkflowPanel } from '@/features/admin/workflows/SpecializedWorkflowPanel';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { AdminDetailSection } from '@/features/admin/workspace/AdminDetailSection';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { UnifiedRequestLink } from '@/features/admin/workspace/UnifiedRequestLink';
import { WorkflowReviewsTable } from '@/features/admin/workspace/WorkflowReviewsTable';
import { Link } from '@/i18n/navigation';
import { StaffPermission, staffHasPermission } from '@/lib/admin/staff-permissions';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type Item = {
  id: string;
  requestNumber: string;
  status: string;
  farmId: string;
  message: string | null;
  listing: { listingRequestId: string; listingSlug: string; listingType: string };
  reviews: { decision: string; comment: string | null }[];
};

export default async function FarmDetailsDetailPage({ params }: PageProps<'/[locale]/admin/farm-details/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'farmDetailsDetail');
  const t = await getTranslations('admin.farmDetailsDetail');
  const tc = await getTranslations('admin.workflowCommon');
  const res = await apiFetchAdminResult<Item>(`/staff/farm-details-requests/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const item = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);
  const canForward = staffHasPermission(session.staff, StaffPermission.RequestsForward);

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/farm-details"
        backLabel={t('back')}
        title={item.requestNumber}
        status={item.status}
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <div className="space-y-6">
            <AdminDetailSection title={tc('summary')}>
              <p className="mb-4 text-xs leading-relaxed text-[var(--admin-text-muted)]">{t('noMessageField')}</p>
              <dl className="admin-detail-dl sm:grid-cols-2">
                <div>
                  <dt>{t('listing')}</dt>
                  <dd>
                    <Link href={`/admin/listings/${item.listing.listingRequestId}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {item.listing.listingSlug}
                    </Link>
                    {' '}
                    (<EnumLabel value={item.listing.listingType} group="listingType" />)
                  </dd>
                </div>
                <div>
                  <dt>{t('farm')}</dt>
                  <dd>
                    <Link href={`/admin/farms/${item.farmId}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {item.farmId}
                    </Link>
                  </dd>
                </div>
              </dl>
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
            <EmbeddedRequestForwardingSection
              requestId={item.id}
              accessToken={session.accessToken}
              canForward={canForward}
              canRecordDecision={canForward}
            />
          </div>
        }
        aside={
          <SpecializedWorkflowPanel
            requestId={item.id}
            status={item.status}
            reviewerOptions={staff.reviewerOptions}
            caseAgentOptions={staff.caseAgentOptions}
            onDecide={decideFarmDetailsAction}
          />
        }
      />
    </PageContainer>
  );
}

import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { decidePartnershipRequestAction } from '@/features/admin/actions/workflows';
import { OpportunityPublishPanel } from '@/features/admin/workflows/OpportunityPublishPanel';
import { SpecializedWorkflowPanel } from '@/features/admin/workflows/SpecializedWorkflowPanel';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { AdminDetailSection } from '@/features/admin/workspace/AdminDetailSection';
import { EntityLink } from '@/features/admin/workspace/EntityLink';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { UnifiedRequestLink } from '@/features/admin/workspace/UnifiedRequestLink';
import { WorkflowReviewsTable } from '@/features/admin/workspace/WorkflowReviewsTable';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdmin, apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type Item = {
  id: string;
  requestNumber: string;
  farmId: string;
  farmName: string;
  status: string;
  visibility: string;
  publishedAt: string | null;
  submittedAt: string | null;
  description: string | null;
  reviews: { decision: string; comment: string | null }[];
};

export default async function PartnershipDetailPage({ params }: PageProps<'/[locale]/admin/partnerships/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'partnershipDetail');
  const t = await getTranslations('admin.partnershipDetail');
  const tc = await getTranslations('admin.workflowCommon');
  const res = await apiFetchAdminResult<Item>(`/staff/partnership-requests/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const item = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);
  const apps = await apiFetchAdmin<{ items: { id: string; status: string }[] }>(
    `/staff/partnership-requests/${id}/applications?page=1&pageSize=20`,
    session.accessToken,
  );

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/partnerships"
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
                  <dt>{t('col.farm')}</dt>
                  <dd>
                    <Link href={`/admin/farms/${item.farmId}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {item.farmName}
                    </Link>
                  </dd>
                </div>
              </dl>
              {item.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{item.description}</p> : null}
              <p className="mt-4">
                <UnifiedRequestLink requestId={item.id} label={t('unifiedRequest')} />
              </p>
            </AdminDetailSection>
            <AdminDetailSection title={t('applications')}>
              {apps.items.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">{t('noApplications')}</p>
              ) : (
                <DataTable embedded>
                  <thead>
                    <tr>
                      <Th>{t('col.id')}</Th>
                      <Th>{t('col.status')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.items.map((a) => (
                      <tr key={a.id}>
                        <Td>
                          <EntityLink href={`/admin/partnerships/applications/${a.id}`} label={a.id} />
                        </Td>
                        <Td><StatusBadge status={a.status} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
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
              onDecide={decidePartnershipRequestAction}
              nonBindingNote={t('nonBinding')}
            />
            <OpportunityPublishPanel
              requestId={item.id}
              status={item.status}
              visibility={item.visibility}
              publishedAt={item.publishedAt}
              submittedAt={item.submittedAt}
              kind="partnership"
            />
          </div>
        }
      />
    </PageContainer>
  );
}

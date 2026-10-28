import { getTranslations } from 'next-intl/server';
import { EmptyState, SectionHeader } from '@/components/ui';
import { Card } from '@/components/ui';
import { OverviewQueue } from './OverviewQueue';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';

export async function OverviewNextActions({
  queue,
  overview,
}: {
  queue: AdminWorkQueue;
  overview: AdminDashboardOverview;
}) {
  const t = await getTranslations('admin.overview');
  const hasQueue =
    queue.unassignedUnderReview > 0 ||
    queue.changesRequested > 0 ||
    queue.pendingDocumentReviews > 0 ||
    queue.activeCommunicationCases > 0 ||
    queue.recentlyUpdatedRequests > 0;

  return (
    <section>
      <SectionHeader title={t('nextActionsTitle')} description={t('nextActionsDesc')} />
      {hasQueue ? (
        <OverviewQueue queue={queue} overview={overview} hideHeader />
      ) : (
        <Card variant="muted" className="p-2">
          <EmptyState title={t('nextActionsEmpty')} description={t('nextActionsEmptyDesc')} />
        </Card>
      )}
    </section>
  );
}

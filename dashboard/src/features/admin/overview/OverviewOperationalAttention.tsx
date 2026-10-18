import { getLocale, getTranslations } from 'next-intl/server';
import { MetricCard, SectionHeader } from '@/design-system';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';
import { formatAdminNumber } from './overview-metrics';
import { OverviewAlerts } from './OverviewAlerts';

const attentionMetrics: (keyof AdminDashboardOverview)[] = [
  'requestsAwaitingReview',
  'requestsAwaitingStaffAssignment',
  'activeCommunicationCases',
  'pendingListingRequests',
];

export async function OverviewOperationalAttention({
  overview,
  queue,
}: {
  overview: AdminDashboardOverview;
  queue: AdminWorkQueue;
}) {
  const t = await getTranslations('admin.overview');
  const locale = await getLocale();

  return (
    <section>
      <SectionHeader title={t('attentionSectionTitle')} description={t('attentionSectionDesc')} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {attentionMetrics.map((key, i) => {
          const value = overview[key];
          const hot = value > 0;
          return (
            <MetricCard
              key={key}
              variant="compact"
              tone={hot ? 'gold' : 'green'}
              label={t(`metrics.${key}`)}
              value={formatAdminNumber(value, locale)}
              emphasis={hot ? 'priority' : undefined}
              delayMs={i * 35}
            />
          );
        })}
      </div>
      {queue.pendingDocumentReviews > 0 && (
        <p className="mt-3 text-sm text-[var(--admin-text-muted)]">
          {t('alerts.documents', { count: queue.pendingDocumentReviews })}
        </p>
      )}
      <div className="mt-4">
        <OverviewAlerts queue={queue} overview={overview} />
      </div>
    </section>
  );
}

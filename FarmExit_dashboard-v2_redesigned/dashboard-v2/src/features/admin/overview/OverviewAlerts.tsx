import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui';
import { IconBell } from '@/components/icons';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';

export async function OverviewAlerts({
  queue,
  overview,
}: {
  queue: AdminWorkQueue;
  overview: AdminDashboardOverview;
}) {
  const t = await getTranslations('admin.overview');

  const alerts = [
    queue.unassignedUnderReview > 0 && t('alerts.unassigned', { count: queue.unassignedUnderReview }),
    queue.pendingDocumentReviews > 0 && t('alerts.documents', { count: queue.pendingDocumentReviews }),
    queue.activeCommunicationCases > 0 && t('alerts.communications', { count: queue.activeCommunicationCases }),
    overview.requestsAwaitingReview > 0 && t('alerts.awaitingReview', { count: overview.requestsAwaitingReview }),
  ].filter(Boolean) as string[];

  if (alerts.length === 0) return null;

  return (
    <div>
      <Card
        variant="elevated"
        className="border-[color-mix(in_srgb,var(--admin-brand-gold)_35%,var(--admin-border-subtle))] bg-[var(--admin-status-warning-bg)] p-5"
      >
        <div className="mb-3 flex items-center gap-2 text-[var(--admin-status-warning)]">
          <IconBell className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t('alertsTitle')}</span>
        </div>
        <ul className="flex flex-col gap-2 text-sm text-[var(--admin-text-primary)]">
          {alerts.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--admin-brand-gold)]" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

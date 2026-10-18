import { getLocale, getTranslations } from 'next-intl/server';
import { Badge, Card, SectionHeader } from '@/design-system';
import { cn } from '@/lib/cn';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';
import { formatAdminNumber, queuePriorityItems } from './overview-metrics';

export async function OverviewQueue({
  queue,
  overview,
  hideHeader,
}: {
  queue: AdminWorkQueue;
  overview: AdminDashboardOverview;
  hideHeader?: boolean;
}) {
  const t = await getTranslations('admin.overview');
  const locale = await getLocale();
  const items = queuePriorityItems(queue, overview);

  return (
    <section>
      {!hideHeader && <SectionHeader title={t('queueTitle')} description={t('queueDesc')} />}
      <Card variant="elevated" className="divide-y divide-[var(--admin-border-subtle)] p-0">
        <ul>
          {items.map((row) => {
            const queueKeys: (keyof AdminWorkQueue)[] = [
              'unassignedUnderReview',
              'changesRequested',
              'pendingDocumentReviews',
              'activeCommunicationCases',
              'recentlyUpdatedRequests',
            ];
            const label = queueKeys.includes(row.key as keyof AdminWorkQueue)
              ? t(`queue.${row.key as keyof AdminWorkQueue}`)
              : t(`metrics.${row.key as 'requestsAwaitingReview' | 'requestsAwaitingStaffAssignment'}`);
            return (
              <li
                key={row.key}
                className={cn(
                  'flex items-center justify-between gap-4 px-5 py-3.5',
                  row.high && 'bg-[color-mix(in_srgb,var(--admin-brand-gold)_6%,white)]',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm text-[var(--admin-text-secondary)]">{label}</span>
                  {row.high && row.value > 0 && <Badge variant="warning">{t('priority')}</Badge>}
                </div>
                <span className={cn('text-lg font-semibold tabular-nums', row.high && row.value > 0 && 'text-[var(--admin-status-warning)]')}>
                  {formatAdminNumber(row.value, locale)}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}

import { Link } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { KpiStrip, Panel } from '@/design-system/workspace/KpiStrip';
import { RefreshButton } from './RefreshButton';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';
import { formatAdminNumber } from './overview/overview-metrics';
import { staffRoleLabelKey } from '@/lib/admin/roles';
import { Badge } from '@/design-system';

type Props = {
  displayName: string | null;
  roles: string[];
  overview: AdminDashboardOverview;
  queue: AdminWorkQueue;
};

export async function AdminOverview({ displayName, roles, overview, queue }: Props) {
  const t = await getTranslations('admin.overview');
  const tHeader = await getTranslations('admin.header');
  const locale = await getLocale();
  const fmt = (n: number) => formatAdminNumber(n, locale);

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="gold" className="mb-3 normal-case tracking-wide">{tHeader(staffRoleLabelKey(roles))}</Badge>
          <h1 className="text-[var(--admin-text-2xl)] font-semibold tracking-tight text-[var(--admin-text-primary)]">
            {displayName ? t('welcome', { name: displayName }) : t('welcomeFallback')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--admin-text-muted)]">{t('heroSummary')}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/admin/requests" className="admin-quick-link">{t('quick.reviewRequests')}</Link>
        <Link href="/admin/listings" className="admin-quick-link">{t('quick.reviewListings')}</Link>
        <Link href="/admin/communications" className="admin-quick-link">{t('quick.communications')}</Link>
        <Link href="/admin/analytics" className="admin-quick-link">{t('quick.analytics')}</Link>
      </div>

      <KpiStrip
        items={[
          {
            label: t('metrics.registeredUsers'),
            value: fmt(overview.registeredUsers),
            hint: `${t('metrics.activeCommunicationCases')}: ${fmt(overview.activeCommunicationCases)}`,
          },
          {
            label: t('metrics.farms'),
            value: fmt(overview.farms),
            hint: `${t('metrics.pendingListingRequests')}: ${fmt(overview.pendingListingRequests)}`,
          },
          {
            label: t('metrics.publishedSaleListings'),
            value: fmt(overview.publishedSaleListings),
            hint: `${t('metrics.requestsAwaitingReview')}: ${fmt(overview.requestsAwaitingReview)}`,
          },
          {
            label: t('metrics.publishedRentListings'),
            value: fmt(overview.publishedRentListings),
            hint: `${t('metrics.requestsAwaitingStaffAssignment')}: ${fmt(overview.requestsAwaitingStaffAssignment)}`,
          },
        ]}
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Panel title={t('queueTitle')} description={t('queueDesc')}>
          <ul className="divide-y divide-[var(--admin-border-subtle)] text-sm">
            {[
              [t('metrics.requestsAwaitingReview'), fmt(overview.requestsAwaitingReview)],
              [t('metrics.requestsAwaitingStaffAssignment'), fmt(overview.requestsAwaitingStaffAssignment)],
              [t('metrics.activeCommunicationCases'), fmt(overview.activeCommunicationCases)],
              [t('queue.pendingDocumentReviews'), fmt(queue.pendingDocumentReviews)],
            ].map(([label, value]) => (
              <li key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span className="text-[var(--admin-text-secondary)]">{label}</span>
                <strong className="tabular-nums text-[var(--admin-text-primary)]">{value}</strong>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t('alertsTitle')} description={t('alertsDesc')}>
          <ul className="space-y-2 text-sm text-[var(--admin-text-secondary)]">
            {queue.unassignedUnderReview > 0 && <li>{t('alerts.unassigned', { count: queue.unassignedUnderReview })}</li>}
            {overview.requestsAwaitingReview > 0 && <li>{t('alerts.awaitingReview', { count: overview.requestsAwaitingReview })}</li>}
            {queue.activeCommunicationCases > 0 && <li>{t('alerts.communications', { count: queue.activeCommunicationCases })}</li>}
            {queue.unassignedUnderReview === 0 && overview.requestsAwaitingReview === 0 && queue.activeCommunicationCases === 0 && (
              <li className="text-[var(--admin-text-muted)]">{t('alertsClear')}</li>
            )}
          </ul>
        </Panel>
      </div>
    </PageContainer>
  );
}

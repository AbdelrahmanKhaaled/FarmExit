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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="gold" className="mb-2 normal-case">{tHeader(staffRoleLabelKey(roles))}</Badge>
          <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">
            {displayName ? t('welcome', { name: displayName }) : t('welcomeFallback')}
          </h1>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{t('heroSummary')}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/requests" className="rounded-full border border-[var(--admin-border-subtle)] bg-white px-3 py-1.5 text-xs font-semibold hover:border-[var(--admin-brand-primary)]">
          {t('quick.reviewRequests')}
        </Link>
        <Link href="/admin/listings" className="rounded-full border border-[var(--admin-border-subtle)] bg-white px-3 py-1.5 text-xs font-semibold hover:border-[var(--admin-brand-primary)]">
          {t('quick.reviewListings')}
        </Link>
        <Link href="/admin/analytics" className="rounded-full border border-[var(--admin-border-subtle)] bg-white px-3 py-1.5 text-xs font-semibold hover:border-[var(--admin-brand-primary)]">
          {t('quick.analytics')}
        </Link>
      </div>

      <KpiStrip
        items={[
          { label: t('metrics.registeredUsers'), value: fmt(overview.registeredUsers) },
          { label: t('metrics.farms'), value: fmt(overview.farms) },
          { label: t('metrics.publishedSaleListings'), value: fmt(overview.publishedSaleListings) },
          { label: t('metrics.publishedRentListings'), value: fmt(overview.publishedRentListings) },
        ]}
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title={t('queueTitle')} description={t('queueDesc')}>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>{t('metrics.requestsAwaitingReview')}</span><strong>{fmt(overview.requestsAwaitingReview)}</strong></li>
            <li className="flex justify-between"><span>{t('metrics.requestsAwaitingStaffAssignment')}</span><strong>{fmt(overview.requestsAwaitingStaffAssignment)}</strong></li>
            <li className="flex justify-between"><span>{t('metrics.activeCommunicationCases')}</span><strong>{fmt(overview.activeCommunicationCases)}</strong></li>
            <li className="flex justify-between"><span>{t('queue.pendingDocumentReviews')}</span><strong>{fmt(queue.pendingDocumentReviews)}</strong></li>
          </ul>
        </Panel>
        <div className="space-y-4">
          <Panel title={t('alertsTitle')} description={t('alertsDesc')}>
            <ul className="space-y-1 text-sm text-[var(--admin-text-secondary)]">
              {queue.unassignedUnderReview > 0 && <li>{t('alerts.unassigned', { count: queue.unassignedUnderReview })}</li>}
              {overview.requestsAwaitingReview > 0 && <li>{t('alerts.awaitingReview', { count: overview.requestsAwaitingReview })}</li>}
              {queue.activeCommunicationCases > 0 && <li>{t('alerts.communications', { count: queue.activeCommunicationCases })}</li>}
              {queue.unassignedUnderReview === 0 && overview.requestsAwaitingReview === 0 && queue.activeCommunicationCases === 0 && (
                <li>{t('alertsClear')}</li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}

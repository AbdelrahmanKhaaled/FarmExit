import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageContainer } from '@/components/ui';
import { StatCard } from '@/components/dashboard/StatCard';
import { DonutDistribution } from '@/components/dashboard/DonutDistribution';
import { IconChat, IconFarm, IconInbox, IconList } from '@/components/icons';
import { RefreshButton } from './RefreshButton';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';
import type { StaffRequestList } from '@/lib/api/types/staff';
import { formatAdminNumber, listingSplit } from './overview/overview-metrics';
import { OverviewWorkloadChart } from './overview/OverviewWorkloadChart';
import { OverviewQueue } from './overview/OverviewQueue';
import { OverviewAlerts } from './overview/OverviewAlerts';
import { OverviewRequestsTable } from './overview/OverviewRequestsTable';

export async function AdminOverview({ displayName, overview, queue, recentRequests }: {
  displayName: string | null;
  overview: AdminDashboardOverview;
  queue: AdminWorkQueue;
  recentRequests: StaffRequestList | null;
}) {
  const t = await getTranslations('admin.overview');
  const locale = await getLocale();
  const fmt = (n: number) => formatAdminNumber(n, locale);
  const { sale, rent } = listingSplit(overview);
  const publishedTotal = sale + rent;

  return (
    <PageContainer className="admin-fade-in space-y-6">
      <section className="crm-welcome">
        <div className="crm-welcome__content">
          <p className="crm-welcome__eyebrow"><span className="crm-welcome__status" />{t('workspaceEyebrow')}</p>
          <h1>{displayName ? t('welcome', { name: displayName }) : t('welcomeFallback')}</h1>
          <p className="crm-welcome__description">{t('heroSummary')}</p>
          <div className="crm-welcome__actions">
            <Link href="/admin/requests" className="crm-welcome__primary-link">{t('viewAllRequests')} <span aria-hidden="true">↗</span></Link>
            <RefreshButton label={t('refresh')} />
          </div>
        </div>
        <div className="crm-welcome__visual" aria-hidden="true">
          <div className="crm-welcome__orb crm-welcome__orb--one" />
          <div className="crm-welcome__orb crm-welcome__orb--two" />
          <div className="crm-welcome__rings"><span/><span/><span/></div>
          <div className="crm-welcome__visual-mark"><IconFarm className="size-12" /></div>
        </div>
        <div className="crm-welcome__bottom-line" aria-hidden="true" />
      </section>

      <section aria-label={t('metricsHeading')}>
        <div className="crm-section-heading"><div><p className="crm-section-heading__eyebrow">{t('workspaceSummary')}</p><h2>{t('metricsHeading')}</h2></div><span className="crm-section-heading__rule" /></div>
        <div className="crm-kpi-grid">
          <StatCard featured label={t('metrics.farms')} value={fmt(overview.farms)} hint={`${t('metrics.pendingListingRequests')}: ${fmt(overview.pendingListingRequests)}`} icon={<IconFarm className="size-5" />} />
          <StatCard label={t('metrics.publishedSaleListings')} value={fmt(overview.publishedSaleListings)} hint={`${t('metrics.publishedRentListings')}: ${fmt(overview.publishedRentListings)}`} icon={<IconList className="size-5" />} accent="gold" />
          <StatCard label={t('metrics.requestsAwaitingReview')} value={fmt(overview.requestsAwaitingReview)} hint={`${t('metrics.requestsAwaitingStaffAssignment')}: ${fmt(overview.requestsAwaitingStaffAssignment)}`} icon={<IconInbox className="size-5" />} />
          <StatCard label={t('metrics.activeCommunicationCases')} value={fmt(overview.activeCommunicationCases)} hint={`${t('metrics.registeredUsers')}: ${fmt(overview.registeredUsers)}`} icon={<IconChat className="size-5" />} accent="gold" />
        </div>
      </section>

      <section className="crm-analytics-grid" aria-label={t('charts.workflowTitle')}>
        <OverviewWorkloadChart overview={overview} locale={locale} />
        <div className="crm-distribution">
          <DonutDistribution title={t('distributionTitle')} description={t('distributionDesc')} centerLabel={t('distributionTotal')} centerValue={fmt(publishedTotal)} segments={[
            { label: t('metrics.publishedSaleListings'), value: sale, color: 'var(--admin-chart-1)' },
            { label: t('metrics.publishedRentListings'), value: rent, color: 'var(--admin-chart-3)' },
          ]} />
        </div>
      </section>

      <div className="crm-lower-grid">
        <div className="min-w-0">{recentRequests ? <OverviewRequestsTable data={recentRequests} /> : null}</div>
        <div className="min-w-0"><OverviewQueue queue={queue} overview={overview} hideHeader={false} /></div>
      </div>
      <OverviewAlerts queue={queue} overview={overview} />
    </PageContainer>
  );
}

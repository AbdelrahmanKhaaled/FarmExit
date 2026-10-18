import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { ChartShell } from '@/design-system';
import { KpiStrip, Panel } from '@/design-system/workspace/KpiStrip';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { AnalyticsDateFilters } from '@/features/admin/analytics/AnalyticsDateFilters';
import { DistributionBars } from '@/features/admin/analytics/DistributionBars';
import { TimeSeriesChart } from '@/features/admin/analytics/TimeSeriesChart';
import { buildAnalyticsQueryString, type AnalyticsRangePreset } from '@/features/admin/analytics/analytics-query';
import { formatAdminNumber } from '@/features/admin/overview/overview-metrics';
import { apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import type { AdminAnalyticsReport } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';

export default async function AnalyticsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/analytics'> & {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const range = (sp.range as AnalyticsRangePreset | undefined) ?? '30d';
  const t = await getTranslations('admin.analytics');
  const loc = await getLocale();
  const fmt = (n: number) => formatAdminNumber(n, loc);

  const qs = buildAnalyticsQueryString({ range, from: sp.from, to: sp.to });
  const res = await apiFetchAdminResult<AdminAnalyticsReport>(`/staff/admin/analytics?${qs}`, session.accessToken);
  if (!res.ok) {
    throw new Error(res.message ?? 'Analytics');
  }
  const data = res.data;

  const typeRows = Object.entries(data.distributions.requestsByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, value]) => ({ key, label: key, value }));

  const statusRows = Object.entries(data.distributions.requestsByStatusSnapshot)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, value]) => ({ key, label: key, value }));

  const proposalKindRows = Object.entries(data.distributions.proposalsByKind).map(([key, value]) => ({
    key,
    label: key,
    value,
  }));

  return (
    <PageContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--admin-brand-primary)]">{t('eyebrow')}</p>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">{t('desc')}</p>
          <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{t('periodNote', { from: data.from.slice(0, 10), to: data.to.slice(0, 10) })}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      <AnalyticsDateFilters activeRange={range} customFrom={sp.from} customTo={sp.to} />

      <KpiStrip
        items={[
          { label: t('kpi.newUsers'), value: fmt(data.overview.newUsers) },
          { label: t('kpi.newFarms'), value: fmt(data.overview.newFarms) },
          { label: t('kpi.publishedListings'), value: fmt(data.overview.publishedListings) },
          { label: t('kpi.requests'), value: fmt(data.overview.requestsCreated) },
          { label: t('kpi.proposals'), value: fmt(data.overview.purchaseProposals) },
        ]}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title={t('charts.users')} description={t('charts.usersDesc')}>
          <TimeSeriesChart series={data.timeseries.usersRegistered} granularity={data.granularity} emptyLabel={t('emptySeries')} />
        </Panel>
        <Panel title={t('charts.farms')} description={t('charts.farmsDesc')}>
          <TimeSeriesChart series={data.timeseries.farmsCreated} granularity={data.granularity} emptyLabel={t('emptySeries')} />
        </Panel>
        <Panel title={t('charts.listingsPublished')} description={t('charts.listingsPublishedDesc')}>
          <TimeSeriesChart series={data.timeseries.listingsPublished} granularity={data.granularity} emptyLabel={t('emptySeries')} />
        </Panel>
        <Panel title={t('charts.requests')} description={t('charts.requestsDesc')}>
          <TimeSeriesChart series={data.timeseries.requestsCreated} granularity={data.granularity} emptyLabel={t('emptySeries')} />
        </Panel>
        <Panel title={t('charts.proposals')} description={t('charts.proposalsDesc')}>
          <TimeSeriesChart series={data.timeseries.proposalsCreated} granularity={data.granularity} emptyLabel={t('emptySeries')} />
        </Panel>
        <Panel title={t('charts.communications')} description={t('charts.communicationsDesc')}>
          <TimeSeriesChart
            series={data.timeseries.communicationCasesCreated}
            granularity={data.granularity}
            emptyLabel={t('emptySeries')}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartShell title={t('sections.requestsByType')} description={t('sections.requestsByTypeDesc')} isEmpty={typeRows.length === 0} emptyTitle={t('emptySeries')}>
          <DistributionBars rows={typeRows} color="var(--admin-chart-1)" />
        </ChartShell>
        <ChartShell title={t('sections.requestsByStatus')} description={t('sections.statusSnapshotDesc')} isEmpty={statusRows.length === 0} emptyTitle={t('emptySeries')}>
          <DistributionBars rows={statusRows} color="var(--admin-chart-3)" />
        </ChartShell>
        <ChartShell title={t('sections.listingsSplit')} description={t('sections.listingsSplitDesc')} isEmpty={data.overview.saleListingsPublished + data.overview.rentListingsPublished === 0} emptyTitle={t('emptySeries')}>
          <DistributionBars
            rows={[
              { key: 'sale', label: t('sale'), value: data.overview.saleListingsPublished },
              { key: 'rent', label: t('rent'), value: data.overview.rentListingsPublished },
            ]}
          />
        </ChartShell>
        <ChartShell title={t('sections.proposalsByKind')} description={t('sections.proposalsByKindDesc')} isEmpty={proposalKindRows.length === 0} emptyTitle={t('emptySeries')}>
          <DistributionBars rows={proposalKindRows} color="var(--admin-chart-2)" />
        </ChartShell>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title={t('sections.workflows')} description={t('sections.workflowsDesc')}>
          <ul className="space-y-2 text-sm">
            <li>{t('workflow.awaitingReview', { count: fmt(data.workflows.awaitingReview) })}</li>
            <li>{t('workflow.unassigned', { count: fmt(data.workflows.unassignedReviewer) })}</li>
            <li>{t('workflow.changesRequested', { count: fmt(data.workflows.changesRequested) })}</li>
            <li>{t('workflow.openComms', { count: fmt(data.workflows.openCommunicationCases) })}</li>
            <li>{t('workflow.docsPending', { count: fmt(data.workflows.documentsPendingReview) })}</li>
          </ul>
        </Panel>
        <Panel title={t('sections.partnerships')} description={t('sections.partnershipsDesc')}>
          <ul className="space-y-2 text-sm">
            <li>{t('partnerships.requests', { count: fmt(data.distributions.partnershipRequestsCreated) })}</li>
            <li>{t('partnerships.applications', { count: fmt(data.distributions.partnershipApplicationsCreated) })}</li>
          </ul>
        </Panel>
      </div>

      <p className="mt-8 text-xs text-[var(--admin-text-muted)]">{t('listingPublicationNote')}</p>
    </PageContainer>
  );
}

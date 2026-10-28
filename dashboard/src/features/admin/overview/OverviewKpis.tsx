import { getLocale, getTranslations } from 'next-intl/server';
import { MetricCard, SectionHeader } from '@/components/ui';
import type { AdminDashboardOverview } from '@/lib/api/types/admin-dashboard';
import { formatAdminNumber } from './overview-metrics';

export async function OverviewKpis({ overview }: { overview: AdminDashboardOverview }) {
  const t = await getTranslations('admin.overview');
  const locale = await getLocale();

  return (
    <section aria-labelledby="primary-metrics">
      <SectionHeader title={t('primaryTitle')} description={t('kpiDesc')} />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <MetricCard
            variant="featured"
            tone="green"
            label={t('metrics.registeredUsers')}
            value={formatAdminNumber(overview.registeredUsers, locale)}
            sublabel={t('featuredUsersHint')}
            delayMs={0}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
          <MetricCard
            variant="standard"
            tone="green"
            label={t('metrics.farms')}
            value={formatAdminNumber(overview.farms, locale)}
            delayMs={40}
          />
          <MetricCard
            variant="standard"
            tone="gold"
            label={t('metrics.publishedSaleListings')}
            value={formatAdminNumber(overview.publishedSaleListings, locale)}
            delayMs={80}
          />
          <MetricCard
            variant="standard"
            tone="gold"
            label={t('metrics.publishedRentListings')}
            value={formatAdminNumber(overview.publishedRentListings, locale)}
            delayMs={120}
          />
        </div>
      </div>
    </section>
  );
}

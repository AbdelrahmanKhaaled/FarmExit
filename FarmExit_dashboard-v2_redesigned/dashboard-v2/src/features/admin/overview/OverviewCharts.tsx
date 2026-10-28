import { getTranslations } from 'next-intl/server';
import { ChartShell } from '@/components/ui';
import type { AdminDashboardOverview } from '@/lib/api/types/admin-dashboard';
import { listingSplit, workflowRequestMix } from './overview-metrics';

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
      <div>
        <div className="mb-1 flex justify-between gap-2 text-[var(--admin-text-muted)]">
          <span className="line-clamp-1">{label}</span>
          <span className="font-semibold tabular-nums text-[var(--admin-text-primary)]">{value}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-bg-subtle)]">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

export async function OverviewCharts({
  overview,
  layout = 'grid',
}: {
  overview: AdminDashboardOverview;
  locale: string;
  layout?: 'grid' | 'stack';
}) {
  const t = await getTranslations('admin.overview');
  const { sale, rent, total } = listingSplit(overview);
  const mix = workflowRequestMix(overview);
  const maxMix = mix.reduce((m, r) => Math.max(m, r.value), 0);

  const colors: string[] = [
    'var(--admin-chart-1)',
    'var(--admin-chart-2)',
    'var(--admin-chart-3)',
    'var(--admin-chart-4)',
  ];

  return (
    <div className={layout === 'stack' ? 'flex flex-col gap-6' : 'grid gap-6 lg:grid-cols-2'}>
      <ChartShell
        title={t('charts.listingsTitle')}
        description={t('charts.listingsDesc')}
        isEmpty={total === 0}
        emptyTitle={t('charts.noListings')}
      >
        <div className="flex flex-col gap-4">
          <BarRow label={t('metrics.publishedSaleListings')} value={sale} max={total} color={colors[0]!} />
          <BarRow label={t('metrics.publishedRentListings')} value={rent} max={total} color={colors[2]!} />
        </div>
      </ChartShell>
      <ChartShell
        title={t('charts.workflowTitle')}
        description={t('charts.workflowDesc')}
        isEmpty={mix.length === 0}
        emptyTitle={t('charts.noWorkflow')}
      >
        <div className="flex flex-col gap-3">
          {mix.map((row, i) => (
            <BarRow
              key={row.key}
              label={t(`metrics.${row.key}`)}
              value={row.value}
              max={maxMix}
              color={colors[i % colors.length]!}
            />
          ))}
        </div>
      </ChartShell>
    </div>
  );
}

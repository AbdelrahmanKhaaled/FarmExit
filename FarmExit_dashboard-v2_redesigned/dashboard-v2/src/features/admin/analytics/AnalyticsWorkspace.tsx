'use client';
import { useLocale, useTranslations } from 'next-intl';
import type { AdminAnalyticsReport } from '@/lib/api/types/admin-ops';
import { NavIcon } from '@/features/admin/shell/nav-icons';
import { TimeSeriesChart } from './TimeSeriesChart';
const COLORS = ['#22885f', '#d6ae61', '#66a59b', '#7595bd', '#986e9a'];
export function AnalyticsWorkspace({ data }: { data: AdminAnalyticsReport }) {
  const b = useTranslations('batch');
  const t = useTranslations('admin.analytics'),
    e = useTranslations('admin.enums'),
    locale = useLocale(),
    f = new Intl.NumberFormat(locale);
  const label = (group: string, key: string) => (e.has(`${group}.${key}`) ? e(`${group}.${key}`) : e('unknown'));
  const rows = (values: Record<string, number>, group: string) =>
    Object.entries(values)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, value, label: label(group, key) }));
  const kpis = [
    ['newUsers', data.overview.newUsers, 'users', 'charts.usersDesc'],
    ['newFarms', data.overview.newFarms, 'farms', 'charts.farmsDesc'],
    ['publishedListings', data.overview.publishedListings, 'listings', 'charts.listingsPublishedDesc'],
    ['requests', data.overview.requestsCreated, 'requestsHub', 'charts.requestsDesc'],
    ['proposals', data.overview.purchaseProposals, 'proposals', 'charts.proposalsDesc'],
  ] as const;
  const sale = data.overview.saleListingsPublished,
    rent = data.overview.rentListingsPublished,
    total = sale + rent;
  const series = [
    ['users', data.timeseries.usersRegistered, 'area', COLORS[0]],
    ['farms', data.timeseries.farmsCreated, 'columns', COLORS[2]],
    ['listingsPublished', data.timeseries.listingsPublishedSale, 'stacked', COLORS[0]],
    ['requests', data.timeseries.requestsCreated, 'area', COLORS[1]],
    ['communications', data.timeseries.communicationCasesCreated, 'area', COLORS[3]],
  ] as const;
  function ranked(items: { key: string; label: string; value: number }[], semantic = false) {
    const max = Math.max(1, ...items.map((r) => r.value));
    return items.length ? (
      <ol className="analytics-ranked">
        {items.map((r, i) => (
          <li key={r.key}>
            <div>
              <span>{r.label}</span>
              <strong>{f.format(r.value)}</strong>
            </div>
            <div className="analytics-track">
              <span
                style={{
                  width: `${(r.value / max) * 100}%`,
                  background: semantic
                    ? /rejected|changes/i.test(r.key)
                      ? '#c18543'
                      : /approved|published/.test(r.key)
                        ? COLORS[0]
                        : '#7c9bb6'
                    : COLORS[i % COLORS.length],
                }}
              />
            </div>
          </li>
        ))}
      </ol>
    ) : (
      <p className="analytics-empty">{t('emptySeries')}</p>
    );
  }
  return (
    <>
      <div className="analytics-kpis">
        {kpis.map(([key, value, icon, desc], i) => (
          <article className="analytics-kpi" style={{ borderTopColor: COLORS[i] }} key={key}>
            <div>
              <p>{t(`kpi.${key}`)}</p>
              <span style={{ color: COLORS[i] }}>
                <NavIcon itemKey={icon} className="size-5" />
              </span>
            </div>
            <strong>{f.format(value)}</strong>
            <small>{t(desc)}</small>
          </article>
        ))}
      </div>
      <div className="analytics-grid">
        {series.map(([key, points, variant, color]) => (
          <section className={`analytics-card ${key === 'communications' ? 'analytics-card--wide' : ''}`} key={key}>
            <header>
              <span className="analytics-card__icon" style={{ color }}>
                <NavIcon itemKey="analytics" className="size-5" />
              </span>
              <div>
                <h2>{t(`charts.${key}`)}</h2>
                <p>{t(`charts.${key}Desc`)}</p>
              </div>
            </header>
            <TimeSeriesChart
              series={[...points]}
              granularity={data.granularity}
              emptyLabel={t('emptySeries')}
              variant={variant}
              color={color}
              secondary={variant === 'stacked' ? data.timeseries.listingsPublishedRent : undefined}
            />
          </section>
        ))}
      </div>
      <div className="analytics-grid">
        <section className="analytics-card">
          <header>
            <div>
              <h2>{t('sections.requestsByType')}</h2>
              <p>{t('sections.requestsByTypeDesc')}</p>
            </div>
          </header>
          {ranked(rows(data.distributions.requestsByType, 'requestType'))}
        </section>
        <section className="analytics-card">
          <header>
            <div>
              <h2>{t('sections.requestsByStatus')}</h2>
              <p>{t('sections.statusSnapshotDesc')}</p>
            </div>
          </header>
          {ranked(rows(data.distributions.requestsByStatusSnapshot, 'status'), true)}
        </section>
        <section className="analytics-card">
          <header>
            <div>
              <h2>{t('sections.listingsSplit')}</h2>
              <p>{t('sections.listingsSplitDesc')}</p>
            </div>
          </header>
          {total ? (
            <div className="analytics-donut-layout">
              <div className="analytics-donut">
                <svg viewBox="0 0 160 160" role="img" aria-label={`${t('sale')}: ${sale}, ${t('rent')}: ${rent}`}>
                  <circle cx="80" cy="80" r="61" fill="none" stroke="#d6ae61" strokeWidth="23" />
                  <circle
                    cx="80"
                    cy="80"
                    r="61"
                    fill="none"
                    stroke="#22885f"
                    strokeWidth="23"
                    strokeDasharray={`${(sale / total) * 383.27} 383.27`}
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div>
                  <small>{b('total')}</small>
                  <strong>{f.format(total)}</strong>
                </div>
              </div>
              <ul>
                {[
                  [t('sale'), sale],
                  [t('rent'), rent],
                ].map(([name, value], i) => (
                  <li key={name}>
                    <i style={{ background: COLORS[i] }} />
                    <span>{name}</span>
                    <strong>{f.format(Number(value))}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="analytics-empty">{t('emptySeries')}</p>
          )}
        </section>
        <section className="analytics-card">
          <header>
            <div>
              <h2>{t('sections.proposalsByKind')}</h2>
              <p>{t('sections.proposalsByKindDesc')}</p>
            </div>
          </header>
          {ranked(rows(data.distributions.proposalsByKind, 'proposalKind'))}
          <details className="analytics-secondary">
            <summary>{t('charts.proposals')}</summary>
            <TimeSeriesChart
              series={data.timeseries.proposalsCreated}
              granularity={data.granularity}
              emptyLabel={t('emptySeries')}
            />
          </details>
        </section>
        <section className="analytics-card">
          <header>
            <div>
              <h2>{t('sections.workflows')}</h2>
              <p>{t('sections.workflowsDesc')}</p>
            </div>
          </header>
          {ranked(
            [
              'awaitingReview',
              'unassignedReviewer',
              'changesRequested',
              'openCommunicationCases',
              'documentsPendingReview',
            ].map((key, i) => ({
              key,
              label: b(key),
              value: [
                data.workflows.awaitingReview,
                data.workflows.unassignedReviewer,
                data.workflows.changesRequested,
                data.workflows.openCommunicationCases,
                data.workflows.documentsPendingReview,
              ][i]!,
            })),
          )}
        </section>
        <section className="analytics-card">
          <header>
            <div>
              <h2>{t('sections.partnerships')}</h2>
              <p>{t('sections.partnershipsDesc')}</p>
            </div>
          </header>
          {ranked([
            { key: 'requests', label: b('partnershipRequests'), value: data.distributions.partnershipRequestsCreated },
            {
              key: 'applications',
              label: b('partnershipApplications'),
              value: data.distributions.partnershipApplicationsCreated,
            },
          ])}
        </section>
      </div>
    </>
  );
}

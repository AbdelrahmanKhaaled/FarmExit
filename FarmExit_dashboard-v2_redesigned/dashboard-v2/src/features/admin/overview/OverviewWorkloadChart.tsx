import { getTranslations } from 'next-intl/server';
import type { AdminDashboardOverview } from '@/lib/api/types/admin-dashboard';

/** Actual current counters; columns do not imply a fabricated time series. */
export async function OverviewWorkloadChart({ overview, locale }: { overview: AdminDashboardOverview; locale: string }) {
  const t = await getTranslations('admin.overview');
  const values = [
    { key: 'pendingListingRequests', value: overview.pendingListingRequests },
    { key: 'farmManagementRequests', value: overview.farmManagementRequests },
    { key: 'partnershipRequests', value: overview.partnershipRequests },
    { key: 'partnershipApplications', value: overview.partnershipApplications },
    { key: 'professionalVerificationRequests', value: overview.professionalVerificationRequests },
    { key: 'farmDetailsInquiries', value: overview.farmDetailsInquiries },
    { key: 'purchaseProposals', value: overview.purchaseProposals },
  ] as const;
  const maxValue = Math.max(1, ...values.map((item) => item.value));
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const f = new Intl.NumberFormat(locale);

  return (
    <section className="crm-panel crm-workload-panel">
      <div className="crm-panel__header">
        <div>
          <p className="crm-panel__eyebrow">{t('workloadLabel')}</p>
          <h2 className="crm-panel__title">{t('charts.workflowTitle')}</h2>
          <p className="crm-panel__desc">{t('charts.workflowDesc')}</p>
        </div>
        <div className="crm-panel__total"><span>{f.format(total)}</span><small>{t('workloadLabel')}</small></div>
      </div>
      <div className="crm-workload-chart" role="img" aria-label={t('charts.workflowTitle')}>
        <div className="crm-workload-chart__grid" aria-hidden="true"><i/><i/><i/><i/></div>
        <div className="crm-workload-chart__columns">
          {values.map(({ key, value }, index) => (
            <div className="crm-workload-chart__item" key={key}>
              <div className="crm-workload-chart__track">
                <span className="crm-workload-chart__figure">{f.format(value)}</span>
                <div className="crm-workload-chart__bar" style={{ height: `${value > 0 ? Math.max(4, (value / maxValue) * 100) : 0}%`, animationDelay: `${index * 65}ms` }}>
                  <span className="crm-workload-chart__shine" />
                </div>
              </div>
              <span className="crm-workload-chart__label" title={t(`metrics.${key}`)}>{t(`metrics.${key}`)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="crm-chart-note"><span className="crm-chart-note__dot" />{t('workspaceSummary')}</div>
    </section>
  );
}

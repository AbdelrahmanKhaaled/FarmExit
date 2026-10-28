import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { ActionIcon } from '@/features/admin/workspace/ActionIcon';
import { MetricCard } from '@/components/ui/MetricCard';
import type { AdminApiResult } from '@/lib/admin/session.server';
import {
  APPLICATION_STATUSES,
  applicationsHref,
  type ApplicationFilters,
  type LinkedApplications,
} from './linked-applications';

export async function LinkedApplicationsPanel({
  requestId,
  result,
  filters,
  locale,
}: {
  requestId: string;
  result: AdminApiResult<LinkedApplications>;
  filters: ApplicationFilters;
  locale: string;
}) {
  const t = await getTranslations('admin.requestWorkspace');
  const enums = await getTranslations('admin.enums');
  const pagination = await getTranslations('admin.pagination');
  const data = result.ok ? result.data : null;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const format = (value: number) => new Intl.NumberFormat(locale).format(value);
  return (
    <section id="applications" className="request-applications operation-card" aria-labelledby="applications-title">
      <header className="request-section-heading">
        <div className="request-section-icon">
          <ActionIcon name="view" />
        </div>
        <div>
          <p className="request-eyebrow">{t('opportunityInbox')}</p>
          <h2 id="applications-title">{t('applicationsReceived')}</h2>
          <p className="workflow-help">{t('applicationsSubtitle')}</p>
        </div>
        {data ? <span className="request-count">{format(data.summary.total)}</span> : null}
      </header>
      {!data ? (
        <div className="request-empty" role="status">
          <h3>{t(result.ok || result.status !== 403 ? 'applicationsUnavailable' : 'applicationsRestricted')}</h3>
          <p>{t('applicationsAccessHint')}</p>
        </div>
      ) : (
        <>
          <div className="request-application-metrics">
            <MetricCard variant="compact" label={t('totalApplications')} value={format(data.summary.total)} />
            <MetricCard
              variant="compact"
              tone="gold"
              label={t('pendingApplications')}
              value={format(data.summary.pending)}
            />
            <MetricCard variant="compact" label={t('approvedApplications')} value={format(data.summary.approved)} />
            <MetricCard variant="compact" label={t('rejectedApplications')} value={format(data.summary.rejected)} />
          </div>
          <p className="workflow-help mt-3">{t('summaryScope')}</p>
          <form method="get" className="request-application-filters" key={JSON.stringify(filters)}>
            <label>
              {t('searchApplications')}
              <input
                name="applicationSearch"
                aria-label={t('searchApplications')}
                type="search"
                maxLength={150}
                defaultValue={filters.applicationSearch ?? ''}
                className="admin-form-control"
                placeholder={t('searchPlaceholder')}
              />
            </label>
            <label>
              {t('applicationStatus')}
              <select
                name="applicationStatus"
                aria-label={t('applicationStatus')}
                defaultValue={filters.applicationStatus ?? ''}
                className="admin-form-control"
              >
                <option value="">{t('allStatuses')}</option>
                {APPLICATION_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {enums(`status.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('sortBy')}
              <select
                name="applicationSort"
                aria-label={t('sortBy')}
                defaultValue={filters.applicationSort ?? 'newest'}
                className="admin-form-control"
              >
                <option value="newest">{t('newest')}</option>
                <option value="oldest">{t('oldest')}</option>
              </select>
            </label>
            <button type="submit" className="admin-btn-primary">
              {t('apply')}
            </button>
            <Link href={`/admin/requests/${requestId}#applications`} className="admin-btn-secondary">
              {t('clear')}
            </Link>
          </form>
          {data.items.length === 0 ? (
            <div className="request-empty">
              <ActionIcon name="view" />
              <h3>{t(data.summary.total === 0 ? 'noApplications' : 'noMatchingApplications')}</h3>
              <p>{t(data.summary.total === 0 ? 'noApplicationsHint' : 'noMatchingHint')}</p>
            </div>
          ) : (
            <div className="request-application-list">
              {data.items.map((item) => (
                <article key={item.id} className="request-application-card" data-application-id={item.id}>
                  <div className="request-applicant-avatar" aria-hidden="true">
                    {item.applicantName?.match(/\p{L}/u)?.[0] || '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="request-application-top">
                      <div>
                        <h3>{item.applicantName ?? t('unnamedApplicant')}</h3>
                        <p className="request-reference">{item.requestNumber}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="request-application-meta">
                      {item.applicantKind ? (
                        <span>{t(item.applicantKind === 'company' ? 'companyApplicant' : 'individualApplicant')}</span>
                      ) : null}
                      {item.submittedAt ? (
                        <time dateTime={item.submittedAt}>
                          {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
                            new Date(item.submittedAt),
                          )}
                        </time>
                      ) : null}
                    </div>
                    {item.summary ? (
                      <p className="request-application-summary">{item.summary}</p>
                    ) : (
                      <p className="workflow-help">{t('noSummary')}</p>
                    )}
                    <footer className="request-application-footer">
                      <span>
                        {item.assignedStaff.length
                          ? item.assignedStaff
                              .map(
                                (slot) =>
                                  `${enums.has(`adminRole.${slot.role}`) ? enums(`adminRole.${slot.role}`) : slot.role}: ${slot.name ?? t('unnamedStaff')}`,
                              )
                              .join(' · ')
                          : t('unassigned')}
                      </span>
                      <Link href={`/admin/requests/${item.id}`} className="request-view-application">
                        {t('viewApplication')}
                        <ActionIcon name="next" />
                      </Link>
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          )}
          <nav className="request-application-pagination" aria-label={t('applicationPagination')}>
            <span>
              {pagination('showing', {
                from: data.items.length ? (data.page - 1) * data.pageSize + 1 : 0,
                to: data.items.length ? (data.page - 1) * data.pageSize + data.items.length : 0,
                total: data.total,
              })}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span>{pagination('page', { page: data.page, pages })}</span>
              {data.page > 1 ? (
                <Link className="admin-btn-secondary" href={applicationsHref(requestId, filters, data.page - 1)}>
                  {pagination('prev')}
                </Link>
              ) : null}
              {data.page < pages ? (
                <Link className="admin-btn-secondary" href={applicationsHref(requestId, filters, data.page + 1)}>
                  {pagination('next')}
                </Link>
              ) : null}
            </div>
          </nav>
        </>
      )}
    </section>
  );
}

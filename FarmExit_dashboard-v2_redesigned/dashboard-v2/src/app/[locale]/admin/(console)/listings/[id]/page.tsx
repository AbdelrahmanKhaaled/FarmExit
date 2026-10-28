import { Suspense } from 'react';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/components/ui';
import { DetailWorkspace } from '@/components/ui/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/components/ui/workspace/DataTable';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { RequestDocumentsPanel } from '@/features/admin/requests/RequestDocumentsPanel';
import type { StaffRequestDetail } from '@/lib/api/types/staff';
import { ListingActions } from '@/features/admin/listings/ListingActions';
import { RequestHubForwardingLink } from '@/features/admin/requests/RequestHubForwardingLink';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { StaffListingRequest } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

async function ListingDetailPageContent({ params }: PageProps<'/[locale]/admin/listings/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'listingDetail');
  const t = await getTranslations('admin.listingDetail');
  const loc = await getLocale();
  const b = await getTranslations('batch');

  const res = await apiFetchAdminResult<StaffListingRequest>(`/staff/listing-requests/${id}`, session.accessToken);
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error(res.message ?? `Listing ${id}`);
  }
  const listing = res.data;
  const unified = await apiFetchAdminResult<StaffRequestDetail>('/staff/requests/' + id, session.accessToken);
  const staff = session.isAdmin
    ? await loadStaffOptionSets(session.accessToken)
    : { reviewerOptions: [], caseAgentOptions: [] };

  return (
    <PageContainer>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/listings" className="text-xs text-[var(--admin-brand-primary)] hover:underline">
            {t('back')}
          </Link>
          <h1 className="mt-1 break-all text-2xl font-semibold">{listing.requestNumber}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">
            <Link href={`/admin/farms/${listing.farmId}`} className="hover:underline">
              {listing.farmName}
            </Link>
            {' · '}
            <EnumLabel group="listingType" value={listing.listingType} />
          </p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      <dl className="operation-kpis">
        {listing.askingPrice != null ? (
          <div className="operation-stat">
            <dt className="text-[var(--admin-text-muted)]">{t('askingPrice')}</dt>
            <dd>
              {new Intl.NumberFormat(loc, {
                style: 'currency',
                currency: listing.currency,
                maximumFractionDigits: 0,
              }).format(listing.askingPrice)}
            </dd>
          </div>
        ) : null}
        {listing.annualRentPerFeddan != null ? (
          <div className="operation-stat">
            <dt className="text-[var(--admin-text-muted)]">{t('rentPerFeddan')}</dt>
            <dd>
              {new Intl.NumberFormat(loc, {
                style: 'currency',
                currency: listing.currency,
                maximumFractionDigits: 0,
              }).format(listing.annualRentPerFeddan)}
            </dd>
          </div>
        ) : null}
        <div className="operation-stat">
          <dt className="text-[var(--admin-text-muted)]">{t('area')}</dt>
          <dd>
            {listing.areaFeddan} {t('feddan')}
          </dd>
        </div>
        {listing.submittedAt ? (
          <div className="operation-stat">
            <dt className="text-[var(--admin-text-muted)]">{t('submitted')}</dt>
            <dd>
              {new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(listing.submittedAt),
              )}
            </dd>
          </div>
        ) : null}
      </dl>
      <section className="operation-summary">
        <ol className="listing-progress">
          {['underFarmExitReview', 'approved', 'published'].map((status) => (
            <li key={status} aria-current={listing.status === status ? 'step' : undefined}>
              <EnumLabel group="status" value={status} />
            </li>
          ))}
        </ol>
        <p>{b('approvedNotPublished')}</p>
      </section>
      <DetailWorkspace
        main={
          <div className="space-y-5 text-sm">
            <section className="operation-card workflow-form">
              <header>
                <h2>{b('overview')}</h2>
              </header>
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-[var(--admin-text-muted)]">{t('status')}: </span>
                  <StatusBadge status={listing.status} />
                </div>
                <div>
                  <span className="text-[var(--admin-text-muted)]">{t('visibility')}: </span>
                  {b.has(listing.visibility) ? b(listing.visibility) : listing.visibility}
                </div>
              </div>
              {listing.listingDescription ? (
                <p className="whitespace-pre-wrap text-[var(--admin-text-secondary)]">{listing.listingDescription}</p>
              ) : null}

              <p className="text-xs text-[var(--admin-text-muted)]">{t('approvalNote')}</p>
              <RequestHubForwardingLink requestId={listing.id} />
            </section>
            <section className="operation-card">
              <header>
                <h2>{t('assignments')}</h2>
              </header>
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t('col.role')}</Th>
                    <Th>{t('col.staff')}</Th>
                    <Th>{t('col.assigned')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {listing.assignments.length === 0 ? (
                    <tr>
                      <Td colSpan={3}>{t('none')}</Td>
                    </tr>
                  ) : (
                    listing.assignments.map((a) => (
                      <tr key={`${a.assignmentType}-${a.assignedStaffId}`}>
                        <Td>{a.assignmentType}</Td>
                        <Td>
                          {[...staff.reviewerOptions, ...staff.caseAgentOptions].find(
                            (s) => s.userId === a.assignedStaffId,
                          )?.label ?? a.assignedStaffId}
                        </Td>
                        <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(a.assignedAt))}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </section>
            <section className="operation-card">
              <header>
                <h2>{t('reviews')}</h2>
              </header>
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t('col.decision')}</Th>
                    <Th>{t('col.reviewer')}</Th>
                    <Th>{t('col.comment')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {listing.reviews.length === 0 ? (
                    <tr>
                      <Td colSpan={3}>{t('none')}</Td>
                    </tr>
                  ) : (
                    listing.reviews.map((r, i) => (
                      <tr key={i}>
                        <Td>
                          <StatusBadge status={r.decision} />
                        </Td>
                        <Td>{r.reviewerId}</Td>
                        <Td>{r.comment ?? '—'}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </section>
            {unified.ok && (
              <section className="operation-card">
                <RequestDocumentsPanel requestId={id} documents={unified.data.documents} />
              </section>
            )}
          </div>
        }
        aside={
          <ListingActions
            listingId={listing.id}
            status={listing.status}
            canPublish={session.isAdmin}
            canAssign={session.isAdmin}
            canReview={session.staff.permissions.includes('requests.review')}
            reviewerOptions={staff.reviewerOptions}
            caseAgentOptions={staff.caseAgentOptions}
          />
        }
      />
    </PageContainer>
  );
}

export default function Page(props: Parameters<typeof ListingDetailPageContent>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <ListingDetailPageContent {...props} />
    </Suspense>
  );
}

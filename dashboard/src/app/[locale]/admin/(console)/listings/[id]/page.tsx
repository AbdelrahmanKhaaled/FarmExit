import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { ListingActions } from '@/features/admin/listings/ListingActions';
import { RequestHubForwardingLink } from '@/features/admin/requests/RequestHubForwardingLink';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { StaffListingRequest } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function ListingDetailPage({ params }: PageProps<'/[locale]/admin/listings/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'listingDetail');
  const t = await getTranslations('admin.listingDetail');
  const loc = await getLocale();

  const res = await apiFetchAdminResult<StaffListingRequest>(`/staff/listing-requests/${id}`, session.accessToken);
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error(res.message ?? `Listing ${id}`);
  }
  const listing = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between gap-4">
        <div>
          <Link href="/admin/listings" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
          <h1 className="mt-1 text-2xl font-semibold">{listing.requestNumber}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">
            <Link href={`/admin/farms/${listing.farmId}`} className="hover:underline">{listing.farmName}</Link>
            {' · '}
            {listing.listingType}
          </p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>

      <DetailWorkspace
        main={
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-4">
            <div><span className="text-[var(--admin-text-muted)]">{t('status')}: </span><StatusBadge status={listing.status} /></div>
            <div><span className="text-[var(--admin-text-muted)]">{t('visibility')}: </span>{listing.visibility}</div>
          </div>
          {listing.listingDescription ? <p className="whitespace-pre-wrap text-[var(--admin-text-secondary)]">{listing.listingDescription}</p> : null}
          <dl className="grid gap-2 sm:grid-cols-2">
            {listing.askingPrice != null ? (
              <div><dt className="text-[var(--admin-text-muted)]">{t('askingPrice')}</dt><dd>{listing.askingPrice} {listing.currency}</dd></div>
            ) : null}
            {listing.annualRentPerFeddan != null ? (
              <div><dt className="text-[var(--admin-text-muted)]">{t('rentPerFeddan')}</dt><dd>{listing.annualRentPerFeddan} {listing.currency}</dd></div>
            ) : null}
            <div><dt className="text-[var(--admin-text-muted)]">{t('area')}</dt><dd>{listing.areaFeddan} {t('feddan')}</dd></div>
            {listing.submittedAt ? (
              <div><dt className="text-[var(--admin-text-muted)]">{t('submitted')}</dt><dd>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(listing.submittedAt))}</dd></div>
            ) : null}
          </dl>
          <p className="text-xs text-[var(--admin-text-muted)]">{t('approvalNote')}</p>
          <RequestHubForwardingLink requestId={listing.id} />

          <h2 className="text-sm font-semibold">{t('assignments')}</h2>
          <DataTable>
            <thead><tr><Th>{t('col.role')}</Th><Th>{t('col.staff')}</Th><Th>{t('col.assigned')}</Th></tr></thead>
            <tbody>
              {listing.assignments.length === 0 ? (
                <tr><Td colSpan={3}>{t('none')}</Td></tr>
              ) : (
                listing.assignments.map((a) => (
                  <tr key={`${a.assignmentType}-${a.assignedStaffId}`}>
                    <Td>{a.assignmentType}</Td>
                    <Td>{a.assignedStaffId}</Td>
                    <Td>{new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(a.assignedAt))}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>

          <h2 className="text-sm font-semibold">{t('reviews')}</h2>
          <DataTable>
            <thead><tr><Th>{t('col.decision')}</Th><Th>{t('col.reviewer')}</Th><Th>{t('col.comment')}</Th></tr></thead>
            <tbody>
              {listing.reviews.length === 0 ? (
                <tr><Td colSpan={3}>{t('none')}</Td></tr>
              ) : (
                listing.reviews.map((r, i) => (
                  <tr key={i}>
                    <Td><StatusBadge status={r.decision} /></Td>
                    <Td>{r.reviewerId}</Td>
                    <Td>{r.comment ?? '—'}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </div>
        }
        aside={
        <ListingActions
          listingId={listing.id}
          status={listing.status}
          canPublish={true}
          reviewerOptions={staff.reviewerOptions}
          caseAgentOptions={staff.caseAgentOptions}
        />
        }
      />
    </PageContainer>
  );
}

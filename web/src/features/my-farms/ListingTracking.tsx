'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { RequestDocumentsPanel } from './RequestDocumentsPanel';
import { editableListing, type ListingDraft } from './types';
export type ListingRequestHistory = {
  id: string;
  requestNumber: string;
  requestType: string;
  status: string;
  visibility: string;
  submittedAt: string | null;
  publishedAt: string | null;
  farm: { id: string; name: string; governorate: string | null } | null;
  statusHistory: { toStatus: string; reason: string | null; createdAt: string | null }[];
  reviews: { decision: string; comment: string | null; createdAt: string | null }[];
};
export function ListingTracking({
  request,
  listing,
}: {
  request: ListingRequestHistory;
  listing: ListingDraft | null;
}) {
  const t = useTranslations('workspace.wizard');
  const detail = useTranslations('workspace.requestDetail');
  const canEdit = Boolean(listing && editableListing(request.status) && editableListing(listing.status));
  return (
    <div className="flex flex-col gap-24" data-testid="listing-tracking">
      <Link
        href="/my/farms"
        className="inline-flex min-h-44 items-center gap-8 type-label-small-strong text-text-brand"
      >
        <Icon name="arrow-left" size={18} />
        {t('workspace')}
      </Link>
      <Card className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-20 tablet:flex tablet:flex-wrap">
        <span className="flex size-80 items-center justify-center rounded-image bg-bg-muted text-text-brand">
          <Icon name="tree" size={32} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="type-heading-h4 wrap-anywhere">{request.farm?.name ?? request.requestNumber}</h2>
          <p className="mt-8 type-body-caption text-text-muted">{request.requestNumber}</p>
          {request.farm?.governorate && (
            <p className="mt-8 type-body-caption text-text-muted">{request.farm.governorate}</p>
          )}
        </div>
        <div className="col-span-2">
          <PortalStatus status={request.status} />
        </div>
        {canEdit && request.farm && (
          <ButtonLink
            href={`/my/farms/${request.farm.id}/list?listingId=${request.id}${request.status === 'changesRequested' ? '&step=6' : ''}`}
            variant="outline"
            className="col-span-2 w-full tablet:w-auto"
          >
            {request.status === 'changesRequested' ? t('changes') : t('resume')}
          </ButtonLink>
        )}
      </Card>
      <div className="grid grid-cols-1 items-start gap-24 desktop:grid-cols-2">
        <div className="flex flex-col gap-24">
          <Card>
            <h3 className="mb-24 type-heading-h4">{t('reviewProgress')}</h3>
            {request.statusHistory.length ? (
              <ol className="flex flex-col">
                {request.statusHistory.map((event, index) => (
                  <li key={index} className="relative flex gap-16 pb-24 last:pb-0">
                    <span className="flex size-28 shrink-0 items-center justify-center rounded-full border border-brand-primary bg-bg-success-soft text-text-brand">
                      <Icon name="tick" size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <PortalStatus status={event.toStatus} />
                      {event.createdAt && (
                        <time dateTime={event.createdAt} className="mt-8 block type-label-caption text-text-muted">
                          {event.createdAt.slice(0, 10)}
                        </time>
                      )}
                      {event.reason && (
                        <p className="mt-8 type-body-caption wrap-anywhere text-text-muted">{event.reason}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="type-body-caption text-text-muted">{t('historyEmpty')}</p>
            )}
            {request.publishedAt && <p className="mt-16 type-body-caption text-text-brand">{detail('published')}</p>}
          </Card>
          {request.reviews.length > 0 && (
            <Card surface="muted" className="border-overlay-gold-hairline">
              <h3 className="type-label-large">{t('feedback')}</h3>
              <ul className="mt-16 flex flex-col gap-16">
                {request.reviews.map((review, index) => (
                  <li key={index}>
                    <PortalStatus status={review.decision} />
                    {review.comment && <p className="mt-12 type-body-default text-text-secondary">{review.comment}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <p className="rounded-card border border-overlay-gold-hairline bg-bg-notice p-24 type-body-caption">
            {t('private')}
          </p>
        </div>
        <RequestDocumentsPanel requestId={request.id} canEdit={canEdit} />
      </div>
    </div>
  );
}

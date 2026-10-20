'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Surface } from '@/components/ui/Surface';
import { OpenCommunicationCaseButton } from '@/features/my-messages/OpenCommunicationCaseButton';
import { Icon } from '@/components/icons/Icon';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { ButtonLink } from '@/components/ui/Button';

export type FarmDetailsRequest = {
  id: string;
  requestNumber: string;
  status: string;
  listing: { listingSlug: string; listingType: string; listingRequestId: string };
  message: string | null;
  reviews: { decision: string; comment: string | null; createdAt: string | null }[];
  submittedAt: string | null;
  createdAt: string | null;
};

export function FarmDetailsRequestDetail({ request }: { request: FarmDetailsRequest }) {
  const t = useTranslations('workspace.farmDetails');
  const v = useTranslations('workspace.visual');
  return (
    <div className="flex flex-col gap-16" data-testid="farm-details-request-detail">
      <h2 className="type-display-h4">{request.requestNumber}</h2>
      {request.submittedAt && (
        <Surface className="flex max-w-640 flex-col items-center gap-16 p-24 text-center tablet:p-40">
          <span className="flex size-80 items-center justify-center rounded-full bg-bg-success-soft text-text-brand">
            <Icon name="tick" size={36} />
          </span>
          <h3 className="type-heading-h3">{v('requestSent')}</h3>
          <p className="type-body-default text-text-muted">{t('mediationNote')}</p>
          <ButtonLink href="/my/requests" variant="primary" size="lg">
            {t('back')}
          </ButtonLink>
        </Surface>
      )}
      <Surface className="flex flex-col gap-8 p-24">
        <p>
          <span className="type-label-meta text-text-muted">{t('listing')}</span>{' '}
          <Link href={`/farms/${request.listing.listingSlug}`} className="text-text-brand">
            {request.listing.listingSlug}
          </Link>
        </p>
        <p>
          <span className="type-label-meta text-text-muted">{t('status')}</span>{' '}
          <PortalStatus status={request.status} />
        </p>
        {request.submittedAt && (
          <p className="type-body-caption text-text-muted">
            {t('submittedAt')}: {new Date(request.submittedAt).toLocaleString()}
          </p>
        )}
        <p className="type-body-caption text-text-muted">{t('mediationNote')}</p>
      </Surface>
      {request.reviews.length > 0 && (
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('reviews')}</h3>
          <ul className="mt-12 flex flex-col gap-8">
            {request.reviews.map((r, i) => (
              <li key={i} className="type-body-caption text-text-secondary">
                {r.decision}
                {r.comment ? ` — ${r.comment}` : ''}
              </li>
            ))}
          </ul>
        </Surface>
      )}
      <OpenCommunicationCaseButton requestId={request.id} />
    </div>
  );
}

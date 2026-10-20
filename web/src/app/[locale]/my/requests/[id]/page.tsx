import { ManagementRequestDetail, type ManagementRequest } from '@/features/my-management/ManagementRequestDetail';
import {
  VerificationRequestDetail,
  type VerificationRequest,
} from '@/features/my-professional/VerificationRequestDetail';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Surface } from '@/components/ui/Surface';
import { ListingTracking } from '@/features/my-farms/ListingTracking';
import type { ListingDraft } from '@/features/my-farms/types';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';

export const instant = false;

type RequestDetail = {
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

export default async function MyRequestDetailPage({ params }: PageProps<'/[locale]/my/requests/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.requestDetail');
  const session = await requireCompletedProfile(locale, `/${locale}/my/requests/${id}`);
  let req: RequestDetail;
  try {
    req = await apiFetchWebsite<RequestDetail>(`/requests/${id}`, session.accessToken);
  } catch {
    notFound();
  }

  if (req.requestType === 'farmListing') {
    const listing = await apiFetchWebsite<ListingDraft>(`/listing-requests/${id}`, session.accessToken).catch(
      () => null,
    );
    return <ListingTracking request={req} listing={listing} />;
  }
  if (req.requestType === 'farmManagement') {
    const detail = await apiFetchWebsite<ManagementRequest>(
      `/farm-management-requests/${id}`,
      session.accessToken,
    ).catch(() => null);
    if (detail) return <ManagementRequestDetail initial={detail} history={req.statusHistory} />;
  }
  if (req.requestType === 'professionalVerification') {
    const detail = await apiFetchWebsite<VerificationRequest>(
      `/professional-verification-requests/${id}`,
      session.accessToken,
    ).catch(() => null);
    if (detail) return <VerificationRequestDetail initial={detail} history={req.statusHistory} />;
  }
  return (
    <div className="flex flex-col gap-16">
      <Link href="/my/requests" className="type-label-button text-text-brand">
        {t('back')}
      </Link>
      <h2 className="type-display-h4">{req.requestNumber}</h2>
      <Surface className="flex flex-col gap-12 p-24">
        <p>
          <span className="type-label-meta text-text-muted">{t('type')}</span> {req.requestType}
        </p>
        <p>
          <span className="type-label-meta text-text-muted">{t('status')}</span> {req.status}
        </p>
        {req.farm && (
          <p>
            <span className="type-label-meta text-text-muted">{t('farm')}</span> {req.farm.name}
          </p>
        )}
        {req.publishedAt && <p className="type-body-caption text-text-brand">{t('published')}</p>}
      </Surface>
      {req.reviews.length > 0 && (
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('reviews')}</h3>
          <ul className="mt-12 flex flex-col gap-8">
            {req.reviews.map((r, i) => (
              <li key={i} className="type-body-caption text-text-secondary">
                {r.decision}: {r.comment ?? '—'}
              </li>
            ))}
          </ul>
        </Surface>
      )}
      {req.statusHistory.length > 0 && (
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('history')}</h3>
          <ul className="mt-12 flex flex-col gap-8">
            {req.statusHistory.map((h, i) => (
              <li key={i} className="type-body-caption text-text-muted">
                {h.toStatus} {h.reason ? `— ${h.reason}` : ''}
              </li>
            ))}
          </ul>
        </Surface>
      )}
    </div>
  );
}

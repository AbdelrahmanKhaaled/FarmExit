import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { PortalHeading, PortalEmpty, PortalRow } from '@/features/my-farmexit/PortalUI';

type RequestItem = { id: string; requestNumber: string; requestType: string; status: string };

function specializedHref(req: RequestItem): string {
  if (req.requestType === 'farmManagement' || req.requestType === 'farm_management') {
    return `/my/management/${req.id}`;
  }
  if (req.requestType === 'professionalVerification' || req.requestType === 'professional_verification') {
    return `/my/professional/verification/${req.id}`;
  }
  if (req.requestType === 'partnership') {
    return `/my/partnerships/${req.id}`;
  }
  if (req.requestType === 'partnershipApplication' || req.requestType === 'partnership_application') {
    return `/my/applications/${req.id}`;
  }
  if (req.requestType === 'farmPurchaseProposal' || req.requestType === 'farm_purchase_proposal') {
    return `/my/proposals/${req.id}`;
  }
  if (req.requestType === 'farmDetails' || req.requestType === 'farm_details') {
    return `/my/farm-details-requests/${req.id}`;
  }
  return `/my/requests/${req.id}`;
}

export default async function MyRequestsPage({ params }: PageProps<'/[locale]/my/requests'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace');
  const tv = await getTranslations('workspace.visual');
  const session = await requireCompletedProfile(locale, `/${locale}/my/requests`);
  const data = await apiFetchWebsite<{ items: RequestItem[] }>('/requests?page=1&pageSize=50', session.accessToken);

  return (
    <div className="flex flex-col gap-16">
      <PortalHeading title={t('requests.title')} description={tv('requestsIntro')} />
      {data.items.length === 0 ? (
        <PortalEmpty
          icon="clipboard-tick"
          title={tv('emptyRequests')}
          body={t('requests.empty')}
          href="/farms"
          action={tv('browse')}
        />
      ) : (
        <ul className="flex flex-col gap-12">
          {data.items.map((req) => (
            <li key={req.id}>
              <PortalRow
                icon="clipboard-tick"
                title={req.requestNumber}
                meta={req.requestType}
                status={req.status}
                href={specializedHref(req)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

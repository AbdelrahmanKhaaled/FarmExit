import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import {
  FarmDetailsRequestDetail,
  type FarmDetailsRequest,
} from '@/features/my-farm-details/FarmDetailsRequestDetail';

export const instant = false;

export default async function FarmDetailsRequestPage({
  params,
}: PageProps<'/[locale]/my/farm-details-requests/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.farmDetails');
  const session = await requireCompletedProfile(locale, `/${locale}/my/farm-details-requests/${id}`);
  let request: FarmDetailsRequest;
  try {
    request = await apiFetchWebsite<FarmDetailsRequest>(`/farm-details-requests/${id}`, session.accessToken);
  } catch {
    notFound();
  }
  return (
    <div className="flex flex-col gap-16">
      <Link href="/my/requests" className="type-label-button text-text-brand">{t('back')}</Link>
      <FarmDetailsRequestDetail request={request} />
    </div>
  );
}

import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { PartnershipRequestDetail, type PartnershipRequest } from '@/features/my-partnerships/PartnershipRequestDetail';

export const instant = false;

export default async function PartnershipDetailPage({ params }: PageProps<'/[locale]/my/partnerships/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/partnerships/${id}`);
  let req: PartnershipRequest;
  try {
    req = await apiFetchWebsite<PartnershipRequest>(`/partnership-requests/${id}`, session.accessToken);
  } catch {
    notFound();
  }
  return (
    <>
      <PartnershipRequestDetail initial={req} />
    </>
  );
}

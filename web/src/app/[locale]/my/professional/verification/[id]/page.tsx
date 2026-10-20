import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import {
  VerificationRequestDetail,
  type VerificationRequest,
} from '@/features/my-professional/VerificationRequestDetail';

export const instant = false;

export default async function VerificationDetailPage({
  params,
}: PageProps<'/[locale]/my/professional/verification/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/professional/verification/${id}`);
  let req: VerificationRequest;
  try {
    req = await apiFetchWebsite<VerificationRequest>(`/professional-verification-requests/${id}`, session.accessToken);
  } catch {
    notFound();
  }

  const tracking = await apiFetchWebsite<{
    statusHistory: { toStatus: string; reason: string | null; createdAt: string | null }[];
  }>(`/requests/${id}`, session.accessToken).catch(() => null);
  return <VerificationRequestDetail initial={req} history={tracking?.statusHistory} />;
}

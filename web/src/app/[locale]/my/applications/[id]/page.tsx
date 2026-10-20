import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { PartnershipApplicationDetail, type PartnershipApplication } from '@/features/my-applications/PartnershipApplicationDetail';

export const instant = false;

export default async function ApplicationDetailPage({ params }: PageProps<'/[locale]/my/applications/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/applications/${id}`);
  let app: PartnershipApplication;
  try {
    app = await apiFetchWebsite<PartnershipApplication>(`/partnership-applications/${id}`, session.accessToken);
  } catch {
    notFound();
  }
  return <PartnershipApplicationDetail initial={app} />;
}

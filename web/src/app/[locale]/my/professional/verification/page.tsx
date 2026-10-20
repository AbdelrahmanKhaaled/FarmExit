import { RequestList } from '@/features/phase7/RequestList';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';

export const instant = false;

type Item = { id: string; requestNumber: string; professionalType: string; status: string };

export default async function VerificationListPage({ params }: PageProps<'/[locale]/my/professional/verification'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/professional/verification`);
  const data = await apiFetchWebsite<{ items: Item[] }>(
    '/professional-verification-requests?page=1&pageSize=50',
    session.accessToken,
  );

  return <RequestList items={data.items} professional />;
}

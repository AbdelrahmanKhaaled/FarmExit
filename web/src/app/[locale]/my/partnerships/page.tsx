import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';

import { PartnershipList } from '@/features/phase8/PartnershipList';
export const instant = false;

type Item = { id: string; requestNumber: string; farmName: string; status: string };

export default async function MyPartnershipsPage({ params }: PageProps<'/[locale]/my/partnerships'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/partnerships`);
  const data = await apiFetchWebsite<{ items: Item[] }>(
    '/partnership-requests?page=1&pageSize=50',
    session.accessToken,
  );

  return <PartnershipList items={data.items} />;
}

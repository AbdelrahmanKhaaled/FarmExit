import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { UnifiedApplicationsWorkspace } from '@/features/my-farmexit/UnifiedApplicationsWorkspace';

export const instant = false;

type Item = { id: string; requestNumber: string; parentPartnershipRequestId: string; status: string };

export default async function MyApplicationsPage({ params }: PageProps<'/[locale]/my/applications'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/applications`);
  const data = await apiFetchWebsite<{ items: Item[] }>(
    '/partnership-applications?page=1&pageSize=50',
    session.accessToken,
  );

  return <UnifiedApplicationsWorkspace items={data.items} />;
}

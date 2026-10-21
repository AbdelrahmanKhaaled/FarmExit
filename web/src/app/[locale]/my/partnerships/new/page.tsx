import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { NewPartnershipRequestForm } from '@/features/my-partnerships/NewPartnershipRequestForm';

export const instant = false;

export default async function NewPartnershipPage({ params, searchParams }: PageProps<'/[locale]/my/partnerships/new'>) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/partnerships/new`);
  const data = await apiFetchWebsite<{ items: { id: string; name: string; myRoles: string[] }[] }>(
    '/farms/mine?page=1&pageSize=50',
    session.accessToken,
  );
  const farms = data.items.filter((f) => f.myRoles.includes('owner')).map((f) => ({ id: f.id, name: f.name }));
  const farmId = typeof sp.farmId === 'string' ? sp.farmId : undefined;

  return (
    <>
      <NewPartnershipRequestForm farms={farms} initialFarmId={farmId} />
    </>
  );
}

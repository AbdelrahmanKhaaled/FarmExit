import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { OverviewContent, type OverviewData } from '@/features/my-farmexit/OverviewContent';

export default async function MyOverviewPage({ params }: PageProps<'/[locale]/my'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, '/' + locale + '/my');
  const [farms, requests, saved, professional] = await Promise.all([
    apiFetchWebsite<{ items: OverviewData['farms']; total: number }>(
      '/farms/mine?page=1&pageSize=3',
      session.accessToken,
    ).catch(() => null),
    apiFetchWebsite<{ items: OverviewData['requests']; total: number }>(
      '/requests?page=1&pageSize=3',
      session.accessToken,
    ).catch(() => null),
    apiFetchWebsite<{ items: OverviewData['saved'] }>('/marketplace/saved', session.accessToken).catch(() => null),
    apiFetchWebsite<{ capabilities: OverviewData['capabilities'] }>('/professional-profile', session.accessToken).catch(
      () => null,
    ),
  ]);
  return (
    <OverviewContent
      data={{
        name: session.user.fullName ?? '',
        counts: { farms: farms?.total ?? null, requests: requests?.total ?? null, saved: saved?.items.length ?? null },
        farms: farms?.items ?? [],
        requests: requests?.items ?? [],
        saved: saved?.items ?? [],
        capabilities: professional?.capabilities ?? [],
      }}
    />
  );
}

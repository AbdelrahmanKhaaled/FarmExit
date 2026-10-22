import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { OverviewContent, type OverviewData } from '@/features/my-farmexit/OverviewContent';
import { OverviewAttention } from '@/features/my-farmexit/OverviewAttention';
import { shouldExcludeFromMyRequests, type UnifiedRequestItem } from '@/features/my-farmexit/unified-requests';

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
    apiFetchWebsite<{ items: UnifiedRequestItem[]; total: number }>(
      '/requests?page=1&pageSize=20',
      session.accessToken,
    ).catch(() => null),
    apiFetchWebsite<{ items: OverviewData['saved'] }>('/marketplace/saved', session.accessToken).catch(() => null),
    apiFetchWebsite<{ capabilities: OverviewData['capabilities'] }>('/professional-profile', session.accessToken).catch(
      () => null,
    ),
  ]);
  const requestItems = (requests?.items ?? []).filter((item) => !shouldExcludeFromMyRequests(item.requestType));

  return (
    <div className="flex flex-col gap-32">
      <OverviewAttention items={requestItems} />
      <OverviewContent
        data={{
          name: session.user.fullName ?? '',
          counts: { farms: farms?.total ?? null, requests: requests?.total ?? null, saved: saved?.items.length ?? null },
          farms: farms?.items ?? [],
          requests: requestItems.slice(0, 3),
          saved: saved?.items ?? [],
          capabilities: professional?.capabilities ?? [],
        }}
      />
    </div>
  );
}

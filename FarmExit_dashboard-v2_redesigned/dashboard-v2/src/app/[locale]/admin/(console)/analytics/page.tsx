import { Suspense } from 'react';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/components/ui';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { AnalyticsDateFilters } from '@/features/admin/analytics/AnalyticsDateFilters';
import { AnalyticsWorkspace } from '@/features/admin/analytics/AnalyticsWorkspace';
import { buildAnalyticsQueryString, type AnalyticsRangePreset } from '@/features/admin/analytics/analytics-query';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { AdminAnalyticsReport } from '@/lib/api/types/admin-ops';
import { routing } from '@/i18n/routing';
async function AnalyticsContent({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/analytics'> & { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'analytics'),
    sp = await searchParams,
    t = await getTranslations('admin.analytics'),
    b = await getTranslations('batch');
  const range = (
    ['7d', '30d', '90d', '12m', 'all'].includes(sp.range ?? '') ? sp.range : '30d'
  ) as AnalyticsRangePreset;
  const qs = buildAnalyticsQueryString({ range, from: sp.from, to: sp.to });
  const res = await apiFetchAdminResult<AdminAnalyticsReport>('/staff/admin/analytics?' + qs, session.accessToken);
  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={
          res.ok ? t('periodNote', { from: res.data.from.slice(0, 10), to: res.data.to.slice(0, 10) }) : t('desc')
        }
        refreshLabel={t('refresh')}
      />
      <AnalyticsDateFilters activeRange={range} customFrom={sp.from} customTo={sp.to} />
      {res.ok ? (
        <AnalyticsWorkspace data={res.data} />
      ) : (
        <EmptyState title={b('loadError')} description={res.status === 400 ? b('invalidRange') : b('retry')} />
      )}
      <p className="mt-6 text-xs text-[var(--admin-text-muted)]">{t('listingPublicationNote')}</p>
    </PageContainer>
  );
}
export default function AnalyticsPage(props: Parameters<typeof AnalyticsContent>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <AnalyticsContent {...props} />
    </Suspense>
  );
}

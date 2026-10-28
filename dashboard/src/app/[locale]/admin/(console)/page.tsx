import { Suspense } from 'react';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminOverview } from '@/features/admin/AdminOverview';
import { ErrorState, PageContainer } from '@/components/ui';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { getStaffHomePath } from '@/lib/admin/console-routes';
import { staffIsAdminScope } from '@/lib/admin/staff-permissions';
import { redirect } from '@/i18n/navigation';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';
import type { StaffRequestList } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

async function AdminOverviewPageContent({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'overview');
  if (!staffIsAdminScope(session.staff.roles)) {
    redirect({ href: getStaffHomePath(session.staff), locale });
    throw new Error('REDIRECT');
  }
  const t = await getTranslations('admin.overview');

  let overview: AdminDashboardOverview | null = null;
  let queue: AdminWorkQueue | null = null;
  let recentRequests: StaffRequestList | null = null;
  let error = false;
  try {
    const qs = new URLSearchParams({ page: '1', pageSize: '8' });
    [overview, queue, recentRequests] = await Promise.all([
      apiFetchAdmin<AdminDashboardOverview>('/staff/admin/dashboard/overview', session.accessToken),
      apiFetchAdmin<AdminWorkQueue>('/staff/admin/work-queue', session.accessToken),
      apiFetchAdmin<StaffRequestList>(`/staff/requests?${qs}`, session.accessToken),
    ]);
  } catch {
    error = true;
  }

  if (error || !overview || !queue) {
    return (
      <PageContainer>
        <ErrorState message={t('loadError')} retryLabel={t('retry')} />
      </PageContainer>
    );
  }

  return (
    <AdminOverview
      displayName={session.staff.fullName}
      overview={overview}
      queue={queue}
      recentRequests={recentRequests}
    />
  );
}

export default function AdminOverviewPage(props: Parameters<typeof AdminOverviewPageContent>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <AdminOverviewPageContent {...props} />
    </Suspense>
  );
}
